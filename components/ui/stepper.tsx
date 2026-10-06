import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ===========================================================================
   One stepper for the partner portal and the admin pipeline.

   Three components were drawing the same row — a dot, a label, a state tag —
   in three ways: `StepTracker` in the portal, `PipelineRail` and
   `StatusTimeline` in admin. They disagreed about what "current" looks like,
   and only one of them announced the state to a screen reader.

   THE STATE IS NEVER COLOUR ALONE. Every row carries a word — Done, Now,
   With us, Locked — because a dot that is navy rather than blue tells a
   colour-blind reader nothing, and tells a screen reader less than that.
   `aria-current="step"` marks the live row so assistive tech can jump to it.

   `waiting` is a separate flag rather than a fifth state: a step can be the
   current one AND be waiting on the pharmacy, which is the single most
   common question a partner has ("is anyone acting on this?"). Folding it
   into `state` would make that un-expressible.
   ========================================================================= */

export type StepState = "complete" | "current" | "locked";

export function Stepper({ children, className }: { children: ReactNode; className?: string }) {
  return <ol className={cn("flex flex-col gap-0.5", className)}>{children}</ol>;
}

export function StepperItem({
  state,
  number,
  label,
  blurb,
  waiting,
  className,
}: {
  state: StepState;
  /** Shown while incomplete; replaced by a tick once done. */
  number: number;
  label: string;
  blurb?: string;
  /** Current, but the ball is in our court. */
  waiting?: boolean;
  className?: string;
}) {
  const tag =
    state === "complete" ? "Done" : state === "current" ? (waiting ? "With us" : "Now") : null;

  return (
    <li
      aria-current={state === "current" ? "step" : undefined}
      className={cn(
        "grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-2.5",
        state === "current" && "bg-tint",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-[22px] place-items-center rounded-full font-mono text-[10.5px]",
          state === "complete" && "bg-navy text-white",
          state === "current" && "bg-brand-500 text-white",
          state === "locked" && "border border-hair-strong bg-white text-ink-muted"
        )}
      >
        {state === "complete" ? "✓" : number}
      </span>

      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "text-[14.5px]",
            state === "current" && "font-medium",
            state === "locked" ? "text-ink-muted" : "text-navy"
          )}
        >
          {label}
        </span>
        {blurb && <span className="text-[12.5px] text-ink-muted">{blurb}</span>}
      </span>

      <span
        className={cn(
          "font-mono text-[10.5px] uppercase tracking-[0.06em]",
          waiting ? "text-success-fg" : "text-brand-500"
        )}
      >
        {tag}
        {/* Locked carries no visible tag — the outlined dot and the muted
            label already say it, and a column of LOCKED tags down a list is
            noise. It is still announced. */}
        {state === "locked" && <span className="sr-only">Locked</span>}
      </span>
    </li>
  );
}
