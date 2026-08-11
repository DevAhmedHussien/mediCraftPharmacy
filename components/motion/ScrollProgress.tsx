"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Reading progress for the long pages.
 *
 * /quality runs to roughly nine screens of regulatory detail, and a reader
 * working through it has no idea how much is left. This is the one piece of
 * chrome that tells them.
 *
 * `useScroll` reads the document's own progress, and the spring keeps the bar
 * from jittering on trackpads that report scroll in small bursts. It is
 * `aria-hidden` and carries no role: it duplicates information the scrollbar
 * already conveys, so announcing it would be noise. Hidden entirely under
 * reduced motion — a bar that tracks the scroll position is motion by
 * definition, and nothing depends on it.
 */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 40,
    restDelta: 0.001,
  });

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-cyan-400"
    />
  );
}
