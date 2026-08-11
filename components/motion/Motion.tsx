"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

/* ===========================================================================
   Motion primitives.

   One easing curve and one distance across the whole site, so scroll reveals
   read as a single system rather than a pile of effects. Every component here
   returns plain, visible markup when reduced motion is requested — the content
   is never gated behind an animation.
   ========================================================================= */

const EASE = [0.22, 1, 0.36, 1] as const;
const DISTANCE = 22;

/** A single element that rises into view once. */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y: DISTANCE }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const parentVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const childVariants: Variants = {
  hidden: { opacity: 0, y: DISTANCE },
  shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/**
 * Staggers its direct children into view.
 *
 * Wrap a grid in `<Stagger>` and each `<StaggerItem>` inside it arrives a beat
 * after the last. The delay is deliberately short — 70ms — because a long
 * stagger on a 6-card grid makes the last card feel broken rather than
 * choreographed.
 */
export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={parentVariants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div data-reveal="" className={className} variants={childVariants}>
      {children}
    </motion.div>
  );
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
      className={cn("inline-block", className)}
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
