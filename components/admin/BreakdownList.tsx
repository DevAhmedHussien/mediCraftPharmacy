import { Panel } from "@/components/admin/ui";
import type { TopRow } from "@/lib/services/analytics";

/**
 * A ranked list with an inline bar.
 *
 * The bar is sized relative to the TOP row, not to the total: with a long
 * tail, sharing against the total makes every row after the first a sliver.
 * Relative-to-leader keeps the comparison readable.
 */
export function BreakdownList({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: TopRow[];
  metric: "views" | "uniques";
}) {
  const max = Math.max(1, ...rows.map((row) => row[metric]));

  return (
    <Panel title={title} bodyClassName="p-2">
      {rows.length === 0 ? (
        <p className="px-2 py-4 text-[0.8125rem] text-[color:var(--admin-ink-50)]">
          No data for this period.
        </p>
      ) : (
        <ul className="space-y-px">
          {rows.map((row) => (
            <li key={row.label} className="relative overflow-hidden rounded-lg">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-[#e7edf5]"
                style={{ width: `${(row[metric] / max) * 100}%` }}
              />
              <span className="relative flex items-center justify-between gap-3 px-2 py-1.5">
                <span className="truncate text-[0.8125rem]" title={row.label}>
                  {row.label}
                </span>
                <span className="shrink-0 text-[0.75rem] tabular-nums text-[color:var(--admin-ink-70)]">
                  {row[metric].toLocaleString()}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
