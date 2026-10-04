"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ===========================================================================
   Motion primitives.

   ONE MOMENT, NOT SIXTY.
   ----------------------
   Every section of every page used to rise 22px into view as it was scrolled
   past — `Reveal` alone was called in fifty-nine places, plus `Stagger` on
   five card grids and `FadeIn` on seven blocks of the home page. Each one was
   defensible; together they meant nothing on the site was ever simply there.
   Reading a page of regulatory prose became a sequence of things arriving,
   and a visitor scrolling back up found the page had already played.

   Scroll-triggered fade-ups on every section are also the most recognisable
   tell of a template. A pharmacy asking prescribers to trust its documentation
   is the last site that should read as one.

   So `FadeIn`, `Stagger` and `StaggerItem` now render exactly what they
   already rendered under `prefers-reduced-motion`: the element, visible,
   where it is. The components are kept rather than deleted from sixty call
   sites — they are the seam where a motion decision is made, and a future
   change belongs here rather than in sixty files.

   WHAT STILL MOVES
   ----------------
   `RevealWords`, on the home page headline, once per visit. That is the one
   orchestrated moment the site allows itself, and it lands because nothing
   else competes with it. Everything else that moves is answering a click —
   a menu opening, a dialog, a form confirming — which is motion showing
   somebody what just changed rather than decorating a scroll.
   ========================================================================= */

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A section, where it is.
 *
 * Keeps `delay` in its signature because around sixty call sites pass it. It
 * is ignored — there is nothing left to delay — and a prop that does nothing
 * is cheaper than editing sixty files to drop it.
 */
export function FadeIn({
  children,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

/** A grid, where it is. */
export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

/** A card in that grid, where it is. */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

/**
 * A heading that arrives a word at a time.
 *
 * Used once per page at most, on the section that matters. Splitting on spaces
 * keeps whole words intact, so the line still wraps correctly and a screen
 * reader still receives one continuous string — the spans are presentational.
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
    <motion.span
      /*
       * `inline`, not `inline-block`.
       *
       * As an inline-block this wrapper was an atomic box for line-breaking:
       * a phrase that did not fit in the remaining space moved to the next line
       * whole, instead of letting its first word finish the current one. In the
       * hero that stranded "Not" on a line of its own — "Crafted," / "Not" /
       * "Manufactured." — on every screen under about 640px.
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
        <motion.span
          key={`${word}-${i}`}
          aria-hidden
          className="inline-block"
          variants={{
            hidden: { opacity: 0, y: "0.4em" },
            shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
          }}
        >
          {word}
          {i < words.length - 1 && " "}
        </motion.span>
      ))}
    </motion.span>
  );
}
