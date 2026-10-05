import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountDetailsForm } from "@/components/portal/AccountDetailsForm";
import { BeginOnboarding } from "@/components/portal/BeginOnboarding";
import { PortalShell } from "@/components/portal/PortalShell";
import { WaitingNotice } from "@/components/portal/WaitingNotice";
import { decryptField } from "@/lib/crypto";
import { db } from "@/lib/db";
import { requirePartnerPage } from "@/lib/guard";
import { displayDate, displayUsPhone } from "@/lib/masks";
import { canAccess, currentStepHref } from "@/lib/partner/steps";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";
import type { AccountDetailsValues } from "@/lib/schemas/account-details";

export const metadata: Metadata = {
  title: "Account details",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** Statuses where the file is with us and the form is read-only. */
const LOCKED: PartnerStatus[] = [
  PARTNER_STATUS.ONBOARDING_SUBMITTED,
  PARTNER_STATUS.ONBOARDING_APPROVED,
  PARTNER_STATUS.MSA_SENT,
  PARTNER_STATUS.MSA_SIGNED,
  PARTNER_STATUS.VERIFIED,
];

export default async function PortalOnboardingPage() {
  const session = await requirePartnerPage();

  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      status: true,
      phone: true,
      contactName: true,
      user: { select: { email: true } },
      application: {
        include: {
          prescribers: {
            orderBy: { position: "asc" },
            select: {
              name: true,
              signatureText: true,
              deaCiphertext: true,
              deaExpiration: true,
              npiCiphertext: true,
              stateLicenseCiphertext: true,
            },
          },
        },
      },
      onboarding: {
        select: {
          draft: true,
          submittedAt: true,
          cardBrand: true,
          cardLast4: true,
        },
      },
    },
  });
  if (!partner) redirect("/portal");

  const status = partner.status as PartnerStatus;
  if (!canAccess(status, "onboarding")) redirect(currentStepHref(status));

  const application = partner.application;
  const saved = partner.onboarding;
  const locked = LOCKED.includes(status);

  /* What the form starts with, most recent first.
   *
   * The draft is whatever they typed last, which is the point of autosaving.
   * Submitting clears it and promotes everything into real columns, so a
   * sent-back applicant would otherwise open an empty form — hence the second
   * layer, rebuilt from what was actually stored. The third layer is the
   * public inquiry, so the practice name and address are already filled in the
   * first time they see this. */
  const draft = (saved?.draft ?? {}) as Partial<AccountDetailsValues>;

  /* Prescriber identifiers are decrypted back into the form.
   *
   * The submit path replaces prescriber rows wholesale, so an applicant sent
   * back for corrections who did not retype their DEA number would lose it.
   * Returning a partner their own DEA over an authenticated TLS session is not
   * a disclosure — it is the reason these columns are encrypted rather than
   * hashed. The card number is the one exception: it is asked for once, is not part of
   * a repeatable row, and is never round-tripped. */
  const prescribers = (application?.prescribers ?? []).map((prescriber) => ({
    name: prescriber.name,
    signature: prescriber.signatureText ?? "",
    deaNumber: prescriber.deaCiphertext ? decryptField(prescriber.deaCiphertext) : "",
    deaExpiration: prescriber.deaExpiration ? displayDate(prescriber.deaExpiration) : "",
    npi: prescriber.npiCiphertext ? decryptField(prescriber.npiCiphertext) : "",
    stateLicenseNumber: prescriber.stateLicenseCiphertext
      ? decryptField(prescriber.stateLicenseCiphertext)
      : "",
  }));

  const fromRecord: Partial<AccountDetailsValues> = application
    ? {
        accountType: application.accountType === "EXISTING" ? "existing" : "new",
        ...(prescribers.length > 0 ? { prescribers } : {}),
        howDidYouHearAboutUs: application.howDidYouHearAboutUs ?? "",
        medicraftPharmacyRep: application.medicraftRep ?? "",
        practice: {
          name: application.practiceName,
          isPrimaryLocation: application.isPrimaryLocation,
          address: application.practiceAddress ?? "",
          city: application.practiceCity ?? "",
          state: application.practiceState ?? "",
          zip: application.practiceZip ?? "",
          phone: displayUsPhone(application.practicePhone) ?? "",
          fax: displayUsPhone(application.practiceFax) ?? "",
          officeContact: {
            name: application.officeContactName ?? "",
            phone: displayUsPhone(application.officeContactPhone) ?? "",
            email: application.officeContactEmail ?? "",
          },
        },
        communicationsPreference: {
          prescriptionQuestions: {
            email: application.rxQuestionsEmail ?? "",
            phone: displayUsPhone(application.rxQuestionsPhone) ?? "",
          },
          shippingTracking: {
            email: application.shippingEmail ?? "",
            fax: displayUsPhone(application.shippingFax) ?? "",
          },
          invoicesReceipts: {
            email: application.invoicesEmail ?? "",
            fax: displayUsPhone(application.invoicesFax) ?? "",
          },
        },
        // Sensible starting points, overridden the moment they type anything.
        legalBusinessName: application.practiceName,
        businessStreet: application.practiceAddress ?? "",
        businessCity: application.practiceCity ?? "",
        businessState: application.practiceState ?? "",
        businessZip: application.practiceZip ?? "",
        signerName: partner.contactName,
        signerEmail: partner.user.email,
        signerPhone: displayUsPhone(partner.phone) ?? "",
      }
    : {};

  return (
    <PortalShell
      accountName={application?.practiceName ?? partner.contactName}
      title="Account details"
      eyebrow="Onboarding"
      status={status}
      back={{ href: "/portal", label: "Your application" }}
    >
      {/* Moves PRICING_PARTNER_ACCEPTED → ONBOARDING_IN_PROGRESS the first time
          this page is opened. A no-op at every other stage. */}
      <BeginOnboarding active={status === PARTNER_STATUS.PRICING_PARTNER_ACCEPTED} />

      {locked ? (
        <>
          {status === PARTNER_STATUS.ONBOARDING_SUBMITTED ? (
            <WaitingNotice>
              We are reviewing your account details and documents, and will come back within one to
              two business days. Nothing else is needed from you.
            </WaitingNotice>
          ) : (
            <p className="rounded-tile border border-emerald-200 bg-emerald-50 px-4 py-3 text-meta text-emerald-900">
              Your account details are approved.
              {saved?.cardLast4 && (
                <span className="mt-1 block font-mono text-caption">
                  Card on file: {saved.cardBrand ?? "Card"} ending {saved.cardLast4}
                </span>
              )}
            </p>
          )}

          <SubmittedSummary
            application={application}
            submittedAt={saved?.submittedAt ?? null}
          />
        </>
      ) : (
        <>
          {status === PARTNER_STATUS.ONBOARDING_CHANGES_REQUESTED ? (
            <p className="rounded-tile border border-amber-200 bg-amber-50 px-4 py-3 text-meta text-amber-900">
              <strong className="font-bold">A few corrections are needed.</strong> Your answers are
              still here — change what needs changing and save again.
            </p>
          ) : (
            <p className="text-intro text-ink-soft text-pretty">
              Your pricing is agreed. This is the application itself: your prescribers and their
              licences, the practice, and the legal entity we invoice. It takes about ten minutes
              and saves as you type.
            </p>
          )}

          <div className="mt-8">
            <AccountDetailsForm
              defaults={{ ...fromRecord, ...draft }}
              practiceState={application?.practiceState ?? null}
            />
          </div>
        </>
      )}
    </PortalShell>
  );
}

/** A read-back of what was submitted, once the form is closed. */
function SubmittedSummary({
  application,
  submittedAt,
}: {
  application: { practiceName: string; practiceCity: string | null; practiceState: string | null } | null;
  submittedAt: Date | null;
}) {
  return (
    <section className="mt-8 rounded-tile border border-line bg-sand p-6">
      <h2 className="text-[1.0625rem] font-bold text-ink">What we hold</h2>
      {submittedAt && (
        <p className="mt-1 text-caption text-ink-muted">
          Submitted {displayDate(submittedAt)}.
        </p>
      )}
      <p className="mt-4 text-meta text-ink">
        {application?.practiceName}
        {application?.practiceCity && (
          <span className="block text-ink-soft">
            {[application.practiceCity, application.practiceState].filter(Boolean).join(", ")}
          </span>
        )}
      </p>
      <p className="mt-6 border-t border-line pt-4 text-caption text-ink-muted">
        Prescriber identifiers and your card number are encrypted and shown as their last four
        digits only. The card&rsquo;s security code is never stored. To change anything here,{" "}
        <Link href="/support" className="link-arrow">
          contact your account representative
        </Link>
        .
      </p>
    </section>
  );
}
