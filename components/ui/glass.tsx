import Link from "next/link";

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

export function PillLink({
  href,
  variant = "solid",
  children,
}: {
  href: string;
  variant?: "solid" | "ghost" | "light";
  children: React.ReactNode;
}) {
  const styles = {
    solid: "bg-navy text-white hover:bg-brand-500",
    ghost: "border border-hair bg-white/70 text-navy hover:bg-white",
    light: "bg-white text-navy hover:bg-brand-50",
  }[variant];
  /* next/link for internal hrefs, a plain anchor for tel:/mailto:/external.
     The handoff wrote this as a bare <a>, which works but drops client-side
     navigation on every CTA — the whole marketing site would do a full
     document load on "Open an account". `Link` on a tel: href is the mirror
     mistake: it tries to route it. */
  const className = cn(
    "inline-flex items-center rounded-full px-6 py-[15px] text-[15px] font-medium transition-colors duration-200",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
    "motion-reduce:transition-none",
    styles
  );

  if (!href.startsWith("/")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
