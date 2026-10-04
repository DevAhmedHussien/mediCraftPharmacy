"use client";

import Link from "next/link";
import { Archive, ExternalLink, Pencil } from "lucide-react";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { PostStatus } from "@prisma/client";

import { SortableTable } from "@/components/admin/SortableTable";
import { archive } from "@/app/admin/blog/actions";
import { Pill, relativeDays, type Tone, RowAction, RowActions } from "@/components/admin/ui";

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  publishedAt: string | null;
  updatedAt: string;
  readingMinutes: number;
  categories: string[];
};

const TONE: Record<PostStatus, Tone> = {
  PUBLISHED: "good",
  SCHEDULED: "info",
  DRAFT: "warn",
  ARCHIVED: "neutral",
};

export function PostsTable({ rows }: { rows: PostRow[] }) {
  const columns = useMemo<ColumnDef<PostRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <>
            <Link href={`/admin/blog/${row.original.id}`} className="font-medium transition-colors hover:text-[color:var(--admin-accent)]">
              {row.original.title}
            </Link>
            <p className="admin-id mt-0.5 text-[color:var(--admin-ink-50)]">
              /{row.original.slug} · {row.original.readingMinutes} min read
            </p>
          </>
        ),
      },
      {
        id: "categories",
        header: "Categories",
        accessorFn: (r) => r.categories.join(", "),
        cell: ({ getValue }) => (
          <span className="text-[color:var(--admin-ink-70)]">{String(getValue()) || "—"}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue() as PostStatus;
          return <Pill tone={TONE[status]}>{status[0] + status.slice(1).toLowerCase()}</Pill>;
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        meta: { align: "right" },
        cell: ({ getValue }) => (
          <span className="text-[color:var(--admin-ink-70)]">{relativeDays(String(getValue()))}</span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <RowActions>
            {row.original.status === "PUBLISHED" && (
              <RowAction
                icon={ExternalLink}
                href={`/blog/${row.original.slug}`}
                label={`View “${row.original.title}” on the site`}
              />
            )}
            {row.original.status !== "ARCHIVED" && (
              <form action={archive.bind(null, row.original.id)}>
                <RowAction
                  type="submit"
                  icon={Archive}
                  tone="danger"
                  label={`Archive “${row.original.title}”`}
                />
              </form>
            )}
            <RowAction
              icon={Pencil}
              href={`/admin/blog/${row.original.id}`}
              label={`Edit “${row.original.title}”`}
            />
          </RowActions>
        ),
      },
    ],
    []
  );

  return (
    <SortableTable
      data={rows}
      columns={columns}
      searchPlaceholder="Filter posts…"
      emptyMessage="No posts yet."
      initialSort={[{ id: "updatedAt", desc: true }]}
    />
  );
}
