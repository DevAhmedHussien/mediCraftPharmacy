"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Icon, type IconName } from "@/components/icons/set";
import type { Media } from "@/lib/media";

export type StickyStep = {
  title: string;
  body: string;
  icon?: IconName;
};

/* ===========================================================================
   Sticky card stack.

   Cards pin one after another and stack up as you scroll, each new card sliding
   over the last. It is used for genuinely ordered content only — the four
   fulfilment checkpoints, the four raw-material gates — because the stack
   *is* the sequence: you cannot reach card three without passing card two,
   which is exactly the claim the copy makes about the process.

   Mechanics: each card sits in its own full-height scroll section with
   `position: sticky`, so the browser does the pinning. The only JavaScript is
   the scale/opacity of a card as the next one covers it, which is what stops
   the pile from looking like a flat overlap. With reduced motion requested the
   whole thing renders as a plain vertical list — no pinning, no transforms.
   ========================================================================= */

export function StickyStack({
  steps,
  image,
  eyebrow,
}: {
  steps: StickyStep[];
  /** Optional still shown alongside the stack on wide screens. */
  image?: Media;
  eyebrow?: string;
}) {
  const reduce = useReducedMotion();

  // Reduced motion, or no JS: a plain ordered list. Same content, same order.
  if (reduce) {
    return (
      <ol className="space-y-5">
        {steps.map((step, i) => (
          <li key={step.title} className="card">
            <StepBody step={step} index={i} total={steps.length} />
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
      {/* The still stays put while the cards move past it. */}
      {image && (
        <div className="hidden lg:block">
          <div className="sticky top-40">
            {eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>}
            <div className="relative aspect-[4/5] overflow-hidden rounded-panel border border-line">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/45 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      )}

      <ol className="relative">
        {steps.map((step, i) => (
          <StickyCard key={step.title} index={i} total={steps.length} step={step} />
        ))}
      </ol>
    </div>
  );
}

function StickyCard({
  step,
  index,
  total,
}: {
  step: StickyStep;
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLLIElement>(null);

  // Progress of this card through its own pinned range.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 22%", "end 22%"],
  });

  // As the next card arrives, this one settles back a touch and dims. The
  // amounts are small on purpose — enough to read as depth, not as a card
  // being thrown away.
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.955]);
  const opacity = useTransform(scrollYProgress, [0, 0.75, 1], [1, 1, 0.45]);

  return (
    <li
      ref={ref}
      className="sticky"
      style={{
        // Each card pins slightly lower than the last, so the stack's top
        // edges fan out and you can still see what is underneath.
        top: `calc(9rem + ${index * 0.75}rem)`,
        // Later cards paint over earlier ones.
        zIndex: index + 1,
        // Leaves scroll distance for each card to be read while pinned.
        marginBottom: index === total - 1 ? 0 : "2rem",
        paddingBottom: index === total - 1 ? 0 : "3rem",
      }}
    >
      <motion.div
        style={{ scale, opacity }}
        className="rounded-panel border border-line bg-white p-7 shadow-lift md:p-9"
      >
        <StepBody step={step} index={index} total={total} />
      </motion.div>
    </li>
  );
}

function StepBody({
  step,
  index,
  total,
}: {
  step: StickyStep;
  index: number;
  total: number;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-[0.7rem] bg-brand-500 text-white">
          {step.icon ? (
            <Icon name={step.icon} className="h-[1.3rem] w-[1.3rem]" />
          ) : (
            <span className="text-meta font-black">{index + 1}</span>
          )}
        </span>

        {/* Position in the sequence, as data — this is a numbered process. */}
        <span className="font-mono text-caption font-medium uppercase tracking-wider text-ink-muted">
          Step {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>

      <h3 className="mt-5 text-[1.25rem] font-black text-brand-600 text-balance">
        {step.title}
      </h3>
      <p className="mt-2.5 text-meta text-ink-soft text-pretty">{step.body}</p>
    </>
  );
}
