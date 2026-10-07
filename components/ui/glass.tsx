import { cn } from "@/lib/utils";

/**
 * Frosted surfaces. Server components — no client JS.
 * backdrop-filter is progressive enhancement: without it the 60–70% white
 * fill still reads as a clean card, so nothing depends on the blur.
 */

export function Glass({
  as: Tag = "div",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: keyof JSX.IntrinsicElements }) {
  return (
    // @ts-expect-error polymorphic tag
    <Tag
      className={cn(
        "border border-white/90 bg-white/60 shadow-glass backdrop-blur-xl backdrop-saturate-150",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Quiet card: translucent white with a hairline, no blur. */
export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-hair-soft bg-white/70", className)} {...rest} />;
}

export function Eyebrow({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "muted" | "cyan" }) {
  const color = { brand: "text-brand-500", muted: "text-ink-muted", cyan: "text-cyan-400" }[tone];
  return <p className={cn("font-mono text-xs uppercase tracking-eyebrow", color)}>{children}</p>;
}

export function SectionTitle({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <h2
      id={id}
      className={cn(
        "font-display text-[clamp(2rem,4.2vw,3.25rem)] font-normal leading-[1.08] tracking-title text-balance text-navy",
        className
      )}
    >
      {children}
    </h2>
  );
}

/* `PillLink` was here and is gone.
 *
 * It was a second button: its own padding, its own radius, its own hover and
 * its own focus ring, duplicating `components/ui/button.tsx` — which already
 * does all of that, plus loading, icon slots and a disabled state it never
 * had. Two button components is how a site ends up with two button shapes.
 *
 * Every call site is `<Button asChild><Link …/></Button>`, which keeps
 * next/link's client-side navigation and avoids the invalid <a>-inside-
 * <button> nesting that `asChild` exists to prevent.
 */

/* ===========================================================================
   The three marks that repeat everywhere in the handoff.

   Pulled out because each appears in at least four places across the two
   reference screens, in markup that is identical apart from the words:

     MonoLabel  — portal nav group headings, the hero spec plate's field
                  names, metric labels, the tracker's phase headings
     BadgePill  — the footer's accreditation row, where the dashed border is
                  the honesty rule rendered as a border-style
     SurfaceCard— the contact card in the portal sidebar, the custody cards,
                  the tracker panel

   Writing them four times each is how the "In Progress" dashed border ends up
   solid in one of the four.
   ========================================================================= */

/** Plex Mono, 10.5px, tracked out. The handoff's label register. */
export function MonoLabel({
  children,
  className,
  as: Tag = "span",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "p" | "dt" | "div";
}) {
  return (
    <Tag
      className={cn(
        "font-mono text-[10.5px] font-normal uppercase tracking-eyebrow text-ink-muted",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * An outlined mono pill. `pending` dashes the border.
 *
 * THE DASH IS THE HONESTY RULE, NOT DECORATION. PCAB accreditation and
 * LegitScript certification are being pursued and not held, and the handoff
 * asks for a dashed border on exactly those two. A solid pill beside four
 * real credentials reads as a fifth credential held — so the label must also
 * still say "In Progress" in words, because a border style carries nothing to
 * a screen reader or a monochrome print.
 */
export function BadgePill({
  children,
  pending,
  className,
}: {
  children: React.ReactNode;
  pending?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-[0.04em] text-ink-soft",
        pending ? "border-dashed border-hair-strong" : "border-solid border-hair-strong",
        className
      )}
    >
      {children}
    </span>
  );
}

/** The quiet surface: hairline, translucent white, 16px radius. */
export function SurfaceCard({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-hair-soft bg-white/70 p-3.5", className)}
      {...rest}
    />
  );
}
