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
              aria-label={`${stage.count} in ${stage.label}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.8125rem] font-medium transition-colors group-hover:text-[color:var(--admin-accent)]">
                  {stage.label}
                </span>
                <span className="text-[0.8125rem] font-semibold tabular-nums">{stage.count}</span>
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
                    background:
                      stage.label === "Closed"
                        ? "var(--admin-ink-50)"
                        : stage.label === "Verified"
                          ? "#2f855a"
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
