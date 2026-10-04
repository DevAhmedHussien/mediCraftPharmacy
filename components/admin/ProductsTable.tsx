"use client";

import Link from "next/link";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { SortableTable } from "@/components/admin/SortableTable";
import { toggleProduct } from "@/app/admin/products/actions";
import { Pill, RowAction, RowActions } from "@/components/admin/ui";

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  strength: string | null;
  form: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  route: string | null;
  packageSize: string | null;
  deaSchedule: string | null;
  coldChain: boolean;
  isQuoteOnly: boolean;
  listPrice: string;
  unit: string;
  isPublished: boolean;
  isActive: boolean;
  sortOrder: number;
};

export function ProductsTable({ rows, canEdit }: { rows: ProductRow[]; canEdit: boolean }) {
  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <>
            <Link
              href={canEdit ? `/admin/products/${row.original.id}` : `/product/${row.original.slug}`}
              className="font-medium transition-colors hover:text-[color:var(--admin-accent)]"
            >
              {row.original.name}
            </Link>
            <p className="admin-id mt-0.5 text-[color:var(--admin-ink-50)]">
              {[row.original.strength, row.original.form, row.original.route, row.original.packageSize]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </>
        ),
      },
      {
        id: "category",
        accessorFn: (row) => row.categoryName ?? "",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-[color:var(--admin-ink-70)]">
            {row.original.categoryName ?? "—"}
          </span>
        ),
      },
      {
        id: "flags",
        header: "Handling",
        /* Sortable so "show me everything that ships cold" is one click.
           Controlled substances sort above cold-chain above the rest, which is
           the order an operator cares about them in. */
        accessorFn: (row) =>
          (row.deaSchedule && row.deaSchedule !== "NC" ? 2 : 0) + (row.coldChain ? 1 : 0),
        cell: ({ row }) => {
          const dea = row.original.deaSchedule;
          return (
            <span className="flex flex-wrap items-center gap-1.5">
              {dea && dea !== "NC" && <Pill tone="warn">{dea}</Pill>}
              {row.original.coldChain && <Pill tone="info">cold</Pill>}
              {!dea && !row.original.coldChain && (
                <span className="text-[color:var(--admin-ink-50)]">—</span>
              )}
              {dea === "NC" && !row.original.coldChain && (
                <span className="text-[color:var(--admin-ink-50)]">—</span>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: "listPrice",
        header: "List price",
        meta: { align: "right" },
        // Sorting a price as a string puts "9.00" above "100.00". The accessor
        // stays a string for exactness; only the comparison casts.
        sortingFn: (a, b) => Number(a.original.listPrice) - Number(b.original.listPrice),
        cell: ({ row }) =>
          row.original.isQuoteOnly ? (
            // Not $0.00. A quote-only item has no list price, and printing a
            // zero in a price column is how a zero ends up in a quote.
            <span className="text-[color:var(--admin-ink-50)]">On quote</span>
          ) : (
            <span className="tabular-nums">
              ${Number(row.original.listPrice).toFixed(2)}
              <span className="ml-1 text-[0.75rem] text-[color:var(--admin-ink-50)]">
                /{row.original.unit}
              </span>
            </span>
          ),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-1.5">
            {row.original.isActive ? <Pill tone="good">Active</Pill> : <Pill>Hidden</Pill>}
            {row.original.isPublished && <Pill tone="info">public</Pill>}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) =>
          canEdit ? (
            <RowActions>
              <form action={toggleProduct.bind(null, row.original.id, !row.original.isActive)}>
                <RowAction
                  type="submit"
                  icon={row.original.isActive ? EyeOff : Eye}
                  label={
                    row.original.isActive
                      ? `Hide ${row.original.name} from the site`
                      : `Show ${row.original.name} on the site`
                  }
                />
              </form>
              <RowAction
                icon={Pencil}
                href={`/admin/products/${row.original.id}`}
                label={`Edit ${row.original.name}`}
              />
            </RowActions>
          ) : null,
      },
    ],
    [canEdit]
  );

  return (
    <SortableTable
      data={rows}
      columns={columns}
      searchPlaceholder="Filter products…"
      emptyMessage="No products yet."
      initialSort={[{ id: "name", desc: false }]}
    />
  );
}
