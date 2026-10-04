"use server";

import { revalidatePath } from "next/cache";

import type { DocumentType } from "@prisma/client";

import { db } from "@/lib/db";
import { requireOwnPartner } from "@/lib/guard";
import { missingRequired, specFor } from "@/lib/partner/documents";
import { PARTNER_STATUS } from "@/lib/partner/status";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import {
  assertUploadAllowed,
  buildKey,
  driverFor,
  storage,
  StorageError,
} from "@/lib/services/storage";
import { applyTransition } from "@/lib/services/transition";

/* ===========================================================================
   Document uploads.

   THREE CALLS, AND THE MIDDLE ONE NEVER TOUCHES OUR SERVER. `requestUpload`
   decides whether this partner may upload this kind of file and hands back a
   short-lived URL; the browser PUTs the bytes straight to storage;
   `confirmUpload` records the row. A 25 MB PDF posted through a server action
   would count against the body limit, the function timeout and the bill, for
   no benefit — the only part that needs a server is the decision.

   OWNERSHIP IS DERIVED, NEVER ACCEPTED. Every function here resolves
   `partnerId` from the session and builds the object key under that partner's
   own prefix. A payload cannot name a different partner, and `confirmUpload`
   re-checks the prefix rather than trusting the key it is handed back — the
   key makes a round trip through the client, so it is client input by the
   time it returns.
   ========================================================================= */

const prefixFor = (partnerId: string) => `partners/${partnerId}/documents`;

export type UploadGrant =
  | { ok: true; url: string; headers: Record<string, string>; key: string }
  | { ok: false; message: string };

export async function requestUpload(input: {
  type: DocumentType;
  filename: string;
  mime: string;
  size: number;
}): Promise<UploadGrant> {
  const { partnerId } = await requireOwnPartner();

  if (!specFor(input.type)) {
    return { ok: false, message: "That is not a document type we accept." };
  }

  // Each grant is a writable URL, so the grant itself is the thing to limit.
  const limit = rateLimit(`upload:${partnerId}`, RATE_LIMITS.upload);
  if (!limit.ok) {
    return { ok: false, message: "Too many uploads at once. Please wait a few minutes." };
  }

  try {
    assertUploadAllowed(input.mime, input.size, "document");
  } catch (error) {
    if (error instanceof StorageError) return { ok: false, message: error.message };
    throw error;
  }

  const key = buildKey(prefixFor(partnerId), input.filename);
  const presigned = await storage.presignUpload(key, input.mime, input.size);

  return { ok: true, url: presigned.url, headers: presigned.headers, key: presigned.key };
}

export async function confirmUpload(input: {
  type: DocumentType;
  key: string;
  filename: string;
  mime: string;
  size: number;
}): Promise<{ ok: boolean; message?: string }> {
  const { partnerId } = await requireOwnPartner();

  // The key went out to the browser and came back, so it is client input now.
  if (!input.key.startsWith(`${prefixFor(partnerId)}/`)) {
    return { ok: false, message: "That upload does not belong to this account." };
  }
  if (!specFor(input.type)) {
    return { ok: false, message: "That is not a document type we accept." };
  }

  try {
    assertUploadAllowed(input.mime, input.size, "document");
  } catch (error) {
    if (error instanceof StorageError) return { ok: false, message: error.message };
    throw error;
  }

  await db.partnerDocument.create({
    data: {
      partnerId,
      type: input.type,
      driver: storage.name,
      s3Key: input.key,
      // Never rendered as HTML, but it is displayed, so it is trimmed and
      // capped rather than stored at whatever length a client claims.
      filename: input.filename.slice(0, 255),
      mime: input.mime,
      size: input.size,
      status: "PENDING_REVIEW",
    },
  });

  revalidatePath("/portal/documents");
  return { ok: true };
}

export async function removeDocument(documentId: string): Promise<{ ok: boolean; message?: string }> {
  const { partnerId } = await requireOwnPartner();

  /* Scoped by partnerId in the WHERE, not checked after the fact — a
     findUnique-then-compare leaks existence through timing and through the
     shape of the error. */
  const document = await db.partnerDocument.findFirst({
    where: { id: documentId, partnerId },
    select: { id: true, s3Key: true, status: true },
  });

  if (!document) return { ok: false, message: "That document could not be found." };
  if (document.status === "ACCEPTED") {
    return { ok: false, message: "A reviewer has already accepted this one. Contact us to change it." };
  }

  await db.partnerDocument.delete({ where: { id: document.id } });
  // Best-effort: an orphaned object costs pennies, a failed delete that rolls
  // back the row costs the applicant their ability to replace the file.
  await storage.remove(document.s3Key).catch(() => undefined);

  revalidatePath("/portal/documents");
  return { ok: true };
}

export async function submitDocuments(): Promise<{ ok: boolean; message: string; redirectTo?: string }> {
  const { session, partnerId } = await requireOwnPartner();

  const partner = await db.partner.findUnique({
    where: { id: partnerId },
    select: { status: true, documents: { select: { type: true, status: true } } },
  });
  if (!partner) return { ok: false, message: "No partner record is linked to this account." };

  // The same rule the checklist draws, enforced where it counts.
  const missing = missingRequired(partner.documents);
  if (missing.length > 0) {
    const names = missing.map((type) => specFor(type)?.label ?? type);
    return {
      ok: false,
      message: `Still needed: ${names.join(", ")}.`,
    };
  }

  const to = PARTNER_STATUS.ONBOARDING_SUBMITTED;

  try {
    await applyTransition({
      partnerId,
      to,
      actor: "PARTNER",
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: "PARTNER",
      note: "Documents submitted for review.",
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  revalidatePath("/portal");
  revalidatePath("/portal/documents");

  return {
    ok: true,
    message: "Submitted. We will review everything and come back within one to two business days.",
    redirectTo: "/portal",
  };
}

/** A short-lived link the owner can use to check what they uploaded. */
export async function documentDownloadUrl(documentId: string): Promise<string | null> {
  const { partnerId } = await requireOwnPartner();

  const document = await db.partnerDocument.findFirst({
    where: { id: documentId, partnerId },
    select: { s3Key: true, filename: true, driver: true },
  });
  if (!document) return null;

  return driverFor(document.driver).presignDownload(document.s3Key, document.filename);
}
