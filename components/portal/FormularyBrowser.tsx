"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Search, Snowflake, X } from "lucide-react";

import {
  clearAllSelected,
  selectAllMatching,
  toggleProductSelection,
} from "@/app/portal/pricing/actions";
import type { FormularyRow } from "@/lib/services/formulary";
import { cn } from "@/lib/utils";

/* ===========================================================================
   The formulary, as a practice picks through it.

   Search, category, paging and "mine only" all live in the URL. That is
   deliberate: a partner who filters to their category and sends the link to a
   colleague sends what they are looking at, the back button does what it says,
   and a reload does not drop them at page one of seven hundred.

   Ticking a row writes to the database immediately and optimistically updates
   the row, so the checkbox responds at the speed of a checkbox while the
   selection is still durable enough to survive turning the page.
   ========================================================================= */

export type FormularyCategory = { slug: string; name: string; count: number };

export function FormularyBrowser({
  rows,
  total,
  page,
  pageCount,
  selectedCount,
  categories,
  pageSize,
}: {
  rows: FormularyRow[];
  total: number;
  page: number;
  pageCount: number;
  selectedCount: number;
  categories: FormularyCategory[];
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const selectedOnly = params.get("mine") === "1";

  const [draftQuery, setDraftQuery] = useState(q);
  useEffect(() => setDraftQuery(q), [q]);

  /* The selection shown, ahead of the server confirming it. `useOptimistic`
     rather than local state so a failed write reverts rather than leaving the
     UI claiming something the database does not agree with. */
  const [optimisticRows, applyOptimistic] = useOptimistic(
    rows,
    (current: FormularyRow[], change: { id: string; selected: boolean }) =>
      current.map((row) => (row.id === change.id ? { ...row, selected: change.selected } : row))
  );

  const [optimisticCount, applyCount] = useOptimistic(
    selectedCount,
    (current: number, delta: number) => Math.max(0, current + delta)
  );

  const setParams = (next: Record<string, string | null>) => {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") search.delete(key);
      else search.set(key, value);
    }
    // Any change of filter invalidates the page number: page 7 of a search
    // that now has two results is an empty screen.
    if (!("page" in next)) search.delete("page");
    router.replace(`${pathname}?${search.toString()}`, { scroll: false });
  };

  // Debounced so a search is one request after typing stops, not one per key.
  useEffect(() => {
    if (draftQuery === q) return;
    const timer = setTimeout(() => setParams({ q: draftQuery || null }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftQuery]);

  const currentQuery = useMemo(
    () => ({ q: q || undefined, category: category || undefined, selectedOnly }),
    [q, category, selectedOnly]
  );

  const toggle = (row: FormularyRow) => {
    const next = !row.selected;
    startTransition(async () => {
      applyOptimistic({ id: row.id, selected: next });
      applyCount(next ? 1 : -1);
      await toggleProductSelection(row.id, next);
    });
  };

  const allOnPageSelected =
    optimisticRows.length > 0 && optimisticRows.every((row) => row.selected);

  const filtered = Boolean(q || category || selectedOnly);

  return (
    <div className="space-y-4">
      {/* --- Controls ------------------------------------------------------ */}
      <div className="rounded-card border border-hair-soft bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[14rem] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
              strokeWidth={2}
              aria-hidden
            />
            <input
              type="search"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Search by name, strength or form…"
              aria-label="Search the formulary"
              className="w-full rounded-[14px] border border-hair bg-white py-2 pl-9 pr-3 text-meta text-ink placeholder:text-ink-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <select
            value={category}
            onChange={(event) => setParams({ category: event.target.value || null })}
            aria-label="Filter by category"
            className="rounded-[14px] border border-hair bg-white px-3 py-2 text-meta text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setParams({ mine: selectedOnly ? null : "1" })}
            aria-pressed={selectedOnly}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-caption font-medium transition-colors",
              selectedOnly
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-line bg-white text-ink-soft hover:border-brand-300"
            )}
          >
            My selection ({optimisticCount})
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-caption">
          <span className="text-ink-muted">
            {total.toLocaleString()} {total === 1 ? "medication" : "medications"}
            {filtered && " match"}
          </span>

          {total > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await selectAllMatching(currentQuery, !allOnPageSelected);
                  void result;
                })
              }
              className="font-medium text-brand-600 hover:underline disabled:opacity-50"
            >
              {allOnPageSelected ? "Deselect" : "Select"} all {total.toLocaleString()}
              {filtered ? " matching" : ""}
            </button>
          )}

          {optimisticCount > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => void (await clearAllSelected()))}
              className="font-medium text-ink-soft hover:text-danger-fg hover:underline disabled:opacity-50"
            >
              Clear selection
            </button>
          )}

          {filtered && (
            <button
              type="button"
              onClick={() => setParams({ q: null, category: null, mine: null })}
              className="inline-flex items-center gap-1 font-medium text-ink-soft hover:text-brand-600"
            >
              <X className="size-3" strokeWidth={2.4} aria-hidden />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* --- The list ------------------------------------------------------ */}
      {optimisticRows.length === 0 ? (
        <div className="rounded-card border border-dashed border-hair-strong px-6 py-12 text-center">
          <p className="text-meta font-medium text-ink">Nothing matches that</p>
          <p className="mt-1 text-caption text-ink-muted">
            {selectedOnly
              ? "You have not selected anything yet. Clear the filter to browse the formulary."
              : "Try a shorter search, or a different category."}
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-card border border-hair-soft bg-white">
          {optimisticRows.map((row) => (
            <li key={row.id} className="border-b border-line last:border-0">
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors",
                  row.selected ? "bg-brand-50/50" : "hover:bg-sand"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-[1.15rem] shrink-0 items-center justify-center rounded-md border transition-colors",
                    row.selected
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-line bg-white"
                  )}
                  aria-hidden
                >
                  {row.selected && <Check className="size-3" strokeWidth={3.2} />}
                </span>
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={() => toggle(row)}
                  className="sr-only"
                />

                <span className="min-w-0 flex-1">
                  <span className="block text-meta font-medium leading-snug text-ink">
                    {row.name}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-caption text-ink-muted">
                    {[row.strength, row.form, row.route, row.packageSize]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {row.categoryName && (
                      <span className="rounded-full bg-sand px-2 py-0.5 text-caption text-ink-soft">
                        {row.categoryName}
                      </span>
                    )}
                    {row.deaSchedule && row.deaSchedule !== "NC" && (
                      <span className="rounded-full bg-warning-bg px-2 py-0.5 text-caption font-medium text-warning-fg">
                        {row.deaSchedule}
                      </span>
                    )}
                    {row.coldChain && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-caption font-medium text-sky-800">
                        <Snowflake className="size-2.5" strokeWidth={2.6} aria-hidden />
                        Cold ship
                      </span>
                    )}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-meta font-bold tabular-nums text-ink">
                    ${Number(row.listPrice).toFixed(2)}
                  </span>
                  <span className="block font-mono text-caption text-ink-muted">
                    per {row.unit}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {/* --- Paging -------------------------------------------------------- */}
      {pageCount > 1 && (
        <nav
          className="flex items-center justify-between gap-4"
          aria-label="Formulary pages"
        >
          <p className="text-caption text-ink-muted">
            Page {page} of {pageCount} · showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total.toLocaleString()}
          </p>

          <span className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setParams({ page: String(page - 1) })}
              className="btn-outline btn-sm disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" strokeWidth={2.4} aria-hidden />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setParams({ page: String(page + 1) })}
              className="btn-outline btn-sm disabled:opacity-40"
            >
              Next
              <ChevronRight className="size-3.5" strokeWidth={2.4} aria-hidden />
            </button>
          </span>
        </nav>
      )}
    </div>
  );
}
