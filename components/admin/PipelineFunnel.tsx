import Link from "next/link";

import { Panel } from "@/components/admin/ui";
import { STEPS } from "@/lib/partner/steps";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";

/* ===========================================================================
   Where everyone is, at a glance.

   The dashboard had a queue of who is waiting and a count of who was verified
   this week, but nothing that answered "is the pipeline healthy" — eleven
   applicants stuck on documents and two on pricing is a very different week
   from the reverse, and neither was visible.

   Grouped by the applicant's own step rather than by raw status, because
   "ONBOARDING_IN_PROGRESS, DOCUMENTS_PENDING, ONBOARDING_SUBMITTED" is three
   bars for one thing an operator thinks of as one thing.
   ========================================================================= */

/** Which statuses belong under each visible stage, and what to filter on. */
const STAGES: { label: string; statuses: PartnerStatus[] }[] = [
  {
    label: "Applied",
    statuses: [PARTNER_STATUS.APPLICATION_SUBMITTED],
  },
  {
    label: "Pricing",
    statuses: [
      PARTNER_STATUS.PRODUCT_LIST_SENT,
      PARTNER_STATUS.MEETING_REQUESTED,
      PARTNER_STATUS.PRICING_MEETING,
      PARTNER_STATUS.NEGOTIATED_PRICING_SENT,
      PARTNER_STATUS.PRICING_CHANGES_REQUESTED,
      PARTNER_STATUS.PRICING_PARTNER_ACCEPTED,
    ],
  },
  {
    label: "Onboarding",
    statuses: [
      PARTNER_STATUS.ONBOARDING_IN_PROGRESS,
      PARTNER_STATUS.DOCUMENTS_PENDING,
      PARTNER_STATUS.ONBOARDING_SUBMITTED,
      PARTNER_STATUS.ONBOARDING_CHANGES_REQUESTED,
      PARTNER_STATUS.ONBOARDING_APPROVED,
    ],
  },
  {
    label: "Agreement",
    statuses: [PARTNER_STATUS.MSA_SENT, PARTNER_STATUS.MSA_SIGNED],
  },
  {
    label: "Verified",
    statuses: [PARTNER_STATUS.VERIFIED],
  },
  {
    label: "Closed",
    statuses: [
      PARTNER_STATUS.REJECTED,
      PARTNER_STATUS.MSA_DECLINED,
      PARTNER_STATUS.SUSPENDED,
    ],
  },
];

export function PipelineFunnel({ counts }: { counts: Record<string, number> }) {
  const stages = STAGES.map((stage) => ({
    ...stage,
    count: stage.statuses.reduce((total, status) => total + (counts[status] ?? 0), 0),
  }));

  // Excludes Closed: a big rejected pile would flatten every live bar to
  // nothing, which is the opposite of what the chart is for.
  const scale = Math.max(
    1,
    ...stages.filter((stage) => stage.label !== "Closed").map((stage) => stage.count)
  );

  const live = stages
    .filter((stage) => !["Verified", "Closed"].includes(stage.label))
    .reduce((total, stage) => total + stage.count, 0);

  return (
    <Panel
      title="Pipeline"
      description={`${live} in flight across ${STEPS.length} applicant steps.`}
    >
      {/* COLUMNS, not six full-width rows.
      
          The reference draws this as a short column chart — one 96px well
          per stage, filled from the bottom. Six stacked horizontal bars took
          four hundred pixels to say what a hundred says, and a bar spanning
          the full width of a 1180px panel encodes its value in a length no
          one can judge against the five below it. Side by side the
          comparison is the shape, which is the whole point of a funnel. */}
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stages.map((stage) => {
          const pct = Math.round((stage.count / scale) * 100);
          const fill =
            stage.label === "Closed"
              ? "var(--admin-ink-50)"
              : stage.label === "Verified"
                ? /* cyan-700, the identity's `success`. The hardcoded #2f855a
                     here was the only green in the application, and it sat
                     four pixels from the brand blue on the same chart. */
                  "var(--status-success-fg)"
                : "var(--admin-accent)";

          return (
            <li key={stage.label}>
              <Link href={`/admin/partners?status=${stage.statuses[0]}`} className="group flex flex-col gap-2">
                {/* The well is a shape, not data — the count below it is the
                    accessible value, so this is hidden rather than labelled
                    twice. */}
                <div
                  aria-hidden
                  className="flex h-24 items-end overflow-hidden rounded-[0.875rem]"
                  style={{ background: "#f1f3f8" }}
                >
                  <div
                    className="w-full transition-[height] duration-500 motion-reduce:transition-none"
                    style={{
                      /* A floor of 3px so a stage with nobody in it still
                         draws a baseline. A well with literally nothing in it
                         reads as a rendering failure rather than as zero. */
                      height: stage.count === 0 ? "3px" : `${Math.max(pct, 8)}%`,
                      background: stage.count === 0 ? "var(--admin-border-strong)" : fill,
                    }}
                  />
                </div>
                <span className="font-display text-[1.125rem] font-normal leading-none tabular-nums">
                  {stage.count}
                  <span className="sr-only"> partners</span>
                </span>
                <span className="text-[0.75rem] leading-tight text-[color:var(--admin-ink-70)] transition-colors group-hover:text-[color:var(--admin-accent)] motion-reduce:transition-none">
                  {stage.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
