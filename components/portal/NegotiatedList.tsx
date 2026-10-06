"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

/* ===========================================================================
   The negotiated list, as the partner reviews it.

   Filtered on the client because it is their own list — a few dozen lines,
   already sent to the page, and someone checking "what did we agree for
   semaglutide" should not wait for a round trip to find out.
   ========================================================================= */

export type NegotiatedItem = {
  id: string;
  name: string;
  strength: string | null;
  form: string | null;
  listPrice: string;
  discountPercent: string;
  finalPrice: string;
};

export function NegotiatedList({ items }: { items: NegotiatedItem[] }) {
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.name, item.strength, item.form].filter(Boolean).join(" ").toLowerCase().includes(needle)
    );
  }, [items, q]);

  const totals = useMemo(() => {
    const list = items.reduce((sum, i) => sum + Number(i.listPrice), 0);
    const pay = items.reduce((sum, i) => sum + Number(i.finalPrice), 0);
    return { list, pay, saved: list - pay };
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[13rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            strokeWidth={2}
            aria-hidden
          />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Find a medication in your list…"
            aria-label="Search your pricing"
            className="w-full rounded-[0.5rem] border border-line bg-white py-2 pl-9 pr-3 text-meta text-ink placeholder:text-ink-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <p className="text-caption text-ink-muted">
          {visible.length === items.length
            ? `${items.length} ${items.length === 1 ? "medication" : "medications"}`
            : `${visible.length} of ${items.length}`}
        </p>
      </div>

      <div className="overflow-hidden rounded-tile border border-line">
        <table className="w-full text-meta">
          <thead className="border-b border-line bg-sand">
            <tr>
              <th scope="col" className="px-4 py-2.5 text-left font-medium text-ink-soft">
                Product
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-soft">
                List
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-soft">
                Discount
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-soft">
                You pay
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5">
                  <span className="font-medium text-ink">{item.name}</span>
                  <span className="mt-0.5 block font-mono text-caption text-ink-muted">
                    {[item.strength, item.form].filter(Boolean).join(" · ")}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-muted line-through">
                  ${Number(item.listPrice).toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
                  {Number(item.discountPercent)}%
                </td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-ink">
                  ${Number(item.finalPrice).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-line bg-sand">
            <tr>
              <td className="px-4 py-2.5 font-medium text-ink-soft">
                Across {items.length} {items.length === 1 ? "line" : "lines"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink-muted line-through">
                ${totals.list.toFixed(2)}
              </td>
              <td className="px-4 py-2.5 text-right text-caption font-medium text-success-fg">
                −${totals.saved.toFixed(2)}
              </td>
              <td className="px-4 py-2.5 text-right font-bold tabular-nums text-ink">
                ${totals.pay.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
