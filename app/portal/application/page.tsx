import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusTimeline } from "@/components/admin/StatusTimeline";
import { Facts, Panel } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePartnerPage } from "@/lib/guard";
import { displayDate, displayUsPhone } from "@/lib/masks";
import { getStatusHistory } from "@/lib/services/transition";
import { progressStep, type PartnerStatus } from "@/lib/partner/status";

export const metadata: Metadata = {
  title: "Your application",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * What the partner submitted, and every step it has been through.
 *
 * The admin has had this view since the beginning — `StatusTimeline` on the
 * partner detail page. The applicant, who is the person actually waiting on
 * it, could only ever see the single sentence describing their current status.
 *
 * It is the same component, not a copy: the timeline here and the timeline an
 * admin reads are one file.
 *
 * WHAT IS NOT SHOWN
 * -----------------
 * `actorEmail` is on every history row and is deliberately dropped here. Which
 * named member of staff moved an application is internal; the applicant needs
 * to know what happened and when, not who to chase personally.
 */
export default async function PortalApplicationPage() {
  const session = await requirePartnerPage();

  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      companyName: true,
      status: true,
      createdAt: true,
      contactName: true,
      phone: true,
      businessType: true,
      application: {
        select: {
          practiceName: true,
          practiceCity: true,
          practiceState: true,
          practicePhone: true,
          contactRole: true,
          howDidYouHearAboutUs: true,
          submittedAt: true,
        },
      },
    },
  });
  if (!partner) redirect("/portal");

  const history = await getStatusHistory(partner.id);
  const application = partner.application;
  const status = partner.status as PartnerStatus;

  return (
    <PortalShell
      title="Your application"
      eyebrow="Account"
      accountName={partner.companyName}
      status={status}
      back={{ href: "/portal", label: "Your portal" }}
    >
      <div className="dashboard mt-8 space-y-5">
        <Panel
          title="What you submitted"
          description={`Received ${displayDate(application?.submittedAt ?? partner.createdAt)}.`}
        >
          <Facts
            rows={[
              ["Practice", application?.practiceName ?? partner.companyName],
              ["Contact", partner.contactName],
              ["Role", application?.contactRole ?? "—"],
              ["Phone", partner.phone ? displayUsPhone(partner.phone) : "—"],
              [
                "Location",
                [application?.practiceCity, application?.practiceState]
                  .filter(Boolean)
                  .join(", ") || "—",
              ],
              ["Business type", partner.businessType.replace(/_/g, " ").toLowerCase()],
              ["Heard about us", application?.howDidYouHearAboutUs ?? "—"],
            ]}
          />
        </Panel>

        <Panel title="Where it stands">
          <p className="text-[0.875rem] text-[color:var(--admin-ink-70)]">
            Current step:{" "}
            <strong className="font-semibold text-[color:var(--admin-ink)]">
              {progressStep(status)}
            </strong>
          </p>
        </Panel>

        {/* The admin's own timeline component, with the staff identities
            stripped out on the way in. */}
        <StatusTimeline
          entries={history.map((entry) => ({
            id: entry.id,
            fromStatus: entry.fromStatus,
            toStatus: entry.toStatus,
            actorEmail: null,
            actorRole: entry.actorRole,
            note: entry.note,
            createdAt: entry.createdAt.toISOString(),
          }))}
        />
      </div>
    </PortalShell>
  );
}
