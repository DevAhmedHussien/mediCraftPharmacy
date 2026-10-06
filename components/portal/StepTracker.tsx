import Link from "next/link";
import { Check, Lock } from "lucide-react";

import { isWaitingOnUs, stepPosition, stepStates, type Step, type StepState } from "@/lib/partner/steps";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";
import { cn } from "@/lib/utils";

/* ===========================================================================
   Where the applicant is, as three phase cards.

   WHAT THIS REPLACES
   ------------------
   A nine-dot rail. Nine steps sized to fit a 52rem column left each one with
   an 11px label under a 24px dot and no room for anything else, so only the
   current step could afford a line of explanation and the other eight were
   bare words. On a phone it scrolled sideways, which put the step the
   applicant was actually ON off the right-hand edge about half the time.

   It was also the only thing in the portal still drawn in the MARKETING
   palette — `border-line`, `text-ink`, `.eyebrow` — inside a PortalShell
   panel built from the console variables. Two type scales and two greys, in
   one card.

   WHY THREE CARDS AND NOT NINE
   ----------------------------
   Nine cards is a wall; three is a glance. The phases already exist in the
   data — `Step.phase`, which until now only the public "how this works" page
   read — so grouping costs nothing and invents nothing. Every one of the
   nine steps is still on screen, as a row inside its phase, which is what
   the dot rail could not do: show the whole journey AND say what each part
   of it involves.

   THE STATE THE OLD RAIL COULD NOT EXPRESS
   ----------------------------------------
   Whether the applicant is being waited on. `lib/partner/steps` has said so
   from the start — "'Waiting on us' is a property of the current step, not a
   fourth state ... which a greyed-out step cannot say" — and then the rail
   rendered the current step identically either way. An applicant whose file
   is sitting with us saw the same highlighted dot as one holding up their
   own application. So the current phase carries a chip that says which it
   is: "Your turn" in brand, or "With us" in grey. It is the single question
   anyone checking a pending application has.
   ========================================================================= */

/**
 * The three ways an application stops.
 *
 * They are NOT a position on this tracker, and the old rail treated them as
 * one: a suspended partner got the same brand-highlighted current step as
 * someone mid-application, so the portal said "your turn" in blue directly
 * above the dashboard's own "this account is suspended. Please contact us."
 * Two sentences, same screen, opposite meanings.
 *
 * `PortalShell` hides the tracker at VERIFIED and nowhere else, so these
 * three reach it and have to be answered here rather than assumed away.
 */
const HALTED: PartnerStatus[] = [
  PARTNER_STATUS.REJECTED,
  PARTNER_STATUS.SUSPENDED,
  PARTNER_STATUS.MSA_DECLINED,
];

/** The halted tone, shared with the admin rail's notice. */
const STOP = { border: "color-mix(in srgb, var(--status-danger-fg) 30%, transparent)", bg: "var(--status-danger-bg)", ink: "var(--status-danger-fg)" } as const;

type Phase = Step["phase"];
const PHASES: Phase[] = ["Application", "Pricing", "Onboarding"];

/** What the phase is for, said once at the top rather than nine times. */
const WHAT_THIS_PHASE_IS: Record<Phase, string> = {
  Application: "Who you are, and us confirming it",
  Pricing: "Your medications, and the rates you agree",
  Onboarding: "Practice details, then the signature",
};

export function StepTracker({ status }: { status: PartnerStatus }) {
  const steps = stepStates(status);
  const { current, total } = stepPosition(status);
  const halted = HALTED.includes(status);
  const waiting = isWaitingOnUs(status);

  return (
    <nav aria-label="Your progress">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="admin-label">Your progress</p>
        <p className="text-[0.75rem] font-semibold tabular-nums text-[color:var(--admin-ink-50)]">
          Step {current} of {total}
        </p>
      </div>

      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {PHASES.map((phase) => {
          const inPhase = steps.filter((step) => step.phase === phase);
          const here = inPhase.some((step) => step.state === "current");
          const done = inPhase.every((step) => step.state === "complete");

          return (
            <li
              key={phase}
              aria-current={here ? "step" : undefined}
              className="rounded-[10px] border p-4"
              style={{
                borderColor: here
                  ? halted
                    ? STOP.border
                    : "var(--admin-accent)"
                  : done
                    ? "#c9d8ff"
                    : "var(--admin-border)",
                background: here
                  ? halted
                    ? STOP.bg
                    : "#fff"
                  : done
                    ? "#eef3ff"
                    : "var(--admin-bg)",
                /* The ring, not the border, is what makes the live card
                   findable without reading. Same device as the admin rail.
                   A stopped application still needs finding — it just must
                   not be found in a colour that reads as progress. */
                boxShadow: here
                  ? halted
                    ? "0 0 0 3px rgb(156 58 42 / 0.12)"
                    : "0 0 0 3px rgb(27 84 251 / 0.14)"
                  : "none",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className="text-[0.8125rem] font-bold leading-tight"
                  style={{
                    color: here
                      ? halted
                        ? STOP.ink
                        : "var(--admin-accent)"
                      : done
                        ? "var(--admin-ink)"
                        : "var(--admin-ink-50)",
                  }}
                >
                  {phase}
                </p>

                {done && (
                  <span
                    aria-hidden
                    className="flex size-[18px] shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--admin-accent)" }}
                  >
                    <Check className="size-2.5 text-white" strokeWidth={3.5} />
                  </span>
                )}

                {here && (
                  /* The answer to "is anyone waiting on me?". */
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.07em]"
                    style={
                      halted
                        ? { background: STOP.ink, color: "#fff" }
                        : waiting
                          ? { background: "var(--admin-border)", color: "var(--admin-ink-70)" }
                          : { background: "var(--admin-accent)", color: "#fff" }
                    }
                  >
                    {halted ? "Stopped" : waiting ? "With us" : "Your turn"}
                  </span>
                )}
              </div>

              <p
                className="mt-1 text-[0.6875rem] leading-snug"
                style={{ color: here || done ? "var(--admin-ink-50)" : "var(--admin-ink-50)" }}
              >
                {WHAT_THIS_PHASE_IS[phase]}
              </p>

              <ul className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: done ? "#c9d8ff" : "var(--admin-border)" }}>
                {inPhase.map((step) => (
                  <StepRow key={step.id} step={step} waiting={waiting} halted={halted} />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * One step inside a phase card.
 *
 * Only the current step carries its blurb. Nine blurbs is nine lines nobody
 * reads to find the one that applies — the reason the old rail withheld them
 * too, and the one judgement of its worth keeping.
 */
function StepRow({
  step,
  waiting,
  halted,
}: {
  step: Step & { state: StepState };
  waiting: boolean;
  halted: boolean;
}) {
  const reachable = step.href && step.state !== "locked";

  const body = (
    <span className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-[1px] flex size-[14px] shrink-0 items-center justify-center rounded-full border"
        style={
          step.state === "complete"
            ? { background: "var(--admin-accent)", borderColor: "var(--admin-accent)" }
            : step.state === "current"
              ? {
                  background: "#fff",
                  borderColor: halted ? STOP.ink : "var(--admin-accent)",
                  boxShadow: `inset 0 0 0 3px ${halted ? STOP.ink : "var(--admin-accent)"}`,
                }
              : { background: "transparent", borderColor: "var(--admin-border-strong)" }
        }
      >
        {step.state === "complete" && <Check className="size-2 text-white" strokeWidth={4} />}
        {step.state === "locked" && (
          <Lock className="size-2 text-[color:var(--admin-ink-50)]" strokeWidth={2.5} />
        )}
      </span>

      <span className="min-w-0">
        <span
          className={cn(
            "block text-[0.75rem] leading-tight",
            step.state === "current" ? "font-bold" : "font-medium"
          )}
          style={{
            color:
              step.state === "current"
                ? halted
                  ? STOP.ink
                  : "var(--admin-accent)"
                : step.state === "complete"
                  ? "var(--admin-ink-70)"
                  : "var(--admin-ink-50)",
          }}
        >
          {step.label}
        </span>

        {step.state === "current" && (
          <span
            className="mt-0.5 block text-[0.6875rem] leading-snug"
            style={{ color: "var(--admin-ink-70)" }}
          >
            {halted
              ? "This application has stopped."
              : waiting
                ? "We are on it — nothing for you to do"
                : step.blurb}
          </span>
        )}
      </span>
    </span>
  );

  return (
    <li>
      {reachable ? (
        <Link
          href={step.href!}
          className="block rounded-[5px] transition-opacity hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-accent)]"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}
