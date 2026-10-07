import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IdentityForm } from "@/components/portal/IdentityForm";
import { PortalShell } from "@/components/portal/PortalShell";
import { WaitingNotice } from "@/components/portal/WaitingNotice";
import type { UploadedDocument } from "@/components/portal/DocumentUploader";
import { db } from "@/lib/db";
import { requirePartnerPage } from "@/lib/guard";
import { displayUsPhone } from "@/lib/masks";
import { canAccess, currentStepHref } from "@/lib/partner/steps";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";

export const metadata: Metadata = {
  title: "Confirm your identity",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PortalIdentityPage() {
  const session = await requirePartnerPage();

  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      status: true,
      contactName: true,
      phone: true,
      user: { select: { email: true } },
      application: {
        select: {
          requesterName: true,
          requesterTitle: true,
          requesterPhone: true,
          requesterEmail: true,
          requesterNote: true,
          contactRole: true,
          identitySubmittedAt: true,
        },
      },
      documents: {
        where: { type: "GOVERNMENT_ID" },
        orderBy: { uploadedAt: "desc" },
        select: {
          id: true,
          type: true,
          filename: true,
          mime: true,
          size: true,
          status: true,
          reviewerComment: true,
          uploadedAt: true,
        },
      },
    },
  });
  if (!partner) redirect("/portal");

  const status = partner.status as PartnerStatus;
  if (!canAccess(status, "identity")) redirect(currentStepHref(status));

  const application = partner.application;
  const waiting = status === PARTNER_STATUS.IDENTITY_SUBMITTED;
  const OPEN_STATUSES: PartnerStatus[] = [
    PARTNER_STATUS.APPLICATION_SUBMITTED,
    PARTNER_STATUS.IDENTITY_SUBMITTED,
  ];
  const done = !OPEN_STATUSES.includes(status);

  /* Why it came back, if it did. The reason is the transition's own note, so
     there is one copy of that text rather than a second that can drift. */
  const sentBack = await db.statusHistory.findFirst({
    where: { partnerId: partner.id, toStatus: "APPLICATION_SUBMITTED", fromStatus: "IDENTITY_SUBMITTED" },
    orderBy: { createdAt: "desc" },
    select: { note: true, createdAt: true },
  });

  const documents: UploadedDocument[] = partner.documents.map((doc) => ({
    id: doc.id,
    type: doc.type,
    filename: doc.filename,
    mime: doc.mime,
    size: doc.size,
    status: doc.status,
    reviewerComment: doc.reviewerComment,
    uploadedAt: doc.uploadedAt.toISOString(),
  }));

  return (
    <PortalShell
      accountName={partner.contactName}
      title="Confirm your identity"
      eyebrow="Before your pricing"
      status={status}
      back={{ href: "/portal", label: "Your application" }}
    >
      {done ? (
        <p className="rounded-tile border border-success-fg/25 bg-success-bg px-4 py-3 text-meta text-success-fg">
          Verified. Your formulary and pricing are open.
        </p>
      ) : waiting ? (
        <WaitingNotice>
          We are confirming your details and will release the formulary to your portal, usually the
          same business day. Nothing else is needed from you.
        </WaitingNotice>
      ) : (
        <>
          {sentBack && (
            <p className="rounded-tile border border-warning-fg/25 bg-warning-bg px-4 py-3 text-meta text-warning-fg">
              <strong className="font-bold">We need another look.</strong>
              {sentBack.note && ` ${sentBack.note}`}
            </p>
          )}

          <p className="mt-4 text-intro text-ink-soft text-pretty">
            Our Provider Cost is confidential to each practice, so we confirm who is asking before
            we send it. Four fields and a photo — most accounts are released the same business day.
          </p>

          <div className="mt-8">
            <IdentityForm
              defaults={{
                requesterName: application?.requesterName ?? partner.contactName,
                requesterTitle: application?.requesterTitle ?? application?.contactRole ?? "",
                requesterPhone:
                  displayUsPhone(application?.requesterPhone ?? partner.phone) ?? "",
                requesterEmail: application?.requesterEmail ?? partner.user.email,
                requesterNote: application?.requesterNote ?? "",
              }}
              idDocuments={documents}
            />
          </div>
        </>
      )}
    </PortalShell>
  );
}
