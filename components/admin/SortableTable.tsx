"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

/* ===========================================================================
   The sortable admin table, on TanStack Table.

   Named apart from the kit's plain `DataTable` in components/admin/ui.tsx:
   that one is a styled <table> for a server component with no interaction;
   this one adds sorting, filtering and pagination and therefore has to be a
   client component. Most admin lists want the plain one — reach for this when
   a column genuinely needs re-ordering.

   One generic component for every admin list, so sorting, filtering and
   pagination behave identically on products and posts instead of each screen
   growing its own half-implementation.

   CLIENT-SIDE, AND THAT IS A DELIBERATE BOUNDARY
   ----------------------------------------------
   The server hands down a page of rows; this sorts and filters what is
   already in the browser. That is right for a catalog of tens-to-hundreds,
   where a round trip per keystroke is worse than shipping the rows once. It
   stops being right in the thousands — at that point the filter state has to
   move into the URL and back to Postgres, which is why `lib/services/*`
   already takes `q` / `cursor` / `limit` parameters. The swap is a prop
   change, not a rewrite.

   The `q` box here is therefore a *refinement* of the current page, and the
   empty state says so, so nobody concludes a product does not exist when it
   is merely on page two.
   ========================================================================= */

export function SortableTable<T>({
  data,
  columns,
  searchPlaceholder = "Filter…",
  emptyMessage = "Nothing here yet.",
  pageSize = 25,
  initialSort,
}: {
  data: T[];
  /**
   * `any` is TanStack's own value type parameter, and it has to stay open:
   * a table mixes a string column, a Decimal column and a JSX actions column,
   * so pinning it to one type rejects every real column set.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  pageSize?: number;
  initialSort?: SortingState;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? []);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const { pageIndex } = table.getState().pagination;

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color:var(--admin-ink-50)]"
          strokeWidth={2}
          aria-hidden
        />
        <input
          type="search"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="admin-input pl-8"
        />
      </div>

      <div className="admin-panel overflow-x-auto">
        <table className="w-full border-collapse text-[0.8125rem]">
          <thead style={{ borderBottom: "1px solid var(--admin-border)" }}>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      // `aria-sort` is what a screen reader announces; the
                      // arrow is only the sighted half of the same signal.
                      aria-sort={
                        !sorted ? undefined : sorted === "asc" ? "ascending" : "descending"
                      }
                      className={cn(
                        "admin-label whitespace-nowrap px-4 py-2 text-left font-semibold",
                        header.column.columnDef.meta?.align === "right" && "text-right"
                      )}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-[color:var(--admin-ink)]"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3.5" strokeWidth={2.2} aria-hidden />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3.5" strokeWidth={2.2} aria-hidden />
                          ) : (
                            <ChevronsUpDown className="size-3.5 opacity-40" strokeWidth={2} aria-hidden />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[color:var(--admin-ink-50)]">
                  {globalFilter
                    ? `Nothing on this page matches “${globalFilter}”.`
                    : emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="admin-row">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-4 py-2.5 align-middle",
                        cell.column.columnDef.meta?.align === "right" && "text-right"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-[0.75rem] text-[color:var(--admin-ink-50)]">
            Page {pageIndex + 1} of {table.getPageCount()} · {table.getFilteredRowModel().rows.length} rows
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="admin-btn admin-btn-secondary"
            >
              <ChevronLeft className="size-3.5" strokeWidth={2.2} aria-hidden />
              Previous
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="admin-btn admin-btn-secondary"
            >
              Next
              <ChevronRight className="size-3.5" strokeWidth={2.2} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
