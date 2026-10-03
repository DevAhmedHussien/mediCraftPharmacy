import Link from "next/link";

import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;

/**
 * Range switcher as links, not buttons with state.
 *
 * The range lives in the URL, so it survives a refresh, can be pasted into
 * Slack, and needs no client JavaScript — the page is a server component and
 * re-renders with new data on navigation.
 */
export function RangeTabs({ current }: { current: number }) {
  return (
    <div
      className="inline-flex rounded-[5px] border p-0.5"
      style={{ borderColor: "var(--admin-border-strong)", background: "var(--admin-surface)" }}
    >
      {RANGES.map((range) => (
        <Link
          key={range}
          href={`/admin?range=${range}`}
          scroll={false}
          aria-current={range === current ? "true" : undefined}
          className={cn(
            "rounded-[3px] px-2.5 py-1 text-[0.8125rem] font-medium transition-colors",
            range === current
              ? "bg-[color:var(--admin-accent)] text-white"
              : "text-[color:var(--admin-ink-70)] hover:text-[color:var(--admin-ink)]"
          )}
        >
          {range}d
        </Link>
      ))}
    </div>
  );
}
