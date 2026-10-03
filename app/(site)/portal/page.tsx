import type { Metadata } from "next";
import Link from "next/link";

import { PortalShell } from "@/components/portal/PortalShell";
import { WaitingNotice } from "@/components/portal/WaitingNotice";
import { db } from "@/lib/db";
import { requirePartnerPage } from "@/lib/guard";
import { isWaitingOnUs, nextAction } from "@/lib/partner/steps";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";
import { getLatestMeeting } from "@/lib/services/meetings";
import { site } from "@/lib/site";
import { PhoneLink } from "@/components/PhoneLink";
import { MeetingSlotPicker } from "@/components/portal/MeetingSlotPicker";

export const metadata: Metadata = {
  title: "Your application",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** What is happening, in the applicant's words. Exhaustive over the enum. */
const EXPLANATION: Record<PartnerStatus, string> = {
  APPLICATION_SUBMITTED:
    "One quick step before your pricing: confirm who is asking and upload a photo ID. Our formulary is confidential to each practice, so we check before we send it.",
  IDENTITY_SUBMITTED:
    "We have your details and are confirming them. Your formulary and pricing follow, usually the same business day.",
  PRODUCT_LIST_SENT:
    "Your application is approved. Take a look at our formulary — accept the pricing as it stands, or ask for a call to discuss it.",
  MEETING_REQUESTED:
    "We have your request for a call and your notes. Someone will send you a few times to choose from shortly.",
  PRICING_MEETING:
    "Your call is booked. After it, we will send pricing built for your practice.",
  NEGOTIATED_PRICING_SENT:
    "Your pricing is ready. Review it and either accept it or tell us what still does not work.",
  PRICING_CHANGES_REQUESTED:
    "You asked for another round. We are revising your pricing and will send it back shortly.",
  PRICING_PARTNER_ACCEPTED:
    "Pricing is agreed. The next step is your full account details.",
  ONBOARDING_IN_PROGRESS:
    "Finish your account details whenever you are ready — your progress saves as you type.",
  DOCUMENTS_PENDING:
    "One step left: upload your licences and a government-issued photo ID for your authorised signer.",
  ONBOARDING_SUBMITTED: "We are reviewing your account details and documents.",
  ONBOARDING_CHANGES_REQUESTED: "We need a few corrections before we can approve your account.",
  ONBOARDING_APPROVED:
    "Your details are approved. Your Master Service Agreement is on its way.",
  MSA_SENT: "Your Master Service Agreement is ready to sign. It is the last step.",
  MSA_SIGNED: "Thank you for signing. We are activating your account now.",
  VERIFIED: "You are a verified MediCraft partner. Everything below is live.",
  REJECTED:
    "We are not able to move forward with this application. Please get in touch if you have questions.",
  MSA_DECLINED: "The agreement was declined. Contact us and we will pick it up from there.",
  SUSPENDED: "This account is suspended. Please contact us.",

  // Retired statuses, unreachable but the Record must be total.
  PRICING_SUBMITTED: "We have your price list and are reviewing it.",
  PRICING_ADMIN_APPROVED: "Your pricing is ready to review.",
};

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
      rejectedReason: true,
      suspendedReason: true,
      application: { select: { practiceName: true } },
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
  const next = nextAction(status);

  return (
    <PortalShell
      title={partner.application?.practiceName ?? partner.companyName}
      eyebrow="Your application"
      status={status}
      welcome={Boolean(searchParams.welcome)}
    >
      {/* One card carries the whole answer to "what now" — the state, the
          action and the button. It used to be an explanatory paragraph and,
          twelve inches further down, a button labelled "Continue". */}
      <div
        className={
          next
            ? "rounded-tile border border-brand-200 bg-brand-50/50 p-6"
            : "rounded-tile border border-line bg-sand p-6"
        }
      >
        <p className="eyebrow">{next ? "Your next step" : "Where things stand"}</p>
        <p className="mt-3 text-intro text-ink text-pretty">{EXPLANATION[status]}</p>

        {next && (
          <Link href={next.href} className="btn-accent btn-lg mt-5">
            {next.label}
          </Link>
        )}
      </div>

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

      {isWaitingOnUs(status) && (
        <div className="mt-6">
          <WaitingNotice>
            Nothing is needed from you right now. We will email you as soon as this moves.
          </WaitingNotice>
        </div>
      )}

      <div className="mt-12 rounded-tile border border-line bg-sand p-6">
        <h2 className="text-[1.0625rem] font-bold text-ink">Questions in the meantime?</h2>
        <p className="mt-2 text-meta text-ink-soft">
          Our provider team can answer anything about the process.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-meta">
          <a href={`mailto:${site.providerEmail}`} className="link-arrow">
            {site.providerEmail}
          </a>
          <PhoneLink className="link-arrow" />
        </p>
      </div>
    </PortalShell>
  );
}
