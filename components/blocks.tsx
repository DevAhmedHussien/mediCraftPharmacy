import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Icon, type IconName } from "@/components/icons/set";
import type { Media } from "@/lib/media";
import { cn } from "@/lib/utils";

/* ===========================================================================
   The page-building vocabulary.

   Every interior page is assembled from these, so the whole site shares one
   set of section heads, cards, panels and rails. The CSS lives in
   globals.css; this file is only the markup contract.
   ========================================================================= */

type Tone = "blue" | "cyan" | "navy";

const TONE_ICON: Record<Tone, string> = {
  blue: "card-icon-blue",
  cyan: "card-icon-cyan",
  navy: "card-icon-navy",
};

/* --- Section head -------------------------------------------------------- */

/**
 * Eyebrow, title, lead — the opening of every section.
 *
 * The eyebrow's marker is the mortar's mouth from the logo, drawn by the
 * `.eyebrow::before` rule, which is what ties each section back to the mark.
 */
export function SectionHead({
  eyebrow,
  title,
  lead,
  size = "lg",
  align = "left",
  invert = false,
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  size?: "lg" | "sm";
  align?: "left" | "center";
  invert?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "section-head",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {eyebrow && (
        <p className={cn("eyebrow", invert && "eyebrow-invert")}>{eyebrow}</p>
      )}
      <h2
        className={cn(
          size === "lg" ? "section-title" : "section-title-sm",
          "text-balance",
          invert && "text-white"
        )}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={cn(
            "section-lead text-pretty",
            align === "center" && "mx-auto",
            invert && "text-white/70"
          )}
        >
          {lead}
        </p>
      )}
      {children}
    </div>
  );
}

/* --- Cards --------------------------------------------------------------- */

export function IconCard({
  icon,
  tone = "blue",
  title,
  body,
  credential,
  meta,
  href,
  status,
  className,
}: {
  icon: IconName;
  tone?: Tone;
  title: string;
  body: string;
  /** Mono credential line — a list of qualifications, i.e. data. */
  credential?: string;
  /**
   * Bottom-aligned fact about this card, set in mono — a formulation count, an
   * availability note. Replaces the "Explore →" row a linked card used to
   * carry: the whole card is already the link, and repeating a generic verb on
   * every card in a grid said nothing. A real number does.
   */
  meta?: string;
  href?: string;
  /** e.g. "Coming Soon" — renders the card as a muted placeholder. */
  status?: string;
  className?: string;
}) {
  const inner = (
    <>
      <span className={cn("card-icon", TONE_ICON[tone])}>
        <Icon name={icon} className="h-[1.45rem] w-[1.45rem]" />
      </span>

      {/* Whole-card links get a corner arrow rather than a text CTA. It is the
          standard affordance for a clickable block and costs no vertical space. */}
      {href && (
        <ArrowUpRight
          aria-hidden
          strokeWidth={2}
          className="absolute right-6 top-6 h-5 w-5 text-ink-muted transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-500"
        />
      )}

      <h3 className="card-title text-balance">{title}</h3>
      <p className="card-body text-pretty">{body}</p>
      {credential && <p className="card-credential">{credential}</p>}

      {/* `mt-auto` pins these to the bottom edge, so a row of cards with bodies
          of different lengths still lines its footers up. */}
      {meta && <p className="card-meta">{meta}</p>}
      {status && (
        <p className="card-meta font-semibold text-cyan-700">{status}</p>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "card card-hover group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          className
        )}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className={cn("card", status ? "border-dashed opacity-80" : "card-hover", className)}
    >
      {inner}
    </div>
  );
}

/** Responsive card grid — `cols` is the count at the widest breakpoint. */
export function CardGrid({
  cols = 3,
  children,
  className,
}: {
  cols?: 2 | 3 | 4;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-6",
        cols === 2 && "md:grid-cols-2",
        cols === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        cols === 4 && "sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}


/* --- Photography ---------------------------------------------------------- */

/**
 * The site's single photographic frame.
 *
 * Every still is served through `next/Image` with explicit `sizes`, so each one
 * arrives as a responsive AVIF/WebP srcset rather than the full 1800px JPEG.
 * `ratio` sets the crop; `scrim` darkens the lower edge for type laid over it;
 * `caption` is set in the mono reserved for document metadata.
 */
export function Figure({
  media,
  ratio = "4/3",
  scrim = false,
  caption,
  priority = false,
  zoom = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  className,
  children,
}: {
  media: Media;
  ratio?: "4/3" | "3/2" | "16/9" | "1/1" | "4/5";
  scrim?: boolean;
  caption?: string;
  priority?: boolean;
  zoom?: boolean;
  sizes?: string;
  className?: string;
  children?: ReactNode;
}) {
  const RATIO: Record<string, string> = {
    "4/3": "aspect-[4/3]",
    "3/2": "aspect-[3/2]",
    "16/9": "aspect-[16/9]",
    "1/1": "aspect-square",
    "4/5": "aspect-[4/5]",
  };

  return (
    <figure
      className={cn(
        "figure",
        RATIO[ratio],
        zoom && "figure-zoom",
        (scrim || caption) && "figure-scrim",
        className
      )}
    >
      <Image
        src={media.src}
        alt={media.alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
      />
      {caption && (
        <figcaption className="figure-caption z-10">
          <span aria-hidden className="h-[4px] w-[15px] rounded-full bg-cyan-400" />
          {caption}
        </figcaption>
      )}
      {children}
    </figure>
  );
}

/* --- Navy panel ---------------------------------------------------------- */

export function NavyPanel({
  badge,
  title,
  children,
  className,
}: {
  badge?: string;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel-navy", className)}>
      {badge && <p className="panel-badge">{badge}</p>}
      {title && <h3 className="panel-title text-balance">{title}</h3>}
      {children}
    </div>
  );
}

export function PanelMetrics({
  items,
  cols = 2,
  className,
}: {
  items: { value: string; label: string }[];
  cols?: 2 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-7 grid gap-3",
        cols === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {items.map((m) => (
        <div key={m.label} className="metric">
          <span className="metric-value">{m.value}</span>
          <span className="metric-label">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

/* --- Spec rail ----------------------------------------------------------- */

/**
 * The signature data treatment: a monospaced mark, a hairline, and a
 * plain-language explanation. Used wherever the content is a regulatory fact
 * rather than prose — USP chapters, accreditation status, test methods.
 */
export function SpecRail({
  items,
  invert = false,
  className,
}: {
  items: { mark: string; title: string; body: string }[];
  invert?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      {items.map((item) => (
        <div key={item.title} className={cn("spec", invert && "spec-invert")}>
          <span className="spec-mark">{item.mark}</span>
          <div>
            <p className="spec-title text-balance">{item.title}</p>
            <p className="spec-body text-pretty">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* --- Lists --------------------------------------------------------------- */

export function CheckList({
  items,
  invert = false,
  className,
}: {
  items: string[];
  invert?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "check-list",
        invert && "check-list-invert",
        className
      )}
    >
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/* --- Timeline ------------------------------------------------------------ */

/** Chronological only — the year is the label because order is the content. */
export function Timeline({
  items,
  className,
}: {
  items: { year: string; title: string; body: string }[];
  className?: string;
}) {
  return (
    <ol className={cn("timeline", className)}>
      {items.map((item, i) => (
        <li key={`${item.year}-${i}`} className="timeline-item">
          <span className="timeline-year">{item.year}</span>
          <h3 className="timeline-title text-balance">{item.title}</h3>
          <p className="text-meta text-ink-soft text-pretty">{item.body}</p>
        </li>
      ))}
    </ol>
  );
}

/* --- Sequences ----------------------------------------------------------
   `Steps` and `ProcessGrid` used to live here. Every ordered sequence on the
   site now renders through `components/motion/StickyStack`, which pins each
   step as you scroll — the stack itself carries the order, which a static grid
   never did. Nothing is left behind for a future page to reach for by mistake.
   --------------------------------------------------------------------- */

/* --- Callout ------------------------------------------------------------- */

export function Callout({
  label,
  icon,
  children,
  tone = "blue",
  className,
}: {
  label?: string;
  icon?: IconName;
  children: ReactNode;
  tone?: "blue" | "cyan";
  className?: string;
}) {
  const body = (
    <>
      {label && <strong className="font-bold text-ink">{label} </strong>}
      {children}
    </>
  );

  return (
    <div className={cn(tone === "cyan" ? "callout-cyan" : "callout", className)}>
      {icon ? (
        <div className="flex items-start gap-4">
          <Icon
            name={icon}
            className={cn(
              "mt-0.5 h-6 w-6",
              tone === "cyan" ? "text-cyan-700" : "text-brand-600"
            )}
          />
          <p>{body}</p>
        </div>
      ) : (
        body
      )}
    </div>
  );
}

/* --- FAQ ----------------------------------------------------------------- */

/**
 * Accordion built on native `<details>` / `<summary>`.
 *
 * No client component and no JavaScript: the browser supplies the disclosure
 * behaviour, keyboard handling and screen-reader semantics, and every answer
 * is present in the server-rendered HTML — which also means search engines and
 * a reader with JS disabled both get the full content.
 */
export function Faq({
  items,
  className,
}: {
  items: { q: string; a: string }[];
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-meta font-bold text-ink transition-colors hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <span className="text-pretty">{item.q}</span>
            {/* One glyph rotated, so open/closed cannot fall out of sync. */}
            <span
              aria-hidden
              className="shrink-0 text-xl font-normal leading-none text-cyan-600 transition-transform duration-200 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="pb-6 pr-10 text-meta text-ink-soft text-pretty">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

/* --- Closing CTA --------------------------------------------------------- */

export function ClosingCta({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <section className="hero section">
      <div className="container-x text-center">
        <h2 className="mx-auto max-w-3xl text-display-md font-black text-white text-balance md:text-display-lg">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-intro text-white/70 text-pretty">{body}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href={primary.href} className="btn-accent btn-lg">
            {primary.label} <span aria-hidden>→</span>
          </Link>
          {secondary && (
            <Link href={secondary.href} className="btn-outline-invert btn-lg">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/* --- Page masthead ------------------------------------------------------- */

/**
 * Interior page header. A short navy band rather than a cover photo: the stock
 * imagery the previous design used varied so much in brightness that the type
 * needed a heavy scrim on every page, which read as a template. A flat brand
 * gradient is quieter, loads nothing, and lets the mark's cyan do the accent
 * work.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  media,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  /** Optional background still, laid under the navy scrim. */
  media?: Media;
  children?: ReactNode;
}) {
  return (
    <section className="hero pb-14 pt-12 md:pb-20 md:pt-16">
      {/* A still rather than a cover photo with type stacked under it: the
          image sits behind a navy scrim so the heading holds full contrast
          whatever the photograph's exposure. */}
      {media && (
        <>
          <div data-layer className="absolute inset-0 -z-10">
            <Image
              src={media.src}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-30"
            />
          </div>
          <div
            data-layer
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/90 to-navy/55"
          />
        </>
      )}

      <div className="container-x">
        <div className="max-w-3xl">
          {eyebrow && <p className="eyebrow eyebrow-invert">{eyebrow}</p>}
          <h1 className="mt-4 text-display-md font-black text-white text-balance md:text-display-lg">
            {title}
          </h1>
          {lead && (
            <p className="mt-5 text-intro text-white/70 text-pretty">{lead}</p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}

/* --- Two-column text + panel -------------------------------------------- */

/** The workhorse interior layout: prose on one side, a panel on the other. */
export function TwoCol({
  children,
  reverse = false,
  className,
}: {
  children: ReactNode;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid items-start gap-10 lg:grid-cols-2 lg:gap-14",
        reverse && "lg:[&>*:first-child]:order-2",
        className
      )}
    >
      {children}
    </div>
  );
}
