"use client";

import type { ReactNode } from "react";
import { LazyMotion, domAnimation } from "framer-motion";

/**
 * The animation engine, loaded once and only as much of it as we use.
 *
 * `domAnimation` is the feature bundle covering transforms, opacity, variants
 * and gestures — everything the marketing pages animate. It deliberately
 * excludes layout animation and the full drag/path features, which is most of
 * the library's weight and none of its use here.
 *
 * `strict` makes the `motion.*` namespace throw if anyone imports it. That is
 * the point of the provider: with `strict` on, a component that reaches for
 * `motion.div` instead of `m.div` fails loudly in development rather than
 * quietly pulling the full bundle into a route that was paying for the small
 * one. The budget for this work was 8 kB, and a single stray import is 30.
 *
 * `framer-motion`, not the `motion` package. They are the same library under
 * two names — `motion` is the rename — and this repo already depends on
 * framer-motion@11, which exports an identical `LazyMotion`/`domAnimation`/`m`
 * API. Adding the other name would ship a second copy of the animation engine
 * to every route that touches either.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
