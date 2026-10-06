import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ===========================================================================
   The ruled table — one style for marketing fact lists, the portal and admin.

   Three areas were drawing tables three ways: `.spec` rails on the marketing
   pages, `DataTable` in admin/ui.tsx, and hand-rolled rows in the portal.
   This is the shape the references use in all three: no fill, no zebra, a
   hairline under every row, and a header in Plex Mono at 10.5px tracked out.

   WHY NO ZEBRA AND NO BORDERS DOWN THE SIDES. The content here is regulatory
   — USP chapters, test methods, lot numbers, prices. Rules between rows are
   what the eye needs to track across a line; everything else is chrome that
   makes a specification look like a spreadsheet.

   `density` is the only fork. Marketing rows breathe at 26px because there
   are six of them on a page someone is reading; admin rows are 58px because
   there are forty and someone is scanning. Same component, because the
   alternative is two that drift.
   ========================================================================= */

export function Table({
  head,
  children,
  caption,
  density = "comfortable",
  className,
}: {
  head: ReactNode[];
  children: ReactNode;
  /**
   * What the table is, for anyone who cannot see the heading above it.
   * Visually hidden — the heading is already on screen; this is the same
   * sentence reaching the people the heading does not.
   */
  caption?: string;
  density?: "comfortable" | "compact";
  className?: string;
}) {
  return (
    /* The scroll container, not the table, carries the overflow — a table
       with `overflow-x` on itself cannot scroll, and on a phone a five-column
       table otherwise widens the whole page. */
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-hair">
            {head.map((cell, i) => (
              <th
                key={i}
                scope="col"
                className={cn(
                  "whitespace-nowrap font-mono text-[10.5px] font-normal uppercase tracking-[0.08em] text-ink-muted",
                  density === "compact" ? "px-3 py-2.5" : "px-0 py-3 pr-6"
                )}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("border-b border-hair last:border-0", className)}>{children}</tr>
  );
}

export function TableCell({
  children,
  className,
  mono,
  numeric,
  density = "comfortable",
}: {
  children: ReactNode;
  className?: string;
  /** For marks, lot numbers and USP chapters — never for prose. */
  mono?: boolean;
  /** Right-aligned and tabular, so figures line up on the decimal. */
  numeric?: boolean;
  density?: "comfortable" | "compact";
}) {
  return (
    <td
      className={cn(
        "align-top text-[15px] text-navy",
        density === "compact" ? "px-3 py-3.5" : "px-0 py-[26px] pr-6",
        mono && "font-mono text-[13px] tracking-[0.06em] text-brand-500",
        numeric && "text-right tabular-nums",
        className
      )}
    >
      {children}
    </td>
  );
}
