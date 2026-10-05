import "server-only";

import { db } from "@/lib/db";
import { displayDate } from "@/lib/masks";
import { buildMsaPdf, type ClientProfile, type PriceLine } from "@/lib/services/msa-pdf";

/* ===========================================================================
   Assembling a partner's agreement.

   Pulls together the three things the PDF needs — who the Client is, what they
   agreed to pay, and whether it has been signed — and hands them to the
   generator. Kept apart from msa-pdf.ts so that file stays a pure document
   builder with no idea what a Partner is.
   ========================================================================= */

/* Enum members are storage, not prose. A contract that calls a practice a
   SMALL_PHARMACY reads like a database dump, which is what it would be. */
const BUSINESS_TYPE_LABEL: Record<string, string> = {
  TELEHEALTH: "Telehealth practice",
  EMR: "EMR / platform",
  SMALL_PHARMACY: "Pharmacy",
};

const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  GOVERNMENT_ID: "Government photo ID",
  PHARMACY_LICENSE: "Pharmacy licence",
  DEA_REGISTRATION: "DEA registration",
  NPI_CONFIRMATION: "NPI confirmation",
  STATE_LICENSE: "State licence",
  W9: "W-9",
  CERTIFICATE_OF_INSURANCE: "Certificate of insurance",
  BUSINESS_REGISTRATION: "Business registration",
  OTHER: "Other",
};

/**
 * @param envelopeId Which signed agreement to render. Omitted, the most
 *   recent one is used — which is what a partner with one agreement means by
 *   "my agreement". A partner with change orders has several, and each one
 *   has to render against ITS OWN signature rather than the newest: a change
 *   order downloaded from the history must show who signed that one, and when.
 */
export async function buildAgreementFor(
  partnerId: string,
  envelopeId?: string
): Promise<{
  bytes: Uint8Array;
  filename: string;
  signed: boolean;
} | null> {
  const partner = await db.partner.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      companyName: true,
      contactName: true,
      phone: true,
      businessType: true,
      user: { select: { email: true } },
      onboarding: {
        select: {
          legalBusinessName: true,
          dba: true,
          businessStreet: true,
          businessSuite: true,
          businessCity: true,
          businessState: true,
          businessZip: true,
          billingStreet: true,
          billingSuite: true,
          billingCity: true,
          billingState: true,
          billingZip: true,
          statesOfOperation: true,
          signerName: true,
          signerTitle: true,
          signerEmail: true,
          /* Last four only. Nothing here decrypts anything: Exhibit C
             identifies what the agreement covers, and a signed PDF gets
             forwarded and printed in ways the database never is. */
          licenses: {
            select: {
              type: true,
              state: true,
              numberLast4: true,
              expiresAt: true,
            },
          },
        },
      },
      application: {
        select: {
          practiceName: true,
          requesterTitle: true,
          accountType: true,
          medicraftRep: true,
          howDidYouHearAboutUs: true,
          prescribers: {
            orderBy: { position: "asc" },
            select: {
              name: true,
              deaLast4: true,
              deaExpiration: true,
              npiLast4: true,
              stateLicenseLast4: true,
            },
          },
        },
      },
      msaEnvelopes: {
        where: envelopeId ? { id: envelopeId } : undefined,
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          status: true,
          signedName: true,
          completedAt: true,
          agreementHash: true,
          signedIp: true,
        },
      },
      /* The price book, which is what they actually agreed. Falls back to the
         accepted price list when the book has not been written yet — a partner
         reading the agreement before verification should still see their own
         numbers rather than an empty schedule. */
      pricing: {
        orderBy: { product: { name: "asc" } },
        select: {
          price: true,
          product: {
            select: {
              name: true,
              strength: true,
              form: true,
              packageSize: true,
              listPrice: true,
              unit: true,
            },
          },
        },
      },
    },
  });

  if (!partner) return null;

  const onboarding = partner.onboarding;
  const address = [
    onboarding?.businessStreet,
    onboarding?.businessSuite,
    [onboarding?.businessCity, onboarding?.businessState, onboarding?.businessZip]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join(", ");

  const lines: PriceLine[] = partner.pricing.map((row) => {
    const list = row.product.listPrice;
    const paid = row.price;
    // Derived rather than stored: the discount is whatever the gap between
    // list and agreed turns out to be, so it cannot disagree with the numbers
    // either side of it.
    const discount = Number(list) > 0
      ? (((Number(list) - Number(paid)) / Number(list)) * 100).toFixed(2)
      : "0";

    return {
      name: row.product.name,
      strength: row.product.strength,
      form: row.product.form,
      packageSize: row.product.packageSize,
      listPrice: list.toString(),
      discountPercent: Number(discount) > 0 ? discount : null,
      finalPrice: paid.toString(),
      unit: row.product.unit,
    };
  });

  const envelope = partner.msaEnvelopes[0];
  const executed = envelope?.status === "COMPLETED" && envelope.completedAt;

  const billing = [
    onboarding?.billingStreet,
    onboarding?.billingSuite,
    [onboarding?.billingCity, onboarding?.billingState, onboarding?.billingZip]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join(", ");

  const application = partner.application;

  const profile: ClientProfile = {
    tradingName: onboarding?.dba ?? null,
    // Enum to prose. The stored value is SMALL_PHARMACY; nobody signs that.
    businessType: BUSINESS_TYPE_LABEL[partner.businessType] ?? null,
    businessAddress: address || null,
    // Null, not the business address: the Exhibit says "Same as business
    // address" for itself, and copying the text would hide the fact that the
    // partner never gave a separate one.
    billingAddress: billing || null,
    statesOfOperation: onboarding?.statesOfOperation ?? [],
    accountType: application?.accountType === "EXISTING" ? "Existing account" : application?.accountType === "NEW" ? "New account" : null,
    medicraftRep: application?.medicraftRep ?? null,
    howHeard: application?.howDidYouHearAboutUs ?? null,
    signer: {
      name: onboarding?.signerName ?? partner.contactName,
      title: onboarding?.signerTitle ?? application?.requesterTitle ?? null,
      email: onboarding?.signerEmail ?? partner.user.email,
    },
    prescribers:
      application?.prescribers.map((p) => ({
        name: p.name,
        deaLast4: p.deaLast4,
        deaExpiration: p.deaExpiration ? displayDate(p.deaExpiration) : null,
        npiLast4: p.npiLast4,
        stateLicenseLast4: p.stateLicenseLast4,
      })) ?? [],
    licenses:
      onboarding?.licenses.map((l) => ({
        type: DOCUMENT_TYPE_LABEL[l.type] ?? l.type,
        state: l.state,
        numberLast4: l.numberLast4,
        expiresAt: l.expiresAt ? displayDate(l.expiresAt) : null,
      })) ?? [],
  };

  const bytes = await buildMsaPdf({
    companyName: partner.application?.practiceName ?? partner.companyName,
    fields: {
      legalName: onboarding?.legalBusinessName ?? partner.companyName,
      address: address || null,
      contact: [onboarding?.signerName ?? partner.contactName, onboarding?.signerTitle]
        .filter(Boolean)
        .join(", "),
      email: onboarding?.signerEmail ?? partner.user.email,
      phone: partner.phone,
    },
    lines,
    profile,
    signature: executed
      ? {
          signedName: envelope.signedName ?? partner.contactName,
          signedTitle: onboarding?.signerTitle ?? partner.application?.requesterTitle ?? null,
          signedAt: envelope.completedAt!,
          agreementHash: envelope.agreementHash ?? "",
          ip: envelope.signedIp,
        }
      : null,
  });

  const slug = (partner.application?.practiceName ?? partner.companyName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return {
    bytes,
    filename: `medicraft-msa-${slug}${executed ? "-signed" : ""}.pdf`,
    signed: Boolean(executed),
  };
}

/* ===========================================================================
   A change order's own PDF.

   `buildAgreementFor` renders the Master Service Agreement. A change order
   asked for by envelope id used to come back from that same function — the
   MSA body, stamped with the change order's signature and the change order's
   hash. The hash would not verify against the text printed above it, which is
   exactly the property a stored hash exists to provide.

   So a change-order envelope gets the change order. Same route, same
   ownership check, different document — see app/api/agreement/[partnerId].
   ========================================================================= */

export async function buildChangeOrderFor(
  partnerId: string,
  envelopeId: string
): Promise<{ bytes: Uint8Array; filename: string; signed: boolean } | null> {
  const amendment = await db.formularyAmendment.findFirst({
    where: { partnerId, msaEnvelope: { id: envelopeId } },
    select: {
      id: true,
      number: true,
      partner: {
        select: {
          companyName: true,
          contactName: true,
          application: { select: { practiceName: true, requesterTitle: true } },
          onboarding: { select: { signerTitle: true } },
        },
      },
      msaEnvelope: {
        select: {
          status: true,
          signedName: true,
          completedAt: true,
          agreementHash: true,
          signedIp: true,
        },
      },
    },
  });

  if (!amendment?.msaEnvelope) return null;

  /* Rebuilt from the amendment, exactly as the signing page and the issuing
     action build it. Three callers, one function — a fourth rendering would
     be a fourth chance for the printed text and the signed text to differ. */
  const { buildChangeOrderText } = await import("@/lib/services/amendments");
  const text = await buildChangeOrderText(amendment.id);
  if (!text) return null;

  const envelope = amendment.msaEnvelope;
  const executed = envelope.status === "COMPLETED" && envelope.completedAt;
  const partner = amendment.partner;

  const { buildChangeOrderPdf } = await import("@/lib/services/change-order-pdf");
  const bytes = await buildChangeOrderPdf({
    text,
    number: amendment.number,
    companyName: partner.application?.practiceName ?? partner.companyName,
    signature: executed
      ? {
          signedName: envelope.signedName ?? partner.contactName,
          signedTitle:
            partner.onboarding?.signerTitle ?? partner.application?.requesterTitle ?? null,
          signedAt: envelope.completedAt!,
          agreementHash: envelope.agreementHash ?? "",
          ip: envelope.signedIp,
        }
      : null,
  });

  const slug = (partner.application?.practiceName ?? partner.companyName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return {
    bytes,
    filename: `medicraft-change-order-${amendment.number}-${slug}${executed ? "-signed" : ""}.pdf`,
    signed: Boolean(executed),
  };
}
