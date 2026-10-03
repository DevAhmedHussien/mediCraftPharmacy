import "server-only";

import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";

/* ===========================================================================
   Blog — queries and mutations.

   The body is Markdown and is stored as written. It is NOT rendered to HTML
   here and never reaches `dangerouslySetInnerHTML` unsanitised: an admin
   account is a trusted author, not a trusted source of script tags, and the
   same account is the one an attacker would target precisely because its
   output is published. Rendering happens at read time through a sanitising
   pipeline — see the note in the public blog route.
   ========================================================================= */

export const postSchema = z.object({
  title: z.string().trim().min(3, "A title is required.").max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.")
    .max(200),
  excerpt: z.string().trim().max(320, "Keep the excerpt under 320 characters.").optional().or(z.literal("")),
  body: z.string().trim().min(20, "The post needs a body."),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]),
  publishedAt: z.string().trim().optional().or(z.literal("")),
  coverMediaId: z.string().trim().optional().or(z.literal("")),
  seoTitle: z.string().trim().max(70, "Search results truncate past ~60 characters.").optional().or(z.literal("")),
  seoDescription: z
    .string()
    .trim()
    .max(170, "Search results truncate past ~155 characters.")
    .optional()
    .or(z.literal("")),
  categoryIds: z.array(z.string()).default([]),
});

export type PostInput = z.infer<typeof postSchema>;

const nullIfBlank = (v: string | undefined) => (v && v.length > 0 ? v : null);

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/** ~220 wpm is the usual reading-speed constant; never round down to zero. */
export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 220));
}

/**
 * Resolve the publish timestamp from the status.
 *
 * A post moved to PUBLISHED with no date gets "now". A SCHEDULED post must
 * carry a future date or it is not scheduled, it is just published late.
 */
function resolvePublishedAt(input: PostInput, existing?: Date | null): Date | null {
  if (input.status === "DRAFT" || input.status === "ARCHIVED") return existing ?? null;
  if (input.publishedAt) return new Date(input.publishedAt);
  return existing ?? new Date();
}

export type PostListParams = {
  q?: string;
  status?: "all" | "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  limit?: number;
  cursor?: string;
};

export async function listPosts({ q, status = "all", limit = 30, cursor }: PostListParams) {
  const where: Prisma.PostWhereInput = {
    ...(status !== "all" ? { status } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q } }] } : {}),
  };

  const rows = await db.post.findMany({
    where,
    // Drafts have no publishedAt, so ordering by it alone would bury them
    // below every published post. updatedAt is what "what was I working on"
    // actually means.
    orderBy: { updatedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      readingMinutes: true,
      viewCount: true,
      categories: { select: { category: { select: { name: true, slug: true } } } },
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
}

export async function getPost(id: string) {
  return db.post.findUnique({
    where: { id },
    include: { categories: { select: { categoryId: true } } },
  });
}

export async function listAllCategories() {
  return db.category.findMany({ orderBy: { name: "asc" } });
}

export async function createPost(input: PostInput, authorId: string) {
  return db.post.create({
    data: {
      slug: input.slug,
      title: input.title,
      excerpt: nullIfBlank(input.excerpt),
      body: input.body,
      status: input.status,
      publishedAt: resolvePublishedAt(input),
      coverMediaId: nullIfBlank(input.coverMediaId),
      seoTitle: nullIfBlank(input.seoTitle),
      seoDescription: nullIfBlank(input.seoDescription),
      readingMinutes: readingMinutes(input.body),
      authorId,
      categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
    },
  });
}

export async function updatePost(id: string, input: PostInput, editorId: string) {
  const existing = await db.post.findUnique({
    where: { id },
    select: { title: true, body: true, status: true, publishedAt: true },
  });
  if (!existing) throw new Error("Post not found.");

  // One transaction: the revision, the post and its categories move together
  // or not at all. Without it a failed category write leaves a revision
  // claiming to snapshot a change that was rolled back.
  return db.$transaction(async (tx) => {
    // Snapshot only when the text actually changed, and only for posts that
    // have been published — nobody needs forty revisions of a draft they are
    // still typing.
    const textChanged = existing.title !== input.title || existing.body !== input.body;
    if (textChanged && existing.status === "PUBLISHED") {
      await tx.postRevision.create({
        data: { postId: id, title: existing.title, body: existing.body, createdById: editorId },
      });
    }

    await tx.postCategory.deleteMany({ where: { postId: id } });

    return tx.post.update({
      where: { id },
      data: {
        slug: input.slug,
        title: input.title,
        excerpt: nullIfBlank(input.excerpt),
        body: input.body,
        status: input.status,
        publishedAt: resolvePublishedAt(input, existing.publishedAt),
        coverMediaId: nullIfBlank(input.coverMediaId),
        seoTitle: nullIfBlank(input.seoTitle),
        seoDescription: nullIfBlank(input.seoDescription),
        readingMinutes: readingMinutes(input.body),
        categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
      },
    });
  });
}

/**
 * Archive rather than delete.
 *
 * A published URL that starts 404ing costs the search ranking it earned and
 * breaks every inbound link. ARCHIVED drops it from the index and the list
 * while leaving the row — and therefore the option to restore it — in place.
 * A real delete is a separate, deliberate action.
 */
export async function archivePost(id: string) {
  return db.post.update({ where: { id }, data: { status: "ARCHIVED" } });
}

export async function deletePost(id: string) {
  return db.post.delete({ where: { id } });
}
