import { Check } from "lucide-react";

import {
  PARTNER_STATUS,
  PROGRESS_STEPS,
  progressStep,
  type PartnerStatus,
} from "@/lib/partner/status";

/* ===========================================================================
   Where this partner is, as five cards.

   WHAT THIS REPLACES
   ------------------
   A word. The header rendered `progressStep(status)` as plain text beside a
   status badge — "Onboarding", "msa sent" — which names the stage and says
   nothing about the shape of the journey: how far in they are, what is
   behind them, what is still to come. Every other question needed the
   status history at the bottom of the page.

   WHY CARDS AND NOT A LINE OF DOTS
   --------------------------------
   A dot rail is a progress bar: it says 3-of-5 and stops. These cards each
   carry what actually happens at that stage, so the page answers "what is
   left" without an admin having to know the pipeline by heart. It is also
   the thing that visibly MOVES when a move is applied, which is the whole
   point — an action with no visible consequence feels like it failed.

   THE COLOUR IS DOING WORK, NOT DECORATION
   ----------------------------------------
   Three states, three treatments, all from the console palette already in
   use: done is filled brand with a tick, the current stage is a white card
   ringed in brand, and what is ahead is flat and grey. A reader should be
   able to find the current stage without reading a word of it.

   DEAD ENDS ARE NOT A POSITION ON THIS RAIL. A suspended partner has not
   stopped at "Verified" — they have left the process — so the rail renders
   halted rather than showing a misleading tick.
   ========================================================================= */

/** What each stage is actually for, in the admin's terms. */
const WHAT_HAPPENS: Record<(typeof PROGRESS_STEPS)[number], string> = {
  Application: "Check who is asking and release the formulary",
  Pricing: "Build their schedule, talk it through, agree the rates",
  Onboarding: "Account details, prescribers and the photo ID",
  Agreement: "Issue the MSA and wait for the signature",
  Verified: "Live. Ordering against agreed prices",
};

const HALTED: PartnerStatus[] = [
  PARTNER_STATUS.REJECTED,
  PARTNER_STATUS.SUSPENDED,
  PARTNER_STATUS.MSA_DECLINED,
];

export function PipelineRail({ status }: { status: PartnerStatus }) {
  const halted = HALTED.includes(status);
  const current = PROGRESS_STEPS.indexOf(progressStep(status));

  return (
    <nav aria-label="Application progress">
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PROGRESS_STEPS.map((label, index) => {
          const done = !halted && index < current;
          const here = !halted && index === current;

          return (
            <li
              key={label}
              aria-current={here ? "step" : undefined}
              className="rounded-[10px] border p-4 transition-colors"
              style={{
                borderColor: here
                  ? "var(--admin-accent)"
                  : done
                    ? "#c9d8ff"
                    : "var(--admin-border)",
                background: done ? "#eef3ff" : here ? "#fff" : "var(--admin-bg)",
                // The ring is what makes the current card findable at a glance.
                boxShadow: here ? "0 0 0 3px rgb(27 84 251 / 0.14)" : "none",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold tabular-nums"
                  style={{
                    background: done
                      ? "var(--admin-accent)"
                      : here
                        ? "var(--admin-accent)"
                        : "var(--admin-border)",
                    color: done || here ? "#fff" : "var(--admin-ink-50)",
                  }}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
                </span>

                <span
                  className="text-[0.8125rem] font-bold leading-tight"
                  style={{
                    color: here
                      ? "var(--admin-accent)"
                      : done
                        ? "var(--admin-ink)"
                        : "var(--admin-ink-50)",
                  }}
                >
                  {label}
                </span>
              </div>

              <p
                className="mt-2 text-[0.75rem] leading-snug"
                style={{ color: here ? "var(--admin-ink-70)" : "var(--admin-ink-50)" }}
              >
                {WHAT_HAPPENS[label]}
              </p>

              {here && (
                <p className="mt-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[color:var(--admin-accent)]">
                  You are here
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {halted && (
        <p
          className="mt-3 rounded-[10px] border px-4 py-3 text-[0.8125rem] font-medium"
          style={{ borderColor: "#e4b8ae", background: "#fdf4f2", color: "#9c3a2a" }}
        >
          This application has stopped. The reason is on the record below, and the
          moves available are the ones that reopen it.
        </p>
      )}
    </nav>
  );
}
