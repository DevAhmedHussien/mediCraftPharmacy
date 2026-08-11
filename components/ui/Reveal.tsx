"use client";

import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/Motion";

/**
 * Scroll-triggered fade-up.
 *
 * Now a thin alias over `FadeIn` in components/motion/Motion. The two had
 * identical behaviour — same easing, same distance, same reduced-motion escape
 * hatch — and keeping two implementations of one animation meant a change to
 * the site's motion would have to be made twice and could drift.
 *
 * `FadeIn` is the one to reach for in new code; this alias exists because it is
 * called in fifty-nine places and renaming those buys nothing.
 *
 * Both escape hatches still hold:
 *   · reduced motion renders a plain, visible element with no scroll trigger
 *   · without JavaScript the server markup carries inline `opacity:0`, and the
 *     `<noscript>` stylesheet in the layout forces `[data-reveal]` visible
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <FadeIn delay={delay} className={className}>
      {children}
    </FadeIn>
  );
}
