"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@prisma/client";

import { sealField } from "@/lib/crypto";
import { db } from "@/lib/db";
import { requireOwnPartner } from "@/lib/guard";
import { PARTNER_STATUS } from "@/lib/partner/status";
import {
  accountDetailsSchema,
  MAX_DRAFT_BYTES,
  type AccountDetailsValues,
} from "@/lib/schemas/account-details";
import { applyTransition } from "@/lib/services/transition";

/* ===========================================================================
   The applicant's full account details.

   Two entry points: an autosave that stores whatever has been typed so far,
   and a submit that validates the lot and moves the pipeline on to documents.

   THE DRAFT AND THE REAL COLUMNS ARE SEPARATE ON PURPOSE. Autosave writes to
   `PartnerOnboarding.draft` (JSON); submit validates and promotes into the
   typed columns and the prescriber rows. A half-filled draft can therefore
   never fail a NOT NULL constraint, and nothing downstream can mistake a
   draft for submitted data.

   EVERY QUERY IS SCOPED BY `partnerId` FROM THE SESSION, never from the
   payload — `requireOwnPartner` resolves it from the signed-in user, so a
   partner cannot address another partner's record by editing a form field.
   ========================================================================= */

export type AccountDetailsResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
};

/** The only statuses in which the form is editable, and so draftable. */
const DRAFTABLE = [
  PARTNER_STATUS.ONBOARDING_IN_PROGRESS,
  PARTNER_STATUS.ONBOARDING_CHANGES_REQUESTED,
] as const;

export async function saveAccountDetailsDraft(
  values: AccountDetailsValues
): Promise<{ ok: boolean }> {
  const { partnerId } = await requireOwnPartner();

  // Unvalidated by design (see MAX_DRAFT_BYTES) — but not unbounded.
  if (JSON.stringify(values ?? {}).length > MAX_DRAFT_BYTES) return { ok: false };

  /* Refuse once the form has closed.
   *
   * Autosave is debounced by two seconds, so pressing submit leaves a timer
   * already in flight: it lands a moment AFTER the transaction that promoted
   * the answers and cleared the draft, and writes the whole lot back. The next
   * page load then layers that stale draft over the submitted record. The
   * client clears its own timer too, but a timer is a courtesy — this is the
   * part that cannot be raced. */
  const partner = await db.partner.findUnique({
    where: { id: partnerId },
    select: { status: true },
  });
  if (!partner || !DRAFTABLE.includes(partner.status as never)) return { ok: false };

  await db.partnerOnboarding.upsert({
    where: { partnerId },
    update: { draft: values as never },
    create: { partnerId, draft: values as never },
  });

  return { ok: true };
}

export async function submitAccountDetails(
  values: AccountDetailsValues
): Promise<AccountDetailsResult> {
  const { session, partnerId } = await requireOwnPartner();

  const parsed = accountDetailsSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] ??= issue.message;
    }
    return { ok: false, message: "Some fields need attention.", fieldErrors };
  }

  const data = parsed.data;

  // Regulated identifiers are encrypted before they touch a row; only the last
  // four stay in the clear, for an admin to eyeball against a document without
  // a decrypt call.
  const ein = sealField(data.ein);

  // Copied on the server, not the client — a tampered payload must not be able
  // to store a billing address the applicant never saw.
  const billing = data.billingSameAsBusiness
    ? {
        billingStreet: data.businessStreet,
        billingSuite: data.businessSuite || null,
        billingCity: data.businessCity,
        billingState: data.businessState,
        billingZip: data.businessZip,
      }
    : {
        billingStreet: data.billingStreet || null,
        billingSuite: data.billingSuite || null,
        billingCity: data.billingCity || null,
        billingState: data.billingState || null,
        billingZip: data.billingZip || null,
      };

  const onboardingFields = {
    legalBusinessName: data.legalBusinessName,
    dba: data.dba || null,
    einCiphertext: ein.ciphertext,
    einLast4: ein.last4,
    businessStreet: data.businessStreet,
    businessSuite: data.businessSuite || null,
    businessCity: data.businessCity,
    businessState: data.businessState,
    businessZip: data.businessZip,
    ...billing,
    statesOfOperation: data.statesOfOperation,
    signerName: data.signerName,
    signerTitle: data.signerTitle,
    signerEmail: data.signerEmail,
    submittedAt: new Date(),
  };

  const applicationFields = {
    accountType: data.accountType === "new" ? ("NEW" as const) : ("EXISTING" as const),
    howDidYouHearAboutUs: data.howDidYouHearAboutUs || null,
    medicraftRep: data.medicraftPharmacyRep || null,
    practiceName: data.practice.name,
    isPrimaryLocation: data.practice.isPrimaryLocation,
    practiceAddress: data.practice.address || null,
    practiceCity: data.practice.city || null,
    practiceState: data.practice.state || null,
    practiceZip: data.practice.zip || null,
    practicePhone: data.practice.phone ?? null,
    practiceFax: data.practice.fax ?? null,
    officeContactName: data.practice.officeContact?.name || null,
    officeContactPhone: data.practice.officeContact?.phone ?? null,
    officeContactEmail: data.practice.officeContact?.email || null,
    rxQuestionsEmail: data.communicationsPreference?.prescriptionQuestions?.email || null,
    rxQuestionsPhone: data.communicationsPreference?.prescriptionQuestions?.phone ?? null,
    shippingEmail: data.communicationsPreference?.shippingTracking?.email || null,
    shippingFax: data.communicationsPreference?.shippingTracking?.fax ?? null,
    invoicesEmail: data.communicationsPreference?.invoicesReceipts?.email || null,
    invoicesFax: data.communicationsPreference?.invoicesReceipts?.fax ?? null,
    completedAt: new Date(),
  };

  try {
    await db.$transaction(async (tx) => {
      const application = await tx.partnerApplication.upsert({
        where: { partnerId },
        update: applicationFields,
        create: { partnerId, ...applicationFields },
      });

      /* Prescribers are replaced wholesale rather than diffed. They are
         identified by position on a paper form, not by a stable id, so a diff
         would have to guess whether "row 2 changed" means an edit or a
         replacement — and guessing wrong leaves an unrelated DEA number
         attached to a name. */
      await tx.prescriber.deleteMany({ where: { applicationId: application.id } });

      for (const [index, prescriber] of data.prescribers.entries()) {
        const dea = prescriber.deaNumber ? sealField(prescriber.deaNumber) : null;
        const npi = prescriber.npi ? sealField(prescriber.npi) : null;
        const licence = prescriber.stateLicenseNumber
          ? sealField(prescriber.stateLicenseNumber)
          : null;

        await tx.prescriber.create({
          data: {
            applicationId: application.id,
            position: index,
            name: prescriber.name,
            signatureText: prescriber.signature,
            signedAt: new Date(),
            deaCiphertext: dea?.ciphertext ?? null,
            deaLast4: dea?.last4 ?? null,
            deaExpiration: prescriber.deaExpiration ? new Date(prescriber.deaExpiration) : null,
            npiCiphertext: npi?.ciphertext ?? null,
            npiLast4: npi?.last4 ?? null,
            stateLicenseCiphertext: licence?.ciphertext ?? null,
            stateLicenseLast4: licence?.last4 ?? null,
          },
        });
      }

      const onboarding = await tx.partnerOnboarding.upsert({
        where: { partnerId },
        update: {
          ...onboardingFields,
          /* `Prisma.DbNull`, not `null` and not `undefined`. On a Json column
             `undefined` means "leave this alone" and plain `null` means the
             JSON value `null` — only DbNull writes a SQL NULL, which is what
             "no draft" has to be for the page's `draft ?? {}` to fall through. */
          draft: Prisma.DbNull,
        },
        create: { partnerId, ...onboardingFields },
      });

      // A licence belongs in its own row so the expiry-reminder job has
      // something to index, and so the uploaded document can point at it.
      if (data.pharmacyLicenseNumber) {
        const sealed = sealField(data.pharmacyLicenseNumber);
        await tx.partnerLicense.deleteMany({
          where: { onboardingId: onboarding.id, type: "PHARMACY_LICENSE" },
        });
        await tx.partnerLicense.create({
          data: {
            onboardingId: onboarding.id,
            type: "PHARMACY_LICENSE",
            state: data.pharmacyLicenseState || null,
            numberCiphertext: sealed.ciphertext,
            numberLast4: sealed.last4,
            expiresAt: data.pharmacyLicenseExpires
              ? new Date(data.pharmacyLicenseExpires)
              : null,
          },
        });
      }
    });
  } catch (error) {
    console.error("[account-details] save failed", error);
    return { ok: false, message: "We could not save your details. Please try again." };
  }

  /* Only transition while they are still filling this in. Someone sent back
     for corrections is in ONBOARDING_CHANGES_REQUESTED and resubmits from the
     documents page; moving them here would take them backwards. */
  const partner = await db.partner.findUnique({
    where: { id: partnerId },
    select: { status: true },
  });

  if (partner?.status === PARTNER_STATUS.ONBOARDING_IN_PROGRESS) {
    try {
      await applyTransition({
        partnerId,
        to: PARTNER_STATUS.DOCUMENTS_PENDING,
        actor: "PARTNER",
        actorId: session.user.id,
        actorEmail: session.user.email ?? undefined,
        actorRole: "PARTNER",
        note: "Account details completed.",
      });
    } catch (error) {
      if (error instanceof Error && "httpStatus" in error) {
        return { ok: false, message: error.message };
      }
      throw error;
    }
  }

  revalidatePath("/portal");
  revalidatePath("/portal/onboarding");
  revalidatePath("/portal/documents");

  return {
    ok: true,
    message: "Saved. One step left — your documents.",
    redirectTo: "/portal/documents",
  };
}

/**
 * Move an applicant who has just accepted pricing into the onboarding stage.
 *
 * SYSTEM-driven, fired the first time they open the form. Idempotent: calling
 * it when they are already past this point is a no-op rather than an error.
 */
export async function beginOnboarding(): Promise<void> {
  const { partnerId } = await requireOwnPartner();

  const partner = await db.partner.findUnique({
    where: { id: partnerId },
    select: { status: true },
  });

  if (partner?.status !== PARTNER_STATUS.PRICING_PARTNER_ACCEPTED) return;

  await applyTransition({
    partnerId,
    to: PARTNER_STATUS.ONBOARDING_IN_PROGRESS,
    actor: "SYSTEM",
    note: "Applicant opened the account details form.",
  });

  revalidatePath("/portal");
  revalidatePath("/portal/onboarding");
}
