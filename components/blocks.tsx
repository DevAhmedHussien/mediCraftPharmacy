import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Icon, type IconName } from "@/components/icons/set";
import type { Media } from "@/lib/media";
import { PageHeader, PageHeaderImage } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

/* ===========================================================================
   The page-building vocabulary.

   Every interior page is assembled from these, so the whole site shares one
   set of section heads, cards, panels and rails. The CSS lives in
   globals.css; this file is only the markup contract.
   ========================================================================= */

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

export function InfoCard({
  title,
  body,
  credential,
  meta,
  href,
  status,
  media,
  headingLevel = 3,
  className,
}: {
  /**
   * Where this card sits in the page's outline.
   *
   * `h3` is right when the grid follows a `SectionHead` — which is most
   * places. On /providers the benefit cards are the first content under the
   * h1 with no section heading above them, and an h3 there took the outline
   * from level 1 to level 3: a screen reader announces a subsection of
   * something that was never announced.
   */
  headingLevel?: 2 | 3;
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
  /**
   * Optional image bled to the card's top edge. Its ratio comes from the
   * asset's own width/height, so 4:3 and 16:10 sets both lay out without a
   * per-page prop.
   */
  media?: Media;
  className?: string;
}) {
  const inner = (
    <>
      {media && (
        <div
          className="relative -mx-7 -mt-7 mb-6 overflow-hidden bg-sand"
          style={{ aspectRatio: `${media.width} / ${media.height}` }}
        >
          <Image
            src={media.src}
            alt={media.alt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      )}

      {/* Whole-card links get a corner arrow rather than a text CTA. It is the
          standard affordance for a clickable block and costs no vertical space. */}
      {href && (
        <ArrowUpRight
          aria-hidden
          strokeWidth={2}
          className={cn(
            // Moves a fraction on hover; does not change colour. One signal is
            // enough, and a recolouring arrow on every card in a grid is noise.
            "absolute right-6 top-6 z-10 h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5",
            media ? "text-white/80" : "text-ink-muted"
          )}
        />
      )}

      {headingLevel === 2 ? (
        <h2 className="card-title text-balance">{title}</h2>
      ) : (
        <h3 className="card-title text-balance">{title}</h3>
      )}
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
      /* A dashed border marks the "not yet" card, not 80% opacity.
         
         `opacity-80` multiplies down everything inside it, which took the
         cyan-700 meta line — a value chosen precisely because it clears
         4.5:1 on white — below the threshold on /support. The dashed rule
         says the same thing and says it to everyone. */
      className={cn("card", status ? "border-dashed" : "card-hover", className)}
    >
      {inner}
    </div>
  );
}

/**
 * Kept as an alias while the content objects still carry an `icon` key.
 * @deprecated Use `InfoCard` — the icon plate is gone.
 */
export const IconCard = InfoCard;

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
      {/* `h2`, not `h3`.
      
          This panel is a top-level section on the pages that use it, and on
          /about and /providers it is the FIRST heading after the h1 — so an
          h3 took the outline straight from level 1 to level 3. A screen
          reader navigating by heading hears a subsection of something that
          was never announced. Where a NavyPanel sits inside a section that
          already has an h2, two h2s in sequence is not a skip and reads
          correctly. */}
      {title && <h2 className="panel-title text-balance">{title}</h2>}
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
   `Steps`, `ProcessGrid` and `StickyStack` all used to serve this. Ordered
   sequences now render as plain cards — `NumberedSteps` where the numbering
   carries meaning, `CardsBesideFigure` where a picture belongs alongside.

   The pinned stack is gone on purpose: it spent a screenful of scroll per card
   and made a four-step process impossible to take in at once. Nothing is left
   behind for a future page to reach for by mistake.
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
    /* The handoff's closing panel: a rounded card on the paper ground, white
       falling to #f1f3f8, rather than a full-bleed sand band with a rule
       above it. The band was the last piece of the alternating-stripe rhythm
       the redesign removes. */
    <section className="section">
      <div className="mx-auto w-full max-w-[1120px] px-5">
        <div className="flex flex-col items-center gap-5 rounded-hero border border-hair-soft bg-gradient-to-b from-white to-[#f1f3f8] px-6 py-[clamp(2.5rem,6vw,5.5rem)] text-center">
        <h2 className="mx-auto max-w-3xl font-display text-[clamp(2.1rem,4.6vw,3.6rem)] font-normal leading-[1.06] tracking-display text-navy text-balance">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-intro text-ink-soft text-pretty">{body}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {/* No appended arrow. "Open a Provider Account →" is the glyph
              doing nothing the verb has not already done, and it is on every
              generated page on the internet. The button is a button. */}
          <Link
            href={primary.href}
            className="inline-flex items-center rounded-full bg-navy px-6 py-[15px] text-[15px] font-medium text-white transition-colors duration-200 hover:bg-brand-500 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {primary.label}
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className="inline-flex items-center rounded-full border border-hair bg-white/70 px-6 py-[15px] text-[15px] font-medium text-navy transition-colors duration-200 hover:bg-white motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {secondary.label}
            </Link>
          )}
        </div>
        </div>
      </div>
    </section>
  );
}

/* --- Page masthead ------------------------------------------------------- */

/**
 * The interior masthead, now a thin wrapper over the shared PageHeader.
 *
 * Fifteen files import `PageHero`, so the name stays and the shape changes
 * underneath them: the references stack the copy at the full 1120px measure
 * and give the image its own full-width section below, rather than splitting
 * the row 7/5. Splitting halved the measure of both.
 *
 * `media` still works and renders through `PageHeaderImage`, so no call site
 * had to change — but a page wanting the reference's glass specification
 * plate should use `PageHeader` + `PageHeaderImage` directly.
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
  media?: Media;
  children?: ReactNode;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} lead={lead}>
        {children}
      </PageHeader>
      {media && <PageHeaderImage src={media.src} alt={media.alt} />}
    </>
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
