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
  headingLevel = 2,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /**
   * 3 when the panel sits inside a `Zone`, which owns the `h2`.
   *
   * Nesting is what makes a heading list navigable: a page of eleven sibling
   * `h2`s tells a screen-reader user nothing about which three of them are
   * the work and which eight are reference.
   */
  headingLevel?: 2 | 3;
  children: ReactNode;
}) {
  const Heading = (headingLevel === 3 ? "h3" : "h2") as "h2" | "h3";

  return (
    <section className={cn("admin-panel", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-4 pt-5">
          <div className="min-w-0">
            {title && <Heading className="admin-section">{title}</Heading>}
            {description && (
              <p className="mt-0.5 text-[0.75rem] text-[color:var(--admin-ink-50)]">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      {/* No top padding when a header is present — the header already set the
          card's top rhythm, and doubling it leaves a visible gap nobody
          chose. */}
      <div className={cn(title || actions ? "px-6 pb-6" : "p-6", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

/**
 * A strip of numbers, not a row of cards.
 *
 * Six shadowed boxes is the default dashboard and it spends a third of the
 * screen on borders. These share one panel and are separated by rules.
 *
 * A `<dl>`, not a grid of paragraphs. Each figure IS the value of the label
 * beside it, and a screen reader that knows that reads "Partners waiting on
 * us, three" instead of two unrelated lines of text. It costs nothing in the
 * markup and it is the difference between a table of numbers and a list of
 * orphaned digits.
 *
 * URGENCY IS NEVER THE COLOUR ALONE. The alert red used to be the only signal
 * that a figure had a person waiting behind it, which is invisible to anyone
 * who cannot separate it from the ink — about one man in twelve. The figure
 * now carries a marker and a word as well.
 */
export function StatStrip({
  stats,
}: {
  stats: Array<{
    label: string;
    value: string | number;
    detail?: string;
    href?: string;
    /** Flags the figure when it is above zero — for queues with a person
     *  waiting at the other end. */
    urgent?: boolean;
  }>;
}) {
  return (
    /* FOUR CARDS, not one panel with dividers.
    
       The reference lays these out as discrete 22px cards in an `auto-fit`
       grid at a 220px floor. A single divided strip is the dashboard cliché
       and it behaves badly: at the breakpoint where four columns become two,
       the `divide-y`/`divide-x` rules disagree about which edges exist and
       you get stray hairlines hanging off the ends. Separate cards reflow
       with no rules to get wrong. */
    <dl
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13.75rem), 1fr))" }}
    >
      {stats.map((stat) => {
        const urgent = stat.urgent && Number(stat.value) > 0;

        return (
          /* The <dt> and <dd> are DIRECT children of this div, and the link
             is inside the <dt>, stretched over the card by a pseudo-element.
             
             It used to be `dl > div > a > dt`, which axe flags twice: a <dl>
             may only directly contain dt, dd, div, script or template, and a
             <dt>/<dd> must be contained by a <dl>. With an <a> in between,
             assistive tech saw a definition list with no definitions in it —
             four labels and four numbers, unpaired. */
          <div
            key={stat.label}
            className={cn(
              "admin-panel relative flex flex-col gap-2 p-[1.375rem] transition-colors duration-200 motion-reduce:transition-none",
              stat.href && "hover:bg-white"
            )}
            style={{ borderRadius: "1.375rem" }}
          >
            <dt className="admin-label flex items-center gap-1.5">
              {/* The dot marks the card that wants attention. The reference
                  gives every stat one; here only the urgent ones get it,
                  because a dot on all four marks nothing. */}
              {urgent && (
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-[theme(colors.warning.fg)]"
                />
              )}
              {stat.href ? (
                <Link
                  href={stat.href}
                  className="admin-focus rounded-xl after:absolute after:inset-0 after:rounded-[1.375rem] after:content-['']"
                >
                  {stat.label}
                </Link>
              ) : (
                stat.label
              )}
            </dt>

            <dd
              className={cn(
                "font-display text-[2.25rem] font-normal leading-none tabular-nums tracking-display",
                /* `warning`, not `danger`. A queue with eleven things in it
                   is a queue doing its job — it is not a failure, and
                   colouring it the same red the console uses for "agreement
                   declined" and "suspended" taught operators to read that
                   red as "there is work", which is exactly the wrong lesson
                   for the day something actually breaks. */
                urgent ? "text-[theme(colors.warning.fg)]" : "text-[color:var(--admin-ink)]"
              )}
            >
              {stat.value}
              {urgent && <span className="sr-only">, needs attention</span>}
            </dd>

            {stat.detail && (
              <dd className="text-[0.78125rem] text-[color:var(--admin-ink-50)]">
                {stat.detail}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}

/**
 * A zone heading, for a page built of several.
 *
 * The dashboard used to be a flat stack of panels, every one of them an `h2`
 * of equal weight — so "Traffic" announced itself exactly as loudly as the
 * queue of partners waiting on a reply, and a screen reader's heading list
 * read as fourteen peers with no shape. Zones give the page an outline:
 * `h2` for the zone, the panels inside it demoted to `h3`.
 */
export function Zone({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3" aria-labelledby={headingId(title)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
        <h2
          id={headingId(title)}
          className="text-[0.9375rem] font-bold tracking-[-0.01em] text-[color:var(--admin-ink)]"
        >
          {title}
        </h2>
        {description && (
          <p className="text-[0.8125rem] text-[color:var(--admin-ink-50)]">{description}</p>
        )}
        {actions}
      </div>
      {children}
    </section>
  );
}

const headingId = (title: string) =>
  `zone-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

/**
 * "4d", with the real date underneath it.
 *
 * A relative age is the right thing to scan a queue by and the wrong thing to
 * be the only record of when something happened: "2mo" cannot be checked
 * against an email, and a screen reader reading "4d" says "four dee". The
 * element carries the machine-readable date, the visible short form, and the
 * full date for anyone who hovers or listens.
 */
export function Since({ date }: { date: Date | string }) {
  const value = new Date(date);
  const full = value.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <time dateTime={value.toISOString()} title={full} className="tabular-nums">
      <span aria-hidden>{relativeDays(value)}</span>
      <span className="sr-only">{full}</span>
    </time>
  );
}

/* ---------------------------------------------------------------------
   Status pills.

   A soft tint with saturated text, not a solid block of colour. Six of these
   in a table column, each a filled chip, is a column that reads as the
   loudest thing on the page — which is wrong, because a status is context for
   the row, not the point of it.

   Each tone carries its own dot colour. The dot is the scanning aid: in a
   long list the eye finds the shape and the position before it reads the
   word, which is how a queue gets triaged at a glance. The WORD is what
   carries the meaning — the colour never does it alone.
   ------------------------------------------------------------------ */
/* On the `success` / `warning` / `danger` / `info` token pairs, not ten
   hardcoded hexes.
   
   `good` was #246848 on #e3f0e8 — a green, and the only green in the
   application. The identity has no green; a green tick beside a cyan brand
   mark is a third colour nobody chose, and on the partners table it sat four
   pixels from a brand-blue pill in the next row. `success` is cyan-700, which
   is a colour this brand actually owns.
   
   Each pair clears 4.5:1 both on its own chip and on the page ground
   (success 5.41 / 5.60, warning 5.43 / 5.53, danger 5.75 / 6.13, info
   5.07 / 5.28, neutral 6.50 / 7.18), so a pill reads whether it sits in a
   white panel or directly on the page.
   
   The dot is the foreground colour rather than a lighter sibling: a dot that
   is paler than its own label is a decoration, and the comment above this
   block is explicit that the shape and position are doing triage work. */
const TONES = {
  neutral: { chip: "bg-hair-soft text-ink-soft", dot: "#46536f" },
  good: { chip: "bg-success-bg text-success-fg", dot: "#0b6e74" },
  warn: { chip: "bg-warning-bg text-warning-fg", dot: "#8a5a00" },
  bad: { chip: "bg-danger-bg text-danger-fg", dot: "#b42318" },
  info: { chip: "bg-info-bg text-info-fg", dot: "#1b54fb" },
} as const;

export type Tone = keyof typeof TONES;

export function Pill({
  children,
  tone = "neutral",
  /** Drops the dot, for a pill that is a count or a label rather than a state. */
  plain,
}: {
  children: ReactNode;
  tone?: Tone;
  plain?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[0.25rem] text-[0.6875rem] font-medium leading-none",
        TONES[tone].chip
      )}
    >
      {!plain && (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: TONES[tone].dot }}
        />
      )}
      {children}
    </span>
  );
}

/** A dense table. */
export function DataTable({
  head,
  children,
  empty,
  caption,
}: {
  head: ReactNode[];
  children: ReactNode;
  empty?: string;
  /**
   * What the table is, for anyone who cannot see the panel heading above it.
   * Visually hidden — the heading is already on screen; this is the same
   * sentence reaching the people the heading does not.
   */
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[0.8125rem]">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr style={{ borderBottom: "1px solid var(--admin-border)" }}>
            {head.map((cell, index) => (
              <th
                key={index}
                scope="col"
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

/* ---------------------------------------------------------------------
   Row actions.

   WHY ICONS
   ---------
   An actions column of text links — "View  Archive  Edit" — spends the
   widest part of the row on three verbs that are the same on every row, and
   a column of repeated words is harder to scan than a column of repeated
   shapes: the eye learns a pencil's silhouette once and then finds it by
   position, where it has to re-read each word.

   WHAT THAT COSTS, AND HOW IT IS PAID
   -----------------------------------
   An unlabelled icon is a guess. Every action here therefore carries a real
   accessible name and a native tooltip, both saying the verb AND the subject
   — "Edit Semaglutide 2.5 mg", not "Edit" — so a screen reader moving down
   the column hears which row it is on rather than "edit, edit, edit".

   Destructive actions get the danger tint on hover only. A row with a red
   control sitting in it at rest reads as a row in trouble.
   ------------------------------------------------------------------ */

export type RowActionTone = "default" | "danger";

export function RowAction({
  icon: Icon,
  label,
  href,
  tone = "default",
  type = "button",
}: {
  icon: LucideIcon;
  /** The verb and the subject. Used as the accessible name and the tooltip. */
  label: string;
  /** A link action. Omit for a submit button inside a form. */
  href?: string;
  tone?: RowActionTone;
  type?: "button" | "submit";
}) {
  const className = cn(
    "admin-focus inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
    tone === "danger"
      ? "text-[color:var(--admin-ink-50)] hover:bg-danger-bg hover:text-danger-fg"
      : "text-[color:var(--admin-ink-50)] hover:bg-[color:var(--admin-bg)] hover:text-[color:var(--admin-ink)]"
  );

  const body = <Icon className="size-4" strokeWidth={1.9} aria-hidden />;

  if (href) {
    return (
      <Link href={href} className={className} title={label} aria-label={label}>
        {body}
      </Link>
    );
  }

  return (
    <button type={type} className={className} title={label} aria-label={label}>
      {body}
    </button>
  );
}

/** The cluster at the right edge of a row. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-0.5">{children}</div>;
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
  bordered,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  /** Draws the dashed edge, for the rare case this is not inside a Panel. */
  bordered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        /* No border and no box.
        
           This almost always renders INSIDE a Panel — "the queue is clear"
           sits in the "Needs you" panel — and a dashed 6px box inside a 24px
           card is two containers saying one thing, with the inner one drawn
           in the style the rest of the console stopped using. It also forced
           a 100px-tall dashed rectangle onto the screen whose only message
           is that there is nothing to look at.
           
           `bordered` is there for the handful of places this stands alone on
           the page ground and does need an edge. */
        "flex flex-col items-start gap-3 py-2",
        bordered && "rounded-card border border-dashed px-6 py-10",
        className
      )}
      style={bordered ? { borderColor: "var(--admin-border-strong)" } : undefined}
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
