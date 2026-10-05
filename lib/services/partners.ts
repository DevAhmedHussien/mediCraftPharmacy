import "server-only";

import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import type { PartnerStatus } from "@/lib/partner/status";

/* Partner pipeline reads for the admin.

   Nothing here decrypts. Prescriber identifiers come back as their stored
   last-four only, which is all an admin needs to match a row against a
   document — and it means a compromised admin session cannot bulk-export DEA
   numbers through a list endpoint. Full values need a deliberate, audited
   single-record reveal, which is not built yet. */

export async function listPartners(params: {
  status?: PartnerStatus | "all";
  q?: string;
  limit?: number;
}) {
  const { status = "all", q, limit = 100 } = params;

  const where: Prisma.PartnerWhereInput = {
    ...(status !== "all" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  return db.partner.findMany({
    where,
    // Oldest-waiting first: the thing an admin most needs to see is whoever
    // has been sitting in an actionable status longest, not the newest signup.
    orderBy: { statusChangedAt: "asc" },
    take: limit,
    select: {
      id: true,
      companyName: true,
      contactName: true,
      businessType: true,
      status: true,
      statusChangedAt: true,
      createdAt: true,
      user: { select: { email: true } },
      application: { select: { practiceName: true, practiceState: true } },
    },
  });
}

export async function getPartnerDetail(id: string) {
  return db.partner.findUnique({
    where: { id },
    select: {
      id: true,
      companyName: true,
      contactName: true,
      phone: true,
      businessType: true,
      status: true,
      statusChangedAt: true,
      createdAt: true,
      verifiedAt: true,
      rejectedReason: true,
      suspendedReason: true,
      user: { select: { email: true, lastLoginAt: true } },
      /* Uploaded licences and photo ID. The object key is deliberately absent:
         a reviewer opens each one through a presigned link fetched per click,
         so the path never reaches the browser. */
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
        },
      },

      /* The account details the applicant fills in AFTER pricing is agreed.
         Ciphertext columns are omitted exactly as they are for prescribers —
         an admin matching a W-9 needs the last four, never the whole EIN. */
      onboarding: {
        select: {
          legalBusinessName: true,
          dba: true,
          cardholderName: true,
          cardBrand: true,
          cardLast4: true,
          cardExpMonth: true,
          cardExpYear: true,
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
          submittedAt: true,
          licenses: {
            select: { type: true, state: true, numberLast4: true, expiresAt: true },
          },
        },
      },
      application: {
        select: {
          // Who asked for the price list, and whether anyone has checked.
          requesterName: true,
          requesterTitle: true,
          requesterPhone: true,
          requesterEmail: true,
          requesterNote: true,
          identitySubmittedAt: true,
          identityVerifiedAt: true,

          accountType: true,
          howDidYouHearAboutUs: true,
          medicraftRep: true,
          practiceName: true,
          isPrimaryLocation: true,
          practiceAddress: true,
          practiceCity: true,
          practiceState: true,
          practiceZip: true,
          practicePhone: true,
          practiceFax: true,
          officeContactName: true,
          officeContactPhone: true,
          officeContactEmail: true,
          rxQuestionsEmail: true,
          rxQuestionsPhone: true,
          shippingEmail: true,
          shippingFax: true,
          invoicesEmail: true,
          invoicesFax: true,
          submittedAt: true,
          prescribers: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              position: true,
              name: true,
              signatureText: true,
              signedAt: true,
              // Ciphertext columns are deliberately absent — see the note above.
              deaLast4: true,
              deaExpiration: true,
              npiLast4: true,
              stateLicenseLast4: true,
            },
          },
        },
      },
    },
  });
}

/** Counts for the pipeline filter chips. */
export async function countByStatus() {
  const rows = await db.partner.groupBy({ by: ["status"], _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Record<string, number>;
}
