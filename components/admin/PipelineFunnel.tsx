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
      <ul className="space-y-2.5">
        {stages.map((stage) => (
          <li key={stage.label}>
            <Link
              href={`/admin/partners?status=${stage.statuses[0]}`}
              className="group block"
              /* No `aria-label`. It read "{count} in {label}" while the
                 visible text is "{label}" then "{count}" — the visible string
                 is not contained in the accessible name, so the two disagree
                 and voice control cannot address the link by what it says.
                 The visible text IS the name now; the sr-only word below
                 supplies the unit the sighted reader gets from context. */
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.8125rem] font-medium transition-colors group-hover:text-[color:var(--admin-accent)]">
                  {stage.label}
                </span>
                <span className="text-[0.8125rem] font-semibold tabular-nums">
                  {stage.count}
                  <span className="sr-only"> partners</span>
                </span>
              </div>

              {/* A 4px bar against a track, rounded at the data end only — the
                  baseline stays square so zero reads as zero. */}
              <div
                className="mt-1.5 h-1 w-full overflow-hidden rounded-full"
                style={{ background: "var(--admin-border)" }}
                aria-hidden
              >
                <div
                  className="h-full rounded-r-full transition-[width] duration-500"
                  style={{
                    width: `${Math.round((stage.count / scale) * 100)}%`,
                    /* `--status-success-fg` is the identity's cyan-700, not a
                       green. The hardcoded #2f855a was the only green in the
                       application, and it sat four pixels from the brand blue
                       on the same chart — a third colour nobody chose. */
                    background:
                      stage.label === "Closed"
                        ? "var(--admin-ink-50)"
                        : stage.label === "Verified"
                          ? "var(--status-success-fg)"
                          : "var(--admin-accent)",
                  }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
