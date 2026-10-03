"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { driverFor } from "@/lib/services/storage";

/* ===========================================================================
   A reviewer's verdict on one uploaded document.

   `requirePermission("onboarding.review")` re-queries the database rather than
   trusting the JWT: an admin whose permission was revoked this morning must
   not still be accepting licences this afternoon on the strength of a token
   issued before lunch.
   ========================================================================= */

export type ReviewResult = { ok: boolean; message: string };

export async function reviewDocument(input: {
  documentId: string;
  decision: "ACCEPTED" | "REJECTED";
  comment?: string;
}): Promise<ReviewResult> {
  const session = await requirePermission("onboarding.review");

  const document = await db.partnerDocument.findUnique({
    where: { id: input.documentId },
    select: { id: true, partnerId: true, type: true, filename: true },
  });
  if (!document) return { ok: false, message: "That document could not be found." };

  const comment = input.comment?.trim().slice(0, 500) || null;

  if (input.decision === "REJECTED" && !comment) {
    // A rejection without a reason sends the applicant back to a page that
    // tells them something is wrong and not what.
    return { ok: false, message: "Tell them what was wrong with it." };
  }

  await db.$transaction([
    db.partnerDocument.update({
      where: { id: document.id },
      data: {
        status: input.decision,
        reviewerComment: comment,
        reviewedById: session.user.id,
      },
    }),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        actorEmail: session.user.email ?? null,
        action: `document.${input.decision.toLowerCase()}`,
        entityType: "PartnerDocument",
        entityId: document.id,
        metadata: {
          partnerId: document.partnerId,
          type: document.type,
          // The filename, not the contents and not the object key.
          filename: document.filename,
          ...(comment ? { comment } : {}),
        },
      },
    }),
  ]);

  revalidatePath(`/admin/partners/${document.partnerId}`);
  return { ok: true, message: `Marked ${input.decision.toLowerCase()}.` };
}

/** A short-lived link for a reviewer to open one document. */
export async function adminDocumentUrl(documentId: string): Promise<string | null> {
  await requirePermission("partners.view");

  const document = await db.partnerDocument.findUnique({
    where: { id: documentId },
    select: { s3Key: true, filename: true, driver: true },
  });
  if (!document) return null;

  return driverFor(document.driver).presignDownload(document.s3Key, document.filename);
}
