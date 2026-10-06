import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminSearch } from "@/components/admin/AdminSearch";
import { PostsTable } from "@/components/admin/PostsTable";
import { EmptyState, PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/guard";
import { listPosts } from "@/lib/services/posts";

export const metadata = { title: "Articles" };

const STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: { status?: string; saved?: string };
}) {
  await requireAdminPage();

  const status = STATUSES.find((s) => s === searchParams.status) ?? "all";
  const { items } = await listPosts({ status });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Articles"
        description="Drafts are never publicly reachable, and a scheduled post goes live on its own timestamp without anyone flipping a switch."
        actions={
          <Link href="/admin/blog/new" className="admin-btn admin-btn-primary">
            <Plus className="size-3.5" strokeWidth={2.4} aria-hidden />
            New article
          </Link>
        }
      />

      {searchParams.saved && (
        <p
          role="status"
          className="admin-panel px-4 py-2.5 text-[0.8125rem]"
          style={{ borderColor: "#bcd9c6", background: "var(--status-success-bg)", color: "var(--status-success-fg)" }}
        >
          Article saved.
        </p>
      )}

      <Panel
        title={`${items.length} article${items.length === 1 ? "" : "s"}`}
        bodyClassName="p-3"
        actions={
          <AdminSearch
            basePath="/admin/blog"
            filters={[
              {
                name: "status",
                value: searchParams.status,
                options: [
                  { value: "", label: "All statuses" },
                  ...STATUSES.map((s) => ({ value: s, label: s[0] + s.slice(1).toLowerCase() })),
                ],
              },
            ]}
          />
        }
      >
        {items.length === 0 ? (
          <EmptyState
            title="No articles yet"
            description="Long-form writing is how a compounding pharmacy demonstrates expertise to prescribers who are deciding whether to send a script."
            action={{ label: "Write the first one", href: "/admin/blog/new" }}
          />
        ) : (
          <PostsTable
            rows={items.map((post) => ({
              id: post.id,
              slug: post.slug,
              title: post.title,
              status: post.status,
              // Serialised for the client boundary; the table only formats.
              publishedAt: post.publishedAt?.toISOString() ?? null,
              updatedAt: post.updatedAt.toISOString(),
              readingMinutes: post.readingMinutes,
              categories: post.categories.map((c) => c.category.name),
            }))}
          />
        )}
      </Panel>
    </div>
  );
}
