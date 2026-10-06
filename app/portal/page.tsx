import type { Metadata } from "next";
import Link from "next/link";

import { PortalOverview } from "@/components/portal/PortalOverview";
import { PortalShell } from "@/components/portal/PortalShell";
import { db } from "@/lib/db";
import { requirePartnerPage } from "@/lib/guard";

import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";
import { getLatestMeeting } from "@/lib/services/meetings";
import { site } from "@/lib/site";
import { PhoneLink } from "@/components/PhoneLink";
import { MeetingSlotPicker } from "@/components/portal/MeetingSlotPicker";
import { VerifiedDashboard } from "@/components/portal/VerifiedDashboard";
import { Panel } from "@/components/admin/ui";
import { getCurrentPriceList } from "@/lib/services/pricing";
import { getOpenAmendment } from "@/lib/services/amendments";

export const metadata: Metadata = {
  title: "Your application",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/* The per-status explanation table that used to live here is gone.
 *
 * It was a second place that described each stage in prose, maintained
 * alongside `publicDetail` in lib/partner/steps.ts — which is where the
 * redesigned overview reads from. Two tables describing one pipeline is one
 * table too many; the steps module already had to be exhaustive over
 * PartnerStatus, and this one had to be kept in step with it by hand. */

export default async function PortalPage({
  searchParams,
}: {
  searchParams: { welcome?: string };
}) {
  const session = await requirePartnerPage();

  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      companyName: true,
      status: true,
      createdAt: true,
      verifiedAt: true,
      rejectedReason: true,
      suspendedReason: true,
      application: { select: { practiceName: true } },
      msaEnvelopes: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: { completedAt: true, signedName: true },
      },
    },
  });

  if (!partner) {
    return (
      <PortalShell title="No application found" status={PARTNER_STATUS.APPLICATION_SUBMITTED}>
        <p className="text-meta text-ink-soft">
          There is no application linked to this account.{" "}
          <Link href="/work-with-us" className="link-arrow">
            Start one
          </Link>
        </p>
      </PortalShell>
    );
  }

  const status = partner.status as PartnerStatus;
  const meeting = await getLatestMeeting(partner.id);
  /* Offered, not yet taken. `scheduledAt IS NULL` with slots on the row is
     the whole condition — see the note in lib/services/meetings.ts about why
     this is not its own status. */
  const awaitingPick =
    status === PARTNER_STATUS.MEETING_REQUESTED &&
    !!meeting &&
    !meeting.scheduledAt &&
    meeting.proposedSlots.length > 0;

  /* Everything the dashboard needs, fetched only once the partner is actually
     verified. A partner three steps from the end has no price list and no
     signed agreement, so asking for them on every portal render would be two
     queries nine screens out of ten throw away. */
  const verified = status === PARTNER_STATUS.VERIFIED;
  const [priceList, openAmendment] = verified
    ? await Promise.all([getCurrentPriceList(partner.id), getOpenAmendment(partner.id)])
    : [null, null];

  return (
    <PortalShell
      title={partner.application?.practiceName ?? partner.companyName}
      eyebrow="Your application"
      status={status}
      /* The overview draws its own header, h1 and tracker — see `bare`. */
      bare
      welcome={Boolean(searchParams.welcome)}
    >
      {/* The whole "where am I, what now" answer in one component. Everything
          in it derives from lib/partner/steps.ts — the same table the route
          guards read — so the screen cannot disagree with what the partner is
          actually allowed to open. */}
      <PortalOverview
        status={status}
        practiceName={partner.application?.practiceName ?? partner.companyName}
      />


      {(partner.rejectedReason || partner.suspendedReason) && (
        <p className="mt-6 rounded-tile border border-red-200 bg-red-50 px-4 py-3 text-meta text-red-900">
          <strong className="font-bold">Reason:</strong>{" "}
          {partner.rejectedReason ?? partner.suspendedReason}
        </p>
      )}

      {/* Times are on the table and nobody has taken one. This is the only
          card on the page that is an ACTION while the status still reads
          "requested" — the status cannot distinguish the two halves of the
          offer, and the data can. */}
      {awaitingPick && (
        <MeetingSlotPicker
          slots={meeting!.proposedSlots.map((slot) => slot.toISOString())}
          durationMinutes={meeting!.durationMinutes ?? 30}
        />
      )}

      {meeting?.scheduledAt && status === PARTNER_STATUS.PRICING_MEETING && (
        <div className="mt-6 rounded-tile border border-brand-200 bg-brand-50/50 p-5">
          <p className="eyebrow">
            {meeting.confirmedAt ? "Confirmed by MediCraft" : "Your call"}
          </p>
          <p className="mt-2 text-[1.0625rem] font-bold text-ink">
            {meeting.scheduledAt.toLocaleString("en-US", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
          {meeting.conferenceUrl && (
            <p className="mt-3">
              <a href={meeting.conferenceUrl} className="link-arrow font-semibold">
                Join on Google Meet
              </a>
            </p>
          )}
          {meeting.location && (
            <p className="mt-1 text-meta text-ink-soft">{meeting.location}</p>
          )}
          {meeting.durationMinutes && (
            <p className="mt-1 text-caption text-ink-muted">
              About {meeting.durationMinutes} minutes.
            </p>
          )}
        </div>
      )}

      {verified && (
        <VerifiedDashboard
          partnerId={partner.id}
          companyName={partner.application?.practiceName ?? partner.companyName}
          verifiedAt={partner.verifiedAt}
          signedAt={partner.msaEnvelopes[0]?.completedAt ?? null}
          signedName={partner.msaEnvelopes[0]?.signedName ?? null}
          priceListVersion={priceList?.version ?? null}
          totalPriced={priceList?.items.length ?? 0}
          priceLines={(priceList?.items ?? []).slice(0, 8).map((item) => ({
            id: item.id,
            name: item.product.name,
            strength: item.product.strength,
            form: item.product.form,
            unit: item.product.unit,
            finalPrice: item.finalPrice.toFixed(2),
          }))}
          openAmendment={
            openAmendment
              ? {
                  id: openAmendment.id,
                  number: openAmendment.number,
                  status: openAmendment.status,
                  requestedAt: openAmendment.requestedAt,
                  itemCount: openAmendment.items.length,
                }
              : null
          }
        />
      )}

      {/* The admin's panel, not a marketing card: this sits inside a console
          now and a sand-coloured tile was the last thing still dressed as the
          public site. */}
      <div className="dashboard mt-5">
        <Panel
          title="Questions?"
          description="Our provider team can answer anything about your account."
        >
          <p className="flex flex-wrap gap-x-6 gap-y-2 text-[0.875rem]">
            <a
              href={`mailto:${site.providerEmail}`}
              className="font-semibold"
              style={{ color: "var(--admin-accent)" }}
            >
              {site.providerEmail}
            </a>
            <PhoneLink className="font-semibold text-[color:var(--admin-accent)]" />
          </p>
        </Panel>
      </div>
    </PortalShell>
  );
}
