"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { Category, PostStatus } from "@prisma/client";

import { savePost } from "@/app/admin/blog/actions";
import { AdminAlert } from "@/components/admin/AdminAlert";
import { AdminField, AdminSubmit, AdminTextArea } from "@/components/admin/form";
import { Panel } from "@/components/admin/ui";
import { initialFormState } from "@/lib/forms";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: PostStatus;
  publishedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  categories: { categoryId: string }[];
};

const STATUSES: { value: PostStatus; label: string; hint: string }[] = [
  { value: "DRAFT", label: "Draft", hint: "Only visible here." },
  { value: "SCHEDULED", label: "Scheduled", hint: "Goes live on the date below." },
  { value: "PUBLISHED", label: "Published", hint: "Live on the site now." },
  { value: "ARCHIVED", label: "Archived", hint: "Off the blog, row kept." },
];

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` and nothing else. */
function toLocalInput(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function PostForm({ post, categories }: { post?: Post; categories: Category[] }) {
  const action = savePost.bind(null, post?.id ?? null);
  const [state, formAction] = useFormState(action, initialFormState);

  // The only client state: the date field is irrelevant unless the post is
  // scheduled, and showing it always invites someone to set a date on a draft
  // and wonder why nothing happened.
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "DRAFT");

  const selected = new Set(post?.categories.map((c) => c.categoryId) ?? []);

  return (
    <form action={formAction} className="space-y-4">
      {state.message && <AdminAlert ok={state.ok}>{state.message}</AdminAlert>}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Panel title="Article">
            <div className="space-y-4">
              <AdminField
                name="title"
                label="Title"
                defaultValue={post?.title}
                error={state.errors?.title}
              />
              <AdminField
                name="slug"
                label="URL slug"
                optional
                defaultValue={post?.slug}
                placeholder="Generated from the title when blank"
                hint={post ? `Live at /blog/${post.slug} — changing it breaks existing links.` : undefined}
                error={state.errors?.slug}
              />
              <AdminTextArea
                name="excerpt"
                label="Excerpt"
                rows={2}
                optional
                defaultValue={post?.excerpt ?? ""}
                hint="Shown on the blog index and used as the meta description fallback."
                error={state.errors?.excerpt}
              />
            </div>
          </Panel>

          <Panel title="Body" description="Markdown. Rendered and sanitised server-side.">
            <AdminTextArea
              name="body"
              label="Post body"
              rows={26}
              mono
              defaultValue={post?.body}
              error={state.errors?.body}
            />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Publishing">
            <fieldset>
              <legend className="admin-label mb-2">Status</legend>
              <div className="space-y-1.5">
                {STATUSES.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-2.5 rounded-2xl border p-2.5 transition-colors has-[:checked]:border-[color:var(--admin-accent)] has-[:checked]:bg-[theme(colors.info.bg)]"
                    style={{ borderColor: "var(--admin-border)" }}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={option.value}
                      defaultChecked={(post?.status ?? "DRAFT") === option.value}
                      onChange={() => setStatus(option.value)}
                      className="mt-0.5 size-3.5 text-[color:var(--admin-accent)] focus:ring-[color:var(--admin-accent)]"
                    />
                    <span>
                      <span className="block text-[0.8125rem] font-medium">{option.label}</span>
                      <span className="mt-0.5 block text-[0.75rem] text-[color:var(--admin-ink-50)]">
                        {option.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {(status === "SCHEDULED" || status === "PUBLISHED") && (
              <div className="mt-4">
                <AdminField
                  name="publishedAt"
                  label={status === "SCHEDULED" ? "Publish at" : "Published at"}
                  type="datetime-local"
                  optional
                  defaultValue={toLocalInput(post?.publishedAt ?? null)}
                  hint={status === "PUBLISHED" ? "Leave blank to use now." : undefined}
                  error={state.errors?.publishedAt}
                />
              </div>
            )}

            {categories.length > 0 && (
              <fieldset className="mt-4">
                <legend className="admin-label mb-2">Categories</legend>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="cursor-pointer rounded-full border px-3.5 py-2 text-[0.78125rem] font-medium transition-colors has-[:checked]:border-[color:var(--admin-ink)] has-[:checked]:bg-[color:var(--admin-ink)] has-[:checked]:text-white"
                      style={{ borderColor: "var(--admin-border-strong)" }}
                    >
                      <input
                        type="checkbox"
                        name="categoryIds"
                        value={category.id}
                        defaultChecked={selected.has(category.id)}
                        className="sr-only"
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </Panel>

          <Panel title="Search appearance">
            <div className="space-y-4">
              <AdminField
                name="seoTitle"
                label="SEO title"
                optional
                defaultValue={post?.seoTitle ?? ""}
                hint="Falls back to the title. Truncated past ~60 characters."
                error={state.errors?.seoTitle}
              />
              <AdminTextArea
                name="seoDescription"
                label="Meta description"
                rows={3}
                optional
                defaultValue={post?.seoDescription ?? ""}
                hint="Falls back to the excerpt. Truncated past ~155 characters."
                error={state.errors?.seoDescription}
              />
            </div>
          </Panel>

          <AdminSubmit>{post ? "Save article" : "Create article"}</AdminSubmit>
        </div>
      </div>
    </form>
  );
}
