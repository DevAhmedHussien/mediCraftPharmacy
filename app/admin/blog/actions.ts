"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { requireAdmin } from "@/lib/guard";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/services/audit";
import {
  archivePost,
  createPost,
  postSchema,
  setCoverAlt,
  slugifyTitle,
  updatePost,
} from "@/lib/services/posts";
import { StorageError, assertUploadAllowed, buildKey, storage } from "@/lib/services/storage";

/* Blog mutations.

   Authoring is gated on being staff rather than on a granular permission:
   the permission list in the brief covers the partner pipeline and has no
   `content.*` entry. Adding one is a small change if the blog should be
   restricted further — flagged in the handover rather than invented here. */

function fieldErrors(error: unknown): FormState {
  if (error && typeof error === "object" && "issues" in error) {
    const errors: Record<string, string> = {};
    for (const issue of (error as { issues: { path: (string | number)[]; message: string }[] }).issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { ok: false, errors, message: "Some fields need attention." };
  }
  throw error;
}

export async function savePost(
  id: string | null,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const session = await requireAdmin();

  const raw = {
    title: String(data.get("title") ?? ""),
    slug: String(data.get("slug") ?? "") || slugifyTitle(String(data.get("title") ?? "")),
    excerpt: String(data.get("excerpt") ?? ""),
    body: String(data.get("body") ?? ""),
    status: String(data.get("status") ?? "DRAFT"),
    publishedAt: String(data.get("publishedAt") ?? ""),
    coverMediaId: String(data.get("coverMediaId") ?? ""),
    seoTitle: String(data.get("seoTitle") ?? ""),
    seoDescription: String(data.get("seoDescription") ?? ""),
    // Checkbox groups arrive as repeated keys.
    categoryIds: data.getAll("categoryIds").map(String).filter(Boolean),
  };

  let parsed;
  try {
    parsed = postSchema.parse(raw);
  } catch (error) {
    return fieldErrors(error);
  }

  if (parsed.status === "SCHEDULED" && (!parsed.publishedAt || new Date(parsed.publishedAt) <= new Date())) {
    return {
      ok: false,
      errors: { publishedAt: "A scheduled post needs a date in the future." },
    };
  }

  let post;
  try {
    post = id
      ? await updatePost(id, parsed, session.user.id)
      : await createPost(parsed, session.user.id);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { ok: false, errors: { slug: "Another post already uses this URL slug." } };
    }
    throw error;
  }

  if (parsed.coverMediaId) {
    await setCoverAlt(parsed.coverMediaId, String(data.get("coverAlt") ?? ""));
  }

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: id ? "post.update" : "post.create",
    entityType: "Post",
    entityId: post.id,
    metadata: { title: parsed.title, status: parsed.status },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${parsed.slug}`);

  redirect("/admin/blog?saved=1");
}

export async function archive(id: string): Promise<void> {
  const session = await requireAdmin();
  const post = await archivePost(id);

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "post.archive",
    entityType: "Post",
    entityId: id,
    metadata: { title: post.title },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}

/* --- Cover image ----------------------------------------------------------

   Same three steps as the partner document uploader: the server grants a
   short-lived upload URL, the browser PUTs the bytes straight to storage, and
   the server records the Media row. The file never passes through this
   process. Covers live under `blog/`, the one prefix the uploads route
   serves publicly. */

const COVER_PREFIX = "blog/covers";

export type CoverGrant =
  | { ok: true; url: string; headers: Record<string, string>; key: string }
  | { ok: false; message: string };

export async function requestCoverUpload(input: {
  filename: string;
  mime: string;
  size: number;
}): Promise<CoverGrant> {
  const session = await requireAdmin();

  const limit = rateLimit(`cover-upload:${session.user.id}`, RATE_LIMITS.upload);
  if (!limit.ok) return { ok: false, message: "Too many uploads at once. Please wait a few minutes." };

  try {
    assertUploadAllowed(input.mime, input.size, "image");
  } catch (error) {
    if (error instanceof StorageError) return { ok: false, message: error.message };
    throw error;
  }

  const key = buildKey(COVER_PREFIX, input.filename);
  const presigned = await storage.presignUpload(key, input.mime, input.size);
  return { ok: true, url: presigned.url, headers: presigned.headers, key: presigned.key };
}

export async function confirmCoverUpload(input: {
  key: string;
  filename: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
}): Promise<{ ok: true; id: string; key: string } | { ok: false; message: string }> {
  const session = await requireAdmin();

  // The key went out to the browser and came back, so it is client input now.
  if (!input.key.startsWith(`${COVER_PREFIX}/`) || input.key.includes("..")) {
    return { ok: false, message: "That upload is not a blog cover." };
  }
  try {
    assertUploadAllowed(input.mime, input.size, "image");
  } catch (error) {
    if (error instanceof StorageError) return { ok: false, message: error.message };
    throw error;
  }

  const dimension = (n?: number) => (Number.isInteger(n) && n! > 0 && n! < 20000 ? n : null);
  const media = await db.media.create({
    data: {
      driver: storage.name,
      key: input.key,
      bucket: storage.name === "S3" ? process.env.S3_BUCKET ?? null : null,
      filename: input.filename.slice(0, 255),
      mime: input.mime,
      size: input.size,
      width: dimension(input.width),
      height: dimension(input.height),
      uploadedById: session.user.id,
    },
    select: { id: true, key: true },
  });

  return { ok: true, id: media.id, key: media.key };
}
