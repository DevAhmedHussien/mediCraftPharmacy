import "server-only";

import type { SiteInquiryKind } from "@prisma/client";

import { decryptField, encryptField } from "@/lib/crypto";
import { db } from "@/lib/db";

/* ===========================================================================
   What the public forms do now that they do something.

   Contact, refill and careers each ended in `console.log` and a success
   message. Nothing was delivered, so a patient asking for a refill was told it
   had been received when it had not — and the refill line wrote a named
   patient, their date of birth and their medication into the host's plaintext
   logs, which is a HIPAA problem rather than a tidiness one.

   THE SUBMISSION IS SEALED, THE NOTIFICATION IS NOT THE SUBMISSION.
   A refill request is protected health information. It is encrypted with the
   same field-level envelope the prescriber identifiers use, and the email that
   tells staff it arrived carries a type and a link and nothing else — the rule
   the partner pipeline already follows. Nobody's medication list goes into an
   inbox, a log, or a subject line.
   ========================================================================= */

export type InquiryInput = {
  kind: SiteInquiryKind;
  /** Safe to store in the clear — enough to recognise and reply. */
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  /** The whole submission. Sealed. */
  payload: Record<string, unknown>;
  ip?: string | null;
};

/** A refill names a patient and their medication; the rest do not. */
const PHI_KINDS: SiteInquiryKind[] = ["REFILL"];

export async function recordInquiry(input: InquiryInput) {
  const isPhi = PHI_KINDS.includes(input.kind);

  return db.siteInquiry.create({
    data: {
      kind: input.kind,
      /* On a refill even the name is PHI in context — "who asked us for
         oxycodone" is the disclosure. Contact details for the other kinds stay
         legible so staff can reply without decrypting anything. */
      name: isPhi ? null : input.name || null,
      email: isPhi ? null : input.email || null,
      phone: isPhi ? null : input.phone || null,
      subject: isPhi ? null : input.subject || null,
      payloadCiphertext: encryptField(JSON.stringify(input.payload)),
      isPhi,
      ip: input.ip ?? null,
    },
    select: { id: true, kind: true, createdAt: true },
  });
}

export type InquiryRow = {
  id: string;
  kind: SiteInquiryKind;
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  isPhi: boolean;
  status: string;
  createdAt: Date;
};

export async function listInquiries(params: { kind?: SiteInquiryKind; status?: string } = {}) {
  return db.siteInquiry.findMany({
    where: {
      ...(params.kind ? { kind: params.kind } : {}),
      ...(params.status && params.status !== "all" ? { status: params.status as never } : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      kind: true,
      name: true,
      email: true,
      phone: true,
      subject: true,
      isPhi: true,
      status: true,
      createdAt: true,
    },
  });
}

/**
 * Open one submission.
 *
 * Decrypting is a deliberate act by a signed-in member of staff on one record,
 * rather than a list view that quietly renders four hundred patients' details
 * to anyone who opens the page.
 */
export async function openInquiry(id: string) {
  const row = await db.siteInquiry.findUnique({
    where: { id },
    select: {
      id: true,
      kind: true,
      isPhi: true,
      status: true,
      createdAt: true,
      payloadCiphertext: true,
    },
  });
  if (!row) return null;

  return {
    ...row,
    payload: JSON.parse(decryptField(row.payloadCiphertext)) as Record<string, unknown>,
  };
}

export async function setInquiryStatus(id: string, status: "NEW" | "HANDLED" | "SPAM", userId: string) {
  await db.siteInquiry.update({
    where: { id },
    data: {
      status,
      handledAt: status === "NEW" ? null : new Date(),
      handledById: status === "NEW" ? null : userId,
    },
  });
}

export async function countNewInquiries() {
  return db.siteInquiry.count({ where: { status: "NEW" } });
}
