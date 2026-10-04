"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/forms";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import {
  AmendmentError,
  buildChangeOrderText,
  declineAmendment,
  markChangeOrderSent,
  sendAmendmentPricing,
  startAmendmentReview,
} from "@/lib/services/amendments";
import { sendDraft, startDraft } from "@/lib/services/pricing";
import { signature } from "@/lib/services/signature";
import { sendEmail } from "@/lib/services/email";

/* ===========================================================================
   Change orders, admin side.

   THESE DID NOT EXIST.
   --------------------
   The services below — `startAmendmentReview`, `sendAmendmentPricing`,
   `declineAmendment`, `markChangeOrderSent` — had no caller anywhere outside
   their own module. A verified partner could raise a change order, the admin
   panel would show it and say "build their prices in the price list editor
   below", and there was no editor below and no button anywhere on the page.
   The request simply sat there.

   WHY `partner.status` IS NEVER TOUCHED HERE
   ------------------------------------------
   None of these call `applyTransition`. The partner is VERIFIED and filling
   prescriptions against their existing schedule for the whole of this
   conversation; moving their status would stop the orders they are placing
   today. Only the change order's own lifecycle moves — that is the entire
   reason it has one.

   Permissions are the same ones the original negotiation uses: pricing a
   change order is pricing, and declining one is an application decision.
   ========================================================================= */

function fail(message: string): FormState {
  return { ok: false, message };
}

/** Resolve the change order and the partner it belongs to, or null. */
async function load(amendmentId: string) {
  return db.formularyAmendment.findUnique({
    where: { id: amendmentId },
    select: {
      id: true,
      number: true,
      status: true,
      partnerId: true,
      items: { select: { productId: true } },
      partner: {
        select: {
          companyName: true,
          contactName: true,
          user: { select: { email: true } },
        },
      },
    },
  });
}

/**
 * Accept the request and open a draft priced to its items.
 *
 * One button rather than two. "Take it off the queue" and "start pricing it"
 * were never separate decisions for an admin — the only reason to pick a
 * change order up is to price it — and splitting them left a change order
 * parked in UNDER_REVIEW with nothing to show for it.
 */
export async function acceptAmendmentAction(amendmentId: string): Promise<void> {
  const session = await requirePermission("pricing.review");

  const amendment = await load(amendmentId);
  if (!amendment) return;

  if (amendment.status === "REQUESTED") {
    await startAmendmentReview(amendmentId, session.user.id);
  }

  // Seeded from the change order's own items, not the partner's whole
  // formulary — see the note on `startDraft`.
  await startDraft(
    amendment.partnerId,
    session.user.id,
    amendment.items.map((item) => item.productId)
  );

  revalidatePath(`/admin/partners/${amendment.partnerId}`);
}

/** Send the drafted prices to the partner for this change order. */
export async function sendAmendmentPricingAction(
  amendmentId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  await requirePermission("pricing.review");

  const amendment = await load(amendmentId);
  if (!amendment) return fail("That change order could not be found.");

  const comment = String(data.get("adminComment") ?? "").trim();

  try {
    await sendDraft(amendment.partnerId, comment || undefined);
  } catch {
    return fail("There is no open draft to send. Accept the request first.");
  }

  /* `sendDraft` returns nothing, so the version it promoted is read back
     rather than assumed. It is the only SENT list for this partner — the same
     transaction supersedes every earlier one. */
  const version = await db.priceListVersion.findFirst({
    where: { partnerId: amendment.partnerId, status: "SENT" },
    orderBy: { version: "desc" },
    select: { id: true },
  });
  if (!version) return fail("The draft did not send. Try again.");

  try {
    await sendAmendmentPricing(amendmentId, version.id);
  } catch (error) {
    if (error instanceof AmendmentError) return fail(error.message);
    throw error;
  }

  if (amendment.partner.user?.email) {
    /* Name and link only — no prices in the body. The pricing is behind the
       portal's auth, which is where Provider Cost is allowed to be. */
    await sendEmail("partner/amendment-pricing-ready", amendment.partner.user.email, {
      contactName: amendment.partner.contactName,
      companyName: amendment.partner.companyName,
      changeOrderNumber: amendment.number,
    }).catch(() => {
      /* The prices are sent either way; a bounced notification must not undo
         that. The partner sees it in the portal regardless. */
    });
  }

  revalidatePath(`/admin/partners/${amendment.partnerId}`);
  return { ok: true, message: `Prices sent for change order ${amendment.number}.` };
}

/** Turn it down, with a reason the partner will read. */
export async function declineAmendmentAction(
  amendmentId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  await requirePermission("applications.review");

  const amendment = await load(amendmentId);
  if (!amendment) return fail("That change order could not be found.");

  const reason = String(data.get("reason") ?? "").trim();
  if (!reason) {
    return { ok: false, errors: { reason: "Give a reason — the partner sees this." } };
  }

  try {
    await declineAmendment(amendmentId, reason);
  } catch (error) {
    if (error instanceof AmendmentError) return fail(error.message);
    throw error;
  }

  revalidatePath(`/admin/partners/${amendment.partnerId}`);
  return { ok: true, message: `Change order ${amendment.number} declined.` };
}

/**
 * Issue the change order for signature.
 *
 * WHAT GETS HASHED IS THE CHANGE ORDER, NOT THE MSA.
 * -------------------------------------------------
 * This used to hash `agreementText(companyName)` — the body of the Master
 * Service Agreement, word for word the document the partner already signed on
 * day one. Two things were wrong with that. It said nothing about the
 * preparations being added or what they cost, so the signed record did not
 * cover the only part that was new; and its hash was byte-identical to the
 * original signature's, so "they signed THIS" proved nothing.
 *
 * MSA §16.3 is explicit that items are added by the Change Order form in
 * Exhibit B, so that is the document, built from the prices the partner
 * accepted and hashed as its own text.
 */
export async function sendChangeOrderAction(
  amendmentId: string,
  _prev: FormState
): Promise<FormState> {
  await requirePermission("pricing.review");

  const amendment = await load(amendmentId);
  if (!amendment) return fail("That change order could not be found.");
  if (amendment.status !== "ACCEPTED") {
    return fail("The partner has not accepted these prices yet.");
  }

  const email = amendment.partner.user?.email;
  if (!email) return fail("That partner has no email address to send it to.");

  const text = await buildChangeOrderText(amendmentId);
  if (!text) {
    return fail("That change order has no accepted price list, so there is nothing to sign.");
  }

  const { envelopeId } = await signature.create({
    partnerId: amendment.partnerId,
    signerName: amendment.partner.contactName,
    signerEmail: email,
    agreementText: text,
  });

  const envelope = await db.msaEnvelope.findFirst({
    where: { partnerId: amendment.partnerId, envelopeId },
    select: { id: true },
  });
  if (!envelope) return fail("The change order could not be issued. Try again.");

  await markChangeOrderSent(amendmentId, envelope.id);

  /* The template existed and had no caller, so a partner who accepted prices
     was never told their change order was waiting — it appeared in the portal
     and nowhere else. Best-effort: the envelope is out either way. */
  await sendEmail("partner/change-order-ready", email, {
    contactName: amendment.partner.contactName,
    companyName: amendment.partner.companyName,
    changeOrderNumber: amendment.number,
  }).catch(() => undefined);

  revalidatePath(`/admin/partners/${amendment.partnerId}`);
  return {
    ok: true,
    message: `Change order ${amendment.number} sent for signature.`,
  };
}
