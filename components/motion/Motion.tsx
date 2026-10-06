"use client";

import { type ElementType, type ReactNode } from "react";
import { m, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ===========================================================================
   Motion leaves.

   `m`, NEVER `motion`. The provider in app/(site)/layout.tsx runs LazyMotion
   in `strict` mode, which makes the `motion.*` namespace throw on import —
   deliberately, because one stray `motion.div` pulls the full engine into a
   route that was paying for the small one.

   THESE ARE LEAVES, NOT PAGES. Every one takes `children` and renders them.
   The page stays a Server Component and passes already-rendered markup in,
   so the heading, the paragraph and the product name are in the HTML the
   server returns whether or not any of this executes.

   RESTRAINT IS THE POINT, and it is enforced by where these are used rather
   than by what they do. Above the fold nothing moves. Ruled rows, footer
   columns and single blocks use the CSS `.reveal` utility in globals.css,
   which ships no JavaScript at all. These components are for the handful of
   places that need a real stagger — a grid whose cards should arrive in
   order — because that is the one thing `animation-timeline: view()` cannot
   express as cleanly.

   THREE WAYS CONTENT STAYS VISIBLE:
     · `prefers-reduced-motion` → `initial={false}`, so the element mounts in
       its final state and no scroll trigger is registered
     · no JavaScript → the server writes inline `opacity:0`, and the
       `<noscript>` stylesheet in app/layout.tsx forces `[data-reveal]`
       visible and untransformed
     · the animation failing to trigger → `once: true` with a negative
       root margin fires well before the element is fully on screen
   ========================================================================= */

/** Same curve as the CSS layer, so nothing arrives on two different eases. */
const EASE = [0.22, 1, 0.36, 1] as const;

export function FadeIn({
  children,
  delay = 0,
  y = 24,
  as = "div",
  className,
}: {
  children: ReactNode;
  delay?: number;
  /** Travel in px. 12 for anything sitting on an image. */
  y?: number;
  as?: ElementType;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const Tag = m[as as keyof typeof m] as ElementType;

  return (
    <Tag
      data-reveal=""
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

/** The canonical name. `FadeIn` is what sixty existing call sites import. */
export const Reveal = FadeIn;

/**
 * A grid whose children arrive in order.
 *
 * SIX AT MOST. Past six the last card is still waiting while the first has
 * long finished, and the sequence stops reading as one gesture and starts
 * reading as a queue. Split a larger grid into two groups.
 */
export function Stagger({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const reduce = useReducedMotion();
  const Tag = m[as as keyof typeof m] as ElementType;

  return (
    <Tag
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const Tag = m[as as keyof typeof m] as ElementType;

  return (
    <Tag
      data-reveal=""
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * A heading that arrives a word at a time.
 *
 * Used once per page at most, on the section that matters. Splitting on
 * spaces keeps whole words intact, so the line still wraps correctly and a
 * screen reader still receives one continuous string — the spans are
 * presentational and `aria-label` carries the real text.
 */
export function RevealWords({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;

  const words = text.split(" ");

  return (
    <m.span
      /*
       * `inline`, not `inline-block`.
       *
       * As an inline-block this wrapper was an atomic box for line-breaking:
       * a phrase that did not fit in the remaining space moved to the next
       * line whole, instead of letting its first word finish the current one.
       * In the hero that stranded "Not" on a line of its own — "Crafted," /
       * "Not" / "Manufactured." — on every screen under about 640px.
       *
       * Only the individual word spans below need to be inline-block, because
       * only they carry the y-transform. The wrapper just scopes the stagger.
       */
      className={cn("inline", className)}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.045 } } }}
      aria-label={text}
    >
      {words.map((word, i) => (
        <m.span
          key={`${word}-${i}`}
          aria-hidden
          data-reveal=""
          className="inline-block"
          variants={{
            hidden: { opacity: 0, y: "0.4em" },
            shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
          }}
        >
          {word}
          {i < words.length - 1 && " "}
        </m.span>
      ))}
    </m.span>
  );
}
