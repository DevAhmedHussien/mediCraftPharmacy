"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireOwnPartner } from "@/lib/guard";
import { PARTNER_STATUS } from "@/lib/partner/status";
import { identitySchema, type IdentityValues } from "@/lib/schemas/identity";
import { applyTransition } from "@/lib/services/transition";

/* ===========================================================================
   Submitting the identity check.

   The photo ID is uploaded through the same presigned path the onboarding
   documents use — see app/(site)/portal/documents/actions.ts. This action only
   confirms that one exists before moving the pipeline on, because a form
   without the ID is the half that does not prove anything.
   ========================================================================= */

export type IdentityResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
};

export async function submitIdentity(values: IdentityValues): Promise<IdentityResult> {
  const { session, partnerId } = await requireOwnPartner();

  const parsed = identitySchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] ??= issue.message;
    }
    return { ok: false, message: "Some fields need attention.", fieldErrors };
  }

  const data = parsed.data;

  const idDocument = await db.partnerDocument.count({
    where: { partnerId, type: "GOVERNMENT_ID", status: { not: "REJECTED" } },
  });
  if (idDocument === 0) {
    return {
      ok: false,
      message: "Upload a photo of your government-issued ID before submitting.",
    };
  }

  await db.partnerApplication.update({
    where: { partnerId },
    data: {
      requesterName: data.requesterName,
      requesterTitle: data.requesterTitle,
      requesterPhone: data.requesterPhone,
      requesterEmail: data.requesterEmail,
      requesterNote: data.requesterNote || null,
      identitySubmittedAt: new Date(),
    },
  });

  try {
    await applyTransition({
      partnerId,
      to: PARTNER_STATUS.IDENTITY_SUBMITTED,
      actor: "PARTNER",
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: "PARTNER",
      note: `Identity submitted by ${data.requesterName}.`,
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  revalidatePath("/portal");
  revalidatePath("/portal/identity");

  return {
    ok: true,
    message: "Thank you — we are confirming your details now.",
    redirectTo: "/portal",
  };
}
