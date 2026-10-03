"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { ChevronLeft, ChevronRight, Search, Snowflake, X } from "lucide-react";

import { saveDraftAction, sendPricingAction } from "@/app/admin/partners/pricing-actions";
import { AdminAlert } from "@/components/admin/AdminAlert";
import { AdminSubmit } from "@/components/admin/form";
import { Cell, DataTable, Panel, Pill, Row } from "@/components/admin/ui";
import { initialFormState } from "@/lib/forms";

/* ===========================================================================
   The negotiated price list editor.

   The admin types ONE number per line — the discount — because that is the
   number actually negotiated. "Fifteen percent off" is the sentence said on
   the call; "126.64" is its consequence. Typing the consequence instead means
   every list price change silently desynchronises the agreed discount.

   The resulting price is computed live as a preview and recomputed on the
   server from the stored list price, so what the admin sees and what is
   written cannot disagree — the client number is never trusted.

   FILTERING MUST NOT DROP A LINE FROM THE FORM. This is one form and it posts
   every discount at once; a row that is filtered out or on another page still
   has to submit the value it holds, or narrowing to "semaglutide", typing a
   number and pressing send would quietly zero the four hundred lines that were
   not on screen. Rows off screen render as hidden inputs rather than not
   rendering, which is also why both fields are controlled — an uncontrolled
   input loses what was typed the moment it unmounts.
   ========================================================================= */

export type EditorLine = {
  itemId: string;
  productName: string;
  strength: string | null;
  form: string | null;
  unit: string;
  listPrice: string;
  discountPercent: string;
  adminComment: string | null;
  categoryName: string | null;
  deaSchedule: string | null;
  coldChain: boolean;
};

const PAGE_SIZE = 25;

const money = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Mirrors computeFinalPrice on the server. Preview only. */
function preview(listPrice: string, discount: string): number {
  const list = Number(listPrice);
  const percent = Number(discount || "0");
  if (!Number.isFinite(list) || !Number.isFinite(percent)) return list;
  return Math.round(list * (1 - percent / 100) * 100) / 100;
}

export function PriceListEditor({
  partnerId,
  lines,
  canSend,
}: {
  partnerId: string;
  lines: EditorLine[];
  /** False once sent — the draft is read-only until another round is asked for. */
  canSend: boolean;
}) {
  const [discounts, setDiscounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(lines.map((line) => [line.itemId, line.discountPercent]))
  );
  const [comments, setComments] = useState<Record<string, string>>(() =>
    Object.fromEntries(lines.map((line) => [line.itemId, line.adminComment ?? ""]))
  );

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const [saveState, save] = useFormState(saveDraftAction.bind(null, partnerId), initialFormState);
  const [sendState, send] = useFormState(sendPricingAction.bind(null, partnerId), initialFormState);
  const state = sendState.message ? sendState : saveState;

  const categories = useMemo(() => {
    const names = new Map<string, number>();
    for (const line of lines) {
      if (!line.categoryName) continue;
      names.set(line.categoryName, (names.get(line.categoryName) ?? 0) + 1);
    }
    return [...names.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [lines]);

  const matching = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return lines.filter((line) => {
      if (category && line.categoryName !== category) return false;
      if (!needle) return true;
      return [line.productName, line.strength, line.form]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [lines, q, category]);

  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = matching.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const visibleIds = new Set(visible.map((line) => line.itemId));
  const offScreen = lines.filter((line) => !visibleIds.has(line.itemId));

  const totals = useMemo(() => {
    let list = 0;
    let final = 0;
    for (const line of lines) {
      list += Number(line.listPrice);
      final += preview(line.listPrice, discounts[line.itemId] ?? "0");
    }
    return { list, final, saved: list - final };
  }, [lines, discounts]);

  /** Apply one discount to every line the filter currently matches. */
  const applyToMatching = (value: string) => {
    setDiscounts((prev) => {
      const next = { ...prev };
      for (const line of matching) next[line.itemId] = value;
      return next;
    });
  };

  const filtered = Boolean(q || category);
  const reset = () => {
    setQ("");
    setCategory("");
    setPage(1);
  };

  return (
    <form action={canSend ? send : save}>
      <Panel
        title="Negotiated pricing"
        description="Type a discount per line. The resulting price is recomputed on the server from the stored list price."
        bodyClassName="p-0"
        actions={
          <div className="flex items-center gap-1.5">
            <label className="admin-label" htmlFor="apply-all">
              {filtered ? `Apply to ${matching.length}` : "Apply to all"}
            </label>
            <input
              id="apply-all"
              type="number"
              min={0}
              max={100}
              step="0.5"
              placeholder="%"
              className="admin-input w-20"
              onChange={(event) => applyToMatching(event.target.value)}
            />
          </div>
        }
      >
        {state.message && (
          <div className="px-4 pt-4">
            <AdminAlert ok={state.ok}>{state.message}</AdminAlert>
          </div>
        )}

        {/* --- Filters ---------------------------------------------------- */}
        <div
          className="flex flex-wrap items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <div className="relative min-w-[13rem] flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color:var(--admin-ink-50)]"
              strokeWidth={2}
              aria-hidden
            />
            <input
              type="search"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
              placeholder="Search this list…"
              aria-label="Search the price list"
              className="admin-input pl-8"
            />
          </div>

          {categories.length > 1 && (
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by category"
              className="admin-input w-auto"
            >
              <option value="">All categories</option>
              {categories.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
            </select>
          )}

          <span className="text-[0.75rem] text-[color:var(--admin-ink-50)]">
            {filtered ? `${matching.length} of ${lines.length}` : `${lines.length} lines`}
          </span>

          {filtered && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-[0.75rem] font-medium text-[color:var(--admin-ink-70)] hover:text-[color:var(--admin-ink)]"
            >
              <X className="size-3" strokeWidth={2.4} aria-hidden />
              Reset
            </button>
          )}
        </div>

        <DataTable
          head={["Product", "List", "Discount %", "They pay", "Note"]}
          empty={
            lines.length === 0
              ? "No products to price."
              : matching.length === 0
                ? "Nothing matches that filter."
                : undefined
          }
        >
          {visible.map((line) => {
            const discount = discounts[line.itemId] ?? "0";
            const final = preview(line.listPrice, discount);
            const changed = Number(discount) > 0;

            return (
              <Row key={line.itemId}>
                <Cell>
                  <span className="font-medium">{line.productName}</span>
                  <span className="admin-id mt-0.5 block text-[color:var(--admin-ink-50)]">
                    {[line.strength, line.form].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {line.categoryName && <Pill>{line.categoryName}</Pill>}
                    {line.deaSchedule && line.deaSchedule !== "NC" && (
                      <Pill tone="warn">{line.deaSchedule}</Pill>
                    )}
                    {line.coldChain && (
                      <Pill tone="info">
                        <Snowflake className="mr-0.5 inline size-2.5" strokeWidth={2.6} aria-hidden />
                        cold
                      </Pill>
                    )}
                  </span>
                </Cell>
                <Cell numeric className="text-[color:var(--admin-ink-70)]">
                  {money(Number(line.listPrice))}
                </Cell>
                <Cell numeric>
                  <input
                    type="number"
                    name={`discount:${line.itemId}`}
                    value={discount}
                    min={0}
                    max={100}
                    step="0.5"
                    onChange={(event) =>
                      setDiscounts((prev) => ({ ...prev, [line.itemId]: event.target.value }))
                    }
                    aria-label={`Discount for ${line.productName}`}
                    className="admin-input w-20 text-right"
                  />
                </Cell>
                <Cell numeric className={changed ? "font-semibold text-[#2c6b4d]" : ""}>
                  {money(final)}
                </Cell>
                <Cell>
                  <input
                    type="text"
                    name={`comment:${line.itemId}`}
                    value={comments[line.itemId] ?? ""}
                    onChange={(event) =>
                      setComments((prev) => ({ ...prev, [line.itemId]: event.target.value }))
                    }
                    placeholder="Optional"
                    aria-label={`Note for ${line.productName}`}
                    className="admin-input"
                  />
                </Cell>
              </Row>
            );
          })}
        </DataTable>

        {/* Every line not on screen still posts. See the header note. */}
        {offScreen.map((line) => (
          <div key={line.itemId} hidden>
            <input type="hidden" name={`discount:${line.itemId}`} value={discounts[line.itemId] ?? "0"} />
            <input type="hidden" name={`comment:${line.itemId}`} value={comments[line.itemId] ?? ""} />
          </div>
        ))}

        {pageCount > 1 && (
          <nav
            className="flex items-center justify-between gap-4 border-t px-4 py-2.5"
            style={{ borderColor: "var(--admin-border)" }}
            aria-label="Price list pages"
          >
            <p className="text-[0.75rem] text-[color:var(--admin-ink-50)]">
              {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, matching.length)} of{" "}
              {matching.length}
            </p>
            <span className="flex items-center gap-2">
              <button
                type="button"
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
                className="admin-btn admin-btn-secondary disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" strokeWidth={2.4} aria-hidden />
                Previous
              </button>
              <span className="text-[0.75rem] tabular-nums text-[color:var(--admin-ink-50)]">
                {current} / {pageCount}
              </span>
              <button
                type="button"
                disabled={current >= pageCount}
                onClick={() => setPage(current + 1)}
                className="admin-btn admin-btn-secondary disabled:opacity-40"
              >
                Next
                <ChevronRight className="size-3.5" strokeWidth={2.4} aria-hidden />
              </button>
            </span>
          </nav>
        )}

        <div
          className="flex flex-wrap items-center justify-between gap-4 border-t px-4 py-3"
          style={{ borderColor: "var(--admin-border)" }}
        >
          {/* Totals are across the WHOLE list, never the filtered view — a
              running total that changes when you search is not a total. */}
          <dl className="flex flex-wrap gap-x-8 gap-y-1 text-[0.8125rem]">
            <div>
              <dt className="admin-label">List total</dt>
              <dd className="tabular-nums">{money(totals.list)}</dd>
            </div>
            <div>
              <dt className="admin-label">They pay</dt>
              <dd className="font-semibold tabular-nums">{money(totals.final)}</dd>
            </div>
            <div>
              <dt className="admin-label">Saved</dt>
              <dd className="tabular-nums text-[#2c6b4d]">
                {money(totals.saved)}
                {totals.list > 0 && (
                  <span className="ml-1 text-[color:var(--admin-ink-50)]">
                    ({Math.round((totals.saved / totals.list) * 100)}%)
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="border-t px-4 py-3" style={{ borderColor: "var(--admin-border)" }}>
          <label htmlFor="adminComment" className="admin-label mb-1 block">
            Note to the applicant (optional)
          </label>
          <textarea
            id="adminComment"
            name="adminComment"
            rows={2}
            placeholder="Shown above the price list when they open it."
            className="admin-input"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AdminSubmit>{canSend ? "Send to applicant" : "Save draft"}</AdminSubmit>
            <p className="text-[0.75rem] text-[color:var(--admin-ink-50)]">
              {canSend
                ? "Saves and sends. The applicant is emailed and can accept or ask for another round."
                : "Already sent — waiting on the applicant."}
            </p>
          </div>
        </div>
      </Panel>
    </form>
  );
}
