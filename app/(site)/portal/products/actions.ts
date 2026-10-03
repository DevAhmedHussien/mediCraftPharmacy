"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/forms";
import { requireOwnPartner } from "@/lib/guard";
import { db } from "@/lib/db";
import { PARTNER_STATUS } from "@/lib/partner/status";
import {
  AmendmentError,
  acceptAmendmentPricing,
  requestAmendment,
} from "@/lib/services/amendments";
import { sendEmail } from "@/lib/services/email";
import { notifyPermissionHolders } from "@/lib/services/notifications";

/* ===========================================================================
   Change-order actions, partner side.

   Both start at `requireOwnPartner()`, which resolves the partner from the
   SESSION. There is no partnerId in either form, so no partner can act on
   another's schedule.

   NOTHING HERE TOUCHES `partner.status`. That is the point of the amendment
   lifecycle: a verified partner stays verified while they ask for more, and
   their existing schedule keeps working. `applyTransition` is deliberately
   not imported — there is no edge to drive.
   ========================================================================= */

/** Only a verified partner may ask. Anyone earlier is still negotiating. */
async function requireVerified() {
  const { session, partnerId } = await requireOwnPartner();

  const partner = await db.partner.findUnique({
    where: { id: partnerId },
    select: { status: true, companyName: true, user: { select: { email: true } } },
  });

  if (partner?.status !== PARTNER_STATUS.VERIFIED) {
    throw new AmendmentError("Your account is not verified yet.", 403);
  }

  return { session, partnerId, partner };
}

export async function requestAmendmentAction(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  let context;
  try {
    context = await requireVerified();
  } catch (error) {
    if (error instanceof AmendmentError) return { ok: false, message: error.message };
    throw error;
  }

  const { partnerId, partner } = context;

  const productIds = data.getAll("productIds").map(String).filter(Boolean);
  const requestNotes = String(data.get("requestNotes") ?? "").trim();

  if (productIds.length === 0) {
    return { ok: false, message: "Choose at least one preparation." };
  }
  if (requestNotes.length < 20) {
    return {
      ok: false,
      errors: {
        requestNotes:
          "Tell us a little about what you need these for — a sentence or two is enough.",
      },
    };
  }

  let amendment;
  try {
    amendment = await requestAmendment({ partnerId, productIds, requestNotes });
  } catch (error) {
    if (error instanceof AmendmentError) return { ok: false, message: error.message };
    throw error;
  }

  /* Told directly rather than through a transition's effects, because there
     is no transition — see the header. The audience is the same one that
     prices anything else. */
  const recipients = await notifyPermissionHolders({
    permission: "pricing.review",
    type: "AMENDMENT_REQUESTED",
    partnerId,
    title: `${partner.companyName} wants to add ${amendment.items.length} ${
      amendment.items.length === 1 ? "preparation" : "preparations"
    }`,
    body: requestNotes,
  });

  /* Emails are best-effort and the in-app card is already written. A mail
     provider being down must not lose a request the partner believes they
     have sent — and they HAVE sent it; the row exists. */
  await Promise.all(
    recipients.map((to) =>
      sendEmail("admin/amendment-requested", to, {
        partnerId,
        companyName: partner.companyName,
        changeOrderNumber: amendment.number,
        itemCount: amendment.items.length,
        requestNotes,
      }).catch(() => undefined)
    )
  );

  revalidatePath("/portal/products");
  return {
    ok: true,
    message: `Request sent. It is change order ${amendment.number} — we will price these and come back to you.`,
  };
}

export async function acceptAmendmentPricingAction(
  amendmentId: string,
  _prev: FormState
): Promise<FormState> {
  let partnerId: string;
  try {
    ({ partnerId } = await requireVerified());
  } catch (error) {
    if (error instanceof AmendmentError) return { ok: false, message: error.message };
    throw error;
  }

  /* Ownership is checked against the amendment, not assumed from the id in
     the form. The id travels through a bound server action, which is not a
     secret — `requireOwnPartner` says who is asking, and this says whether
     the thing they named is theirs. */
  const owned = await db.formularyAmendment.findFirst({
    where: { id: amendmentId, partnerId },
    select: { id: true },
  });
  if (!owned) return { ok: false, message: "That request could not be found." };

  try {
    await acceptAmendmentPricing(amendmentId);
  } catch (error) {
    if (error instanceof AmendmentError) return { ok: false, message: error.message };
    throw error;
  }

  revalidatePath("/portal/products");
  return { ok: true, message: "Accepted. Your change order will be sent to sign shortly." };
}
