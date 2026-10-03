import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ===========================================================================
   The admin's own primitives, ported from the Tila console.

   The marketing site's card, badge and table are tuned for reading; these are
   tuned for scanning. Keeping them separate is what stops the console
   drifting back into looking like a logged-in storefront — which is what the
   first version of this admin was, because it reused `.card`, `.btn-primary`
   and the 1rem type scale from the public pages.

   Everything here is a server component. None of it needs state.
   ========================================================================= */

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-5">
      {back && (
        <Link
          href={back.href}
          className="mb-1.5 inline-block text-[0.75rem] text-[color:var(--admin-ink-50)] transition-colors hover:text-[color:var(--admin-ink)]"
        >
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="admin-title">{title}</h1>
          {description && (
            <p className="mt-1 max-w-3xl text-[0.8125rem] leading-relaxed text-[color:var(--admin-ink-70)]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("admin-panel", className)}>
      {(title || actions) && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <div className="min-w-0">
            {title && <h2 className="admin-section">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-[0.75rem] text-[color:var(--admin-ink-50)]">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * A strip of numbers, not a row of cards.
 *
 * Six shadowed boxes is the default dashboard and it spends a third of the
 * screen on borders. These share one panel and are separated by rules.
 */
export function StatStrip({
  stats,
}: {
  stats: Array<{
    label: string;
    value: string | number;
    detail?: string;
    href?: string;
    /** Draws the figure in the alert colour when it is above zero — for
     *  queues with a person waiting at the other end. */
    urgent?: boolean;
  }>;
}) {
  return (
    <div
      className="admin-panel grid divide-y sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4"
      style={{ borderColor: "var(--admin-border)" }}
    >
      {stats.map((stat, index) => {
        const urgent = stat.urgent && Number(stat.value) > 0;
        const body = (
          <>
            <p className="admin-label">{stat.label}</p>
            <p
              className={cn(
                "mt-1 text-[1.625rem] font-semibold leading-none tabular-nums tracking-[-0.02em]",
                urgent && "text-[#9c3a2a]"
              )}
            >
              {stat.value}
            </p>
            {stat.detail && (
              <p className="mt-1 text-[0.75rem] text-[color:var(--admin-ink-50)]">{stat.detail}</p>
            )}
          </>
        );

        return (
          <div
            key={stat.label}
            className={cn("px-4 py-3", index > 0 && "sm:border-l")}
            style={{ borderColor: "var(--admin-border)" }}
          >
            {stat.href ? (
              <Link href={stat.href} className="block transition-opacity hover:opacity-70">
                {body}
              </Link>
            ) : (
              body
            )}
          </div>
        );
      })}
    </div>
  );
}

const TONES = {
  neutral: "bg-[#e8ebee] text-[#4a5470]",
  good: "bg-[#e4efe8] text-[#2c6b4d]",
  warn: "bg-[#f7efdc] text-[#8a6416]",
  bad: "bg-[#f8e9e5] text-[#9c3a2a]",
  info: "bg-[#e7edf5] text-[#2c4a68]",
} as const;

export type Tone = keyof typeof TONES;

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-[4px] px-1.5 py-0.5 text-[0.6875rem] font-medium",
        TONES[tone]
      )}
    >
      {children}
    </span>
  );
}

/** A dense table. */
export function DataTable({
  head,
  children,
  empty,
}: {
  head: ReactNode[];
  children: ReactNode;
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[0.8125rem]">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--admin-border)" }}>
            {head.map((cell, index) => (
              <th
                key={index}
                className="admin-label whitespace-nowrap px-4 py-2 text-left font-semibold"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && (
        <p className="px-4 py-6 text-[0.8125rem] text-[color:var(--admin-ink-50)]">{empty}</p>
      )}
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="admin-row">{children}</tr>;
}

export function Cell({
  children,
  className,
  mono,
  numeric,
  title,
}: {
  children: ReactNode;
  className?: string;
  mono?: boolean;
  numeric?: boolean;
  /** Native tooltip, for a cell whose content is truncated. */
  title?: string;
}) {
  return (
    <td
      title={title}
      className={cn(
        "px-4 py-2.5 align-middle",
        mono && "admin-id",
        numeric && "text-right tabular-nums",
        className
      )}
    >
      {children}
    </td>
  );
}

/** Label and value, for a record's details. */
export function Facts({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="admin-label">{label}</dt>
          <dd className="mt-0.5 break-words text-[0.8125rem]">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * An empty screen is an invitation to act, so this requires a next step.
 * `title` says what is not here; `action` says what to do instead.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-[6px] border border-dashed px-6 py-10",
        className
      )}
      style={{ borderColor: "var(--admin-border-strong)" }}
    >
      {Icon && (
        <Icon className="size-6 text-[color:var(--admin-ink-50)]" strokeWidth={1.5} aria-hidden />
      )}
      <div className="space-y-1">
        <p className="text-[0.9375rem] font-semibold">{title}</p>
        <p className="max-w-prose text-[0.8125rem] leading-relaxed text-[color:var(--admin-ink-70)]">
          {description}
        </p>
      </div>
      {action && (
        <Link href={action.href} className="admin-btn admin-btn-primary mt-1">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/**
 * Skeleton rows for a `loading.tsx`.
 *
 * A spinner says "something is happening"; this says "a table is coming and
 * it is about this wide", which is what stops the layout jumping when the
 * data lands.
 */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="admin-panel overflow-hidden">
      <div className="border-b px-4 py-2.5" style={{ borderColor: "var(--admin-border)" }}>
        <div className="h-3 w-28 animate-pulse rounded bg-[color:var(--admin-border)]" />
      </div>
      <div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 border-b px-4 py-3 last:border-0"
            style={{ borderColor: "var(--admin-border)" }}
          >
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-3 animate-pulse rounded bg-[color:var(--admin-border)]"
                style={{
                  width: colIndex === 0 ? "28%" : `${14 + ((rowIndex + colIndex) % 3) * 4}%`,
                  animationDelay: `${rowIndex * 60}ms`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Relative time, for "waiting since" columns. */
export function relativeDays(date: Date | string): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 864e5);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1mo" : `${months}mo`;
}
