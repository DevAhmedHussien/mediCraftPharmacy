import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DocumentRow, type UploadedDocument } from "@/components/portal/DocumentUploader";
import { PortalShell } from "@/components/portal/PortalShell";
import { SubmitDocuments } from "@/components/portal/SubmitDocuments";
import { WaitingNotice } from "@/components/portal/WaitingNotice";
import { db } from "@/lib/db";
import { requirePartnerPage } from "@/lib/guard";
import { DOCUMENT_SPECS, missingRequired, specFor } from "@/lib/partner/documents";
import { canAccess, currentStepHref } from "@/lib/partner/steps";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";

export const metadata: Metadata = {
  title: "Documents",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** Statuses where the file is with us and nothing may change under a reviewer. */
const LOCKED: PartnerStatus[] = [
  PARTNER_STATUS.ONBOARDING_SUBMITTED,
  PARTNER_STATUS.ONBOARDING_APPROVED,
  PARTNER_STATUS.MSA_SENT,
  PARTNER_STATUS.MSA_SIGNED,
  PARTNER_STATUS.VERIFIED,
];

export default async function PortalDocumentsPage() {
  const session = await requirePartnerPage();

  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      status: true,
      companyName: true,
      documents: {
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
          // s3Key is deliberately absent: it is an object path, the page has no
          // use for it, and a presigned link is fetched per click instead.
        },
      },
    },
  });
  if (!partner) redirect("/portal");

  const status = partner.status as PartnerStatus;
  if (!canAccess(status, "documents")) redirect(currentStepHref(status));

  const locked = LOCKED.includes(status);

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

  const missing = missingRequired(documents).map((type) => specFor(type)?.label ?? type);

  return (
    <PortalShell
      accountName={partner.companyName}
      title="Documents"
      eyebrow="Onboarding"
      status={status}
      back={{ href: "/portal/onboarding", label: "Account details" }}
    >
      {locked ? (
        <WaitingNotice>
          We are reviewing your documents and will come back within one to two business days.
          Nothing else is needed from you.
        </WaitingNotice>
      ) : status === PARTNER_STATUS.ONBOARDING_CHANGES_REQUESTED ? (
        <p className="rounded-tile border border-warning-fg/25 bg-warning-bg px-4 py-3 text-meta text-warning-fg">
          <strong className="font-bold">A reviewer asked for changes.</strong> Anything they
          rejected is marked below — replace it and submit again.
        </p>
      ) : missing.length === 0 ? (
        /* The only document this pharmacy asks for is the photo ID, and that
           is collected at the identity step — six screens before this one.
           So by the time anybody reaches here it is almost always already in
           hand, and an upload box for a file we are not waiting on reads as
           another task. Say what is true: nothing is outstanding. */
        <p className="text-intro text-ink-soft text-pretty">
          Nothing is outstanding. We already have the photo ID for your authorised signer, which
          is the only document we ask for. Submit below and your account goes to a reviewer.
        </p>
      ) : (
        <p className="text-intro text-ink-soft text-pretty">
          The last step. Photograph or scan your authorised signer&rsquo;s photo ID — PDF, JPG,
          PNG and WebP all work, up to 25 MB. It goes straight to encrypted storage and is
          visible only to you and the reviewer handling your account.
        </p>
      )}

      {/* Still rendered when it is already satisfied: the row shows the file
          on record with its review state, which is the only place a partner
          can check what we hold and replace it if a reviewer rejected it. */}
      <div className="mt-8 space-y-3">
        {DOCUMENT_SPECS.map((spec) => (
          <DocumentRow
            key={spec.type}
            spec={spec}
            documents={documents.filter((doc) => doc.type === spec.type)}
            locked={locked}
          />
        ))}
      </div>

      {!locked && (
        <div className="mt-6">
          <SubmitDocuments missing={missing} />
        </div>
      )}
    </PortalShell>
  );
}
