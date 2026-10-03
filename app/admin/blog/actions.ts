"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/forms";
import { requireAdmin } from "@/lib/guard";
import { recordAudit } from "@/lib/services/audit";
import { archivePost, createPost, postSchema, slugifyTitle, updatePost } from "@/lib/services/posts";

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
