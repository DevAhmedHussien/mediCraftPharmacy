"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/forms";
import { requireOwnPartner } from "@/lib/guard";
import { db } from "@/lib/db";
import { PARTNER_STATUS } from "@/lib/partner/status";
import {
  AmendmentError,
  acceptAmendmentPricing,
  markAmendmentMeetingBooked,
  requestAmendment,
  requestAmendmentCall,
  requestAmendmentRound,
} from "@/lib/services/amendments";
import { confirmMeetingSlot, MeetingError } from "@/lib/services/meetings";
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

  await tellAdmins({
    partnerId,
    title: "Change order prices accepted",
    body: "The partner accepted the quote. Issue the change order for signature.",
  });

  revalidatePath("/portal/products");
  return { ok: true, message: "Accepted. Your change order will be sent to sign shortly." };
}

/* ===========================================================================
   Negotiating a change order.

   The same three answers a partner had to their first quote — accept it, ask
   for another round, or ask to talk it through — now apply to a change order.
   Until now the only button was Accept, so a verified partner who thought a
   price was wrong had to send an email that nothing in this system reads.

   Every one of these resolves the partner from the SESSION and then checks the
   named amendment belongs to them. The id travels through a bound server
   action and is not a secret; ownership is proved, never assumed.
   ========================================================================= */

/**
 * Tell whoever prices things that a change order just moved.
 *
 * The first application tells them through `applyTransition`, which fires
 * notifications as a side effect of the status change. A change order never
 * changes a status, so until now the only step an admin heard about was the
 * original request: a partner could accept a quote, ask for another round or
 * ask for a call, and the only way anyone found out was by opening the
 * partner's page and noticing.
 *
 * Reuses AMENDMENT_REQUESTED rather than adding three enum members for three
 * steps of one conversation — the title says which step it is, and the link
 * goes to the same place for all of them.
 */
async function tellAdmins(input: {
  partnerId: string;
  title: string;
  body: string;
}): Promise<void> {
  await notifyPermissionHolders({
    permission: "pricing.review",
    type: "AMENDMENT_REQUESTED",
    partnerId: input.partnerId,
    title: input.title,
    body: input.body,
    link: `/admin/partners/${input.partnerId}`,
  }).catch(() => {
    /* Best-effort, like every other notification here. The change order has
       already moved; a notification that did not send is recoverable by
       looking at the queue, and throwing would undo the partner's action. */
  });
}

/** Confirms the amendment is this partner's, or returns a form error. */
async function ownAmendment(amendmentId: string, partnerId: string) {
  return db.formularyAmendment.findFirst({
    where: { id: amendmentId, partnerId },
    select: { id: true, number: true },
  });
}

export async function requestAmendmentRoundAction(
  amendmentId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  let partnerId: string;
  try {
    ({ partnerId } = await requireVerified());
  } catch (error) {
    if (error instanceof AmendmentError) return { ok: false, message: error.message };
    throw error;
  }

  if (!(await ownAmendment(amendmentId, partnerId))) {
    return { ok: false, message: "That request could not be found." };
  }

  const note = String(data.get("note") ?? "").trim();
  if (!note) {
    return {
      ok: false,
      errors: { note: "Tell us what does not work, so the next round is closer." },
    };
  }

  try {
    await requestAmendmentRound(amendmentId, note);
  } catch (error) {
    if (error instanceof AmendmentError) return { ok: false, message: error.message };
    throw error;
  }

  await tellAdmins({
    partnerId,
    title: "Another round asked for on a change order",
    body: note,
  });

  revalidatePath("/portal/products");
  revalidatePath("/portal");
  return { ok: true, message: "Sent. We will revise these prices and come back to you." };
}

export async function requestAmendmentCallAction(
  amendmentId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  let partnerId: string;
  try {
    ({ partnerId } = await requireVerified());
  } catch (error) {
    if (error instanceof AmendmentError) return { ok: false, message: error.message };
    throw error;
  }

  if (!(await ownAmendment(amendmentId, partnerId))) {
    return { ok: false, message: "That request could not be found." };
  }

  const notes = String(data.get("notes") ?? "").trim();
  if (!notes) {
    return {
      ok: false,
      errors: { notes: "Tell us what you would like to cover, so the call is useful." },
    };
  }

  try {
    await requestAmendmentCall(amendmentId, notes);
  } catch (error) {
    if (error instanceof AmendmentError) return { ok: false, message: error.message };
    throw error;
  }

  await tellAdmins({
    partnerId,
    title: "Call asked for on a change order",
    body: notes,
  });

  revalidatePath("/portal/products");
  revalidatePath("/portal");
  return { ok: true, message: "Asked. We will send you a few times to choose from shortly." };
}

/**
 * Take one of the times offered for a change-order call.
 *
 * The slot is checked against `proposedSlots` by the service rather than
 * trusted, exactly as on the first application: the partner chooses FROM an
 * offer, they do not make one.
 *
 * Note what this does NOT do: it does not call `applyTransition`. The partner
 * is VERIFIED and stays VERIFIED — they are filling prescriptions against
 * their existing schedule while this conversation happens. Only the change
 * order's own lifecycle moves.
 */
export async function confirmAmendmentSlotAction(
  amendmentId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  let partnerId: string;
  let partner: { companyName: string; user: { email: string } | null };
  try {
    const context = await requireVerified();
    partnerId = context.partnerId;
    partner = context.partner;
  } catch (error) {
    if (error instanceof AmendmentError) return { ok: false, message: error.message };
    throw error;
  }

  const owned = await ownAmendment(amendmentId, partnerId);
  if (!owned) return { ok: false, message: "That request could not be found." };

  const raw = String(data.get("slot") ?? "");
  const slot = new Date(raw);
  if (!raw || Number.isNaN(slot.getTime())) {
    return { ok: false, message: "Pick one of the times offered." };
  }

  const meeting = await db.meeting.findFirst({
    where: { amendmentId, partnerId },
    orderBy: { requestedAt: "desc" },
    select: { id: true },
  });
  if (!meeting) return { ok: false, message: "We could not find your call request." };

  const note = String(data.get("partnerNote") ?? "").trim();

  try {
    await confirmMeetingSlot({
      meetingId: meeting.id,
      slot,
      partnerNote: note,
      summary: `MediCraft pricing call — change order ${owned.number}`,
      description:
        "A short call to go through pricing for the medications you asked to add. " +
        "Reply to the confirmation email if you need to move it.",
      attendeeEmails: partner.user?.email ? [partner.user.email] : [],
    });
  } catch (error) {
    if (error instanceof MeetingError) return { ok: false, message: error.message };
    throw error;
  }

  await markAmendmentMeetingBooked(amendmentId);

  revalidatePath("/portal/products");
  revalidatePath("/portal");
  return { ok: true, message: "Booked. We will send revised pricing after the call." };
}
