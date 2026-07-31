"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
};

/**
 * Scroll-triggered fade-up.
 *
 * Two escape hatches keep the content from ever depending on the animation:
 *
 * - Reduced motion: skips `motion` altogether and renders a plain, visible
 *   element. Softening the animation is not enough here — the content must not
 *   be gated behind a scroll trigger at all.
 * - No JavaScript: the server-rendered markup carries inline `opacity:0`, so
 *   the `<noscript>` stylesheet in the layout targets `[data-reveal]` and
 *   forces it visible.
 */
export function Reveal({ children, delay = 0, y = 28, className }: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
