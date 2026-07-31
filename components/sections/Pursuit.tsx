"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** Rotating phrases — mirrors the reference site's "pursuing better" section. */
const WORDS = [
  "Live well",
  "Refine prescribing",
  "Feel supported",
  "Wait less",
  "Experience more",
];

/**
 * Kinetic type moment: one blue subhead and a single oversized phrase that
 * cycles. Set on the grey band in near-black rather than a saturated fill —
 * the scale of the type is the whole effect. Falls back to a static phrase
 * when reduced motion is requested.
 */
export function Pursuit() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 2400);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <section className="band py-24 md:py-32">
      <div className="container-x text-center">
        <p className="eyebrow">We&rsquo;re pursuing better to help others</p>

        <div className="mt-3 h-[1.15em] overflow-hidden text-display-lg font-semibold text-ink md:text-display-2xl">
          {reduce ? (
            <span>{WORDS[0]}</span>
          ) : (
            <AnimatePresence mode="wait">
              <motion.span
                key={index}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="block"
              >
                {WORDS[index]}
              </motion.span>
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  );
}
