import Link from "next/link";
import { Check, Lock } from "lucide-react";

import { stepPosition, stepStates } from "@/lib/partner/steps";
import type { PartnerStatus } from "@/lib/partner/status";
import { cn } from "@/lib/utils";

/* ===========================================================================
   Where the applicant is, and what is still locked.

   A HORIZONTAL RAIL, NOT A GRID. It was an eight-column grid, which meant
   adding the documents step silently produced a ninth cell that wrapped under
   the first — the connecting line ran off the end of one row and the process
   looked broken at exactly the moment it got longer.

   THE STEPS SHARE THE WIDTH RATHER THAN CLAIMING A MINIMUM. The first version
   of the rail gave each step 8.5rem, which at nine steps is 76rem inside a
   52rem column: it scrolled, and the step the applicant was actually ON sat
   off the right-hand edge where nobody would find it. Nine steps fit only if
   nine steps are sized to fit, so the blurb is carried by the current step
   alone and the rest are a label under a dot.

   Locked steps are shown rather than hidden on purpose: the applicant's first
   question is "what does this involve", and a list that grows as you go never
   answers it.
   ========================================================================= */

export function StepTracker({ status }: { status: PartnerStatus }) {
  const steps = stepStates(status);
  const { current, total } = stepPosition(status);

  return (
    <nav aria-label="Your progress">
      <div className="flex items-baseline justify-between gap-4">
        <p className="eyebrow">Your progress</p>
        <p className="text-caption font-medium tabular-nums text-ink-muted">
          Step {current} of {total}
        </p>
      </div>

      {/* Scrolls rather than wraps. The gradient masks at either edge are the
          affordance that says there is more — a hard cut reads as a bug. */}
      <ol className="mt-4 flex gap-0 overflow-x-auto pb-1 sm:overflow-x-visible">
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          const reachable = step.href && step.state !== "locked";

          const body = (
            <>
              <span className="flex items-center">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-bold transition-colors",
                    step.state === "complete" && "border-brand-500 bg-brand-500 text-white",
                    step.state === "current" &&
                      "border-brand-500 bg-white text-brand-600 ring-4 ring-brand-500/15",
                    step.state === "locked" && "border-line bg-white text-ink-muted"
                  )}
                >
                  {step.state === "complete" ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : step.state === "locked" ? (
                    <Lock className="size-2.5" strokeWidth={2.5} />
                  ) : (
                    index + 1
                  )}
                </span>

                {!last && (
                  <span
                    aria-hidden
                    className={cn(
                      "h-px w-full min-w-3 flex-1",
                      step.state === "complete" ? "bg-brand-500" : "bg-line"
                    )}
                  />
                )}
              </span>

              <span className="mt-2.5 block pr-3">
                <span
                  className={cn(
                    "block text-[0.6875rem] font-bold leading-tight",
                    step.state === "locked" ? "text-ink-muted" : "text-ink",
                    step.state === "current" && "text-brand-700"
                  )}
                >
                  {step.label}
                </span>

                {/* Only the current step explains itself. Nine blurbs is nine
                    lines of text nobody reads to find the one that applies. */}
                {step.state === "current" && (
                  <span className="mt-0.5 block text-[0.6875rem] leading-tight text-ink-muted">
                    {step.blurb}
                  </span>
                )}
              </span>
            </>
          );

          return (
            <li
              key={step.id}
              aria-current={step.state === "current" ? "step" : undefined}
              className="min-w-[6.5rem] flex-1 sm:min-w-0"
            >
              {reachable ? (
                <Link
                  href={step.href!}
                  className="group block rounded-[0.4rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {body}
                </Link>
              ) : (
                <span className="block">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
