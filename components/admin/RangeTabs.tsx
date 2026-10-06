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
    /* A pill track with a pill thumb, like the sign-in method switch and
       every other segmented control in the application. It was a 5px box
       holding 3px boxes. */
    <div
      className="inline-flex gap-0.5 rounded-full border p-1"
      style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}
    >
      {RANGES.map((range) => (
        <Link
          key={range}
          href={`/admin?range=${range}`}
          scroll={false}
          aria-current={range === current ? "true" : undefined}
          className={cn(
            "rounded-full px-3 py-1.5 text-[0.78125rem] font-medium transition-colors duration-200 motion-reduce:transition-none",
            range === current
              ? "bg-[color:var(--admin-ink)] text-white"
              : "text-[color:var(--admin-ink-70)] hover:text-[color:var(--admin-ink)]"
          )}
        >
          {range}d
        </Link>
      ))}
    </div>
  );
}
