"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/forms";
import { requireOwnPartner } from "@/lib/guard";
import { PARTNER_STATUS } from "@/lib/partner/status";
import { db } from "@/lib/db";
import { countSelection } from "@/lib/services/formulary";
import { confirmMeetingSlot, MeetingError, requestMeeting } from "@/lib/services/meetings";
import {
  acceptListPricing,
  acceptPriceList,
  requestAnotherRound,
} from "@/lib/services/pricing";
import { agreementText, signature, SignatureError } from "@/lib/services/signature";
import { applyTransition } from "@/lib/services/transition";
import {
  activateAmendment,
  AmendmentError,
  buildChangeOrderText,
  getSignableChangeOrder,
} from "@/lib/services/amendments";
import { notifyPermissionHolders } from "@/lib/services/notifications";

/* ===========================================================================
   Applicant actions.

   Every one starts at `requireOwnPartner()`, which resolves the partner from
   the SESSION rather than from a form field. There is no partnerId to tamper
   with, so no applicant can act on another's pipeline — the check is
   structural rather than a comparison somebody could forget to write.

   The status change always goes through `applyTransition`, which refuses any
   edge the state machine does not declare. That is what makes "a stage cannot
   be skipped" true: an applicant posting to the accept action while still in
   review gets a 409, not an accepted price list.
   ========================================================================= */

function actorFrom(session: { user: { id: string; email?: string | null } }) {
  return {
    actor: "PARTNER" as const,
    actorId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    actorRole: "PARTNER" as const,
  };
}

function transitionFailure(error: unknown): FormState {
  if (error instanceof Error && "httpStatus" in error) {
    return { ok: false, message: error.message };
  }
  throw error;
}

/** Ask for a call. The reason is required — see the Meeting model. */
export async function requestMeetingAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { session, partnerId } = await requireOwnPartner();

  const notes = String(data.get("requestNotes") ?? "").trim();
  if (notes.length < 20) {
    return {
      ok: false,
      errors: {
        requestNotes:
          "Tell us a little about what you are looking for — a sentence or two is enough.",
      },
    };
  }

  /* A call about nothing in particular is a call nobody can prepare for. The
     selection is what the call is about, so it is required here for the same
     reason it is required to accept list pricing. */
  const chosen = await countSelection(partnerId);
  if (chosen === 0) {
    return {
      ok: false,
      message: "Select the medications you dispense first — that is what the call is about.",
    };
  }

  await requestMeeting(partnerId, notes);

  try {
    await applyTransition({
      partnerId,
      to: PARTNER_STATUS.MEETING_REQUESTED,
      ...actorFrom(session),
      note: `Requested a pricing call on ${chosen} ${chosen === 1 ? "medication" : "medications"}.`,
      emailProps: { requestNotes: notes, selectedCount: chosen },
    });
  } catch (error) {
    return transitionFailure(error);
  }

  revalidatePath("/portal");
  revalidatePath("/portal/pricing");
  return { ok: true, message: "Request sent. We will confirm a time shortly." };
}

/**
 * Take one of the times MediCraft offered.
 *
 * The slot posts as an ISO string, and the service checks it against
 * `proposedSlots` rather than trusting it. That check is the whole security
 * story of this action: the applicant chooses FROM an offer, they do not
 * make one, so there is no time they can put in the admin’s diary that an
 * admin did not already put there.
 */
export async function confirmMeetingSlotAction(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const { session, partnerId } = await requireOwnPartner();

  const raw = String(data.get("slot") ?? "");
  const slot = new Date(raw);
  if (!raw || Number.isNaN(slot.getTime())) {
    return { ok: false, message: "Pick one of the times offered." };
  }

  const partner = await db.partner.findUnique({
    where: { id: partnerId },
    select: {
      companyName: true,
      contactName: true,
      user: { select: { email: true } },
      /* `amendmentId: null` — the call about the ORIGINAL application.
         A verified partner negotiating a change order has a newer meeting
         row, and without this filter picking a slot here would book that
         one and transition them to PRICING_MEETING, undoing their
         verification. */
      meetings: {
        where: { amendmentId: null },
        orderBy: { requestedAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });

  const meetingId = partner?.meetings[0]?.id;
  if (!meetingId) return { ok: false, message: "We could not find your meeting request." };

  const note = String(data.get("partnerNote") ?? "").trim();

  let booked;
  try {
    booked = await confirmMeetingSlot({
      meetingId,
      slot,
      partnerNote: note,
      summary: `MediCraft pricing call — ${partner?.companyName ?? "partner"}`,
      description:
        "A short call to go through pricing for your practice. " +
        "Reply to the confirmation email if you need to move it.",
      attendeeEmails: partner?.user?.email ? [partner.user.email] : [],
    });
  } catch (error) {
    if (error instanceof MeetingError) return { ok: false, message: error.message };
    throw error;
  }

  try {
    await applyTransition({
      partnerId,
      to: PARTNER_STATUS.PRICING_MEETING,
      ...actorFrom(session),
      note: `Picked ${slot.toLocaleString("en-US")} from the times offered.`,
      emailProps: {
        scheduledAt: slot.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }),
        conferenceUrl: booked.conferenceUrl,
        location: booked.location,
        partnerNote: note,
      },
    });
  } catch (error) {
    return transitionFailure(error);
  }

  revalidatePath("/portal");
  return { ok: true, message: "Booked. The details are in your email." };
}

/** Accept list pricing as it stands, skipping the negotiation entirely. */
export async function acceptListPricingAction(_prev: FormState): Promise<FormState> {
  const { session, partnerId } = await requireOwnPartner();

  /* Both routes out of this stage price the partner's selection, so both
     refuse an empty one. The UI explains this before offering the buttons;
     this is the gate, because a disabled button is not a check. */
  const chosen = await acceptListPricing(partnerId);
  if (chosen === 0) {
    return {
      ok: false,
      message: "Select the medications you dispense before accepting — we price what you choose.",
    };
  }

  try {
    await applyTransition({
      partnerId,
      to: PARTNER_STATUS.PRICING_PARTNER_ACCEPTED,
      ...actorFrom(session),
      note: `Accepted list pricing on ${chosen} ${chosen === 1 ? "medication" : "medications"}.`,
    });
  } catch (error) {
    return transitionFailure(error);
  }

  revalidatePath("/portal");
  revalidatePath("/portal/pricing");
  return {
    ok: true,
    message: `Pricing accepted for ${chosen} ${chosen === 1 ? "medication" : "medications"}.`,
  };
}

/** Accept the negotiated list. Writes the price book, inactive until verified. */
export async function acceptNegotiatedAction(
  versionId: string,
  _prev: FormState
): Promise<FormState> {
  const { session, partnerId } = await requireOwnPartner();

  // Write the price book first: if the transition is refused, no prices were
  // agreed, and a rolled-back transition must not leave a live price book.
  await acceptPriceList(partnerId, versionId);

  try {
    await applyTransition({
      partnerId,
      to: PARTNER_STATUS.PRICING_PARTNER_ACCEPTED,
      ...actorFrom(session),
      note: "Accepted the negotiated pricing.",
    });
  } catch (error) {
    return transitionFailure(error);
  }

  revalidatePath("/portal");
  revalidatePath("/portal/pricing");
  return { ok: true, message: "Pricing accepted." };
}

/** Ask for another round on the numbers. */
export async function requestAnotherRoundAction(
  versionId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const { session, partnerId } = await requireOwnPartner();

  const note = String(data.get("note") ?? "").trim();
  if (note.length < 10) {
    return { ok: false, errors: { note: "Tell us what still does not work." } };
  }

  await requestAnotherRound(partnerId, versionId);

  try {
    await applyTransition({
      partnerId,
      to: PARTNER_STATUS.PRICING_CHANGES_REQUESTED,
      ...actorFrom(session),
      note,
    });
  } catch (error) {
    return transitionFailure(error);
  }

  revalidatePath("/portal");
  revalidatePath("/portal/pricing");
  return { ok: true, message: "Sent. We will revise and come back to you." };
}

/** Sign the MSA with the internal driver. */
export async function signAgreementAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { partnerId } = await requireOwnPartner();

  const typedName = String(data.get("typedName") ?? "").trim();
  const agreed = data.get("agreed") === "on";

  if (!agreed) {
    return { ok: false, errors: { agreed: "Please confirm you have read the agreement." } };
  }
  if (typedName.length < 3) {
    return { ok: false, errors: { typedName: "Type your full legal name." } };
  }

  const partner = await db.partner.findUnique({
    where: { id: partnerId },
    select: {
      companyName: true,
      msaEnvelopes: {
        /* The MSA, and only the MSA. A change order is an envelope on the
           same partner and used to be the newest one, so a verified partner
           signing Exhibit B landed here instead: this action would complete
           the change order's envelope, then try to walk an already-VERIFIED
           partner through MSA_SIGNED → VERIFIED and switch their whole price
           book on. `amendments: { none: {} }` is what makes "the agreement"
           mean the agreement. */
        where: { status: { in: ["SENT", "DELIVERED"] }, amendments: { none: {} } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { envelopeId: true },
      },
    },
  });

  const envelope = partner?.msaEnvelopes[0];
  if (!envelope) return { ok: false, message: "There is no agreement awaiting your signature." };

  const requestHeaders = headers();

  try {
    const recorded = await signature.complete({
      envelopeId: envelope.envelopeId,
      typedName,
      agreementText: agreementText(partner!.companyName),
      ip: (requestHeaders.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null,
      userAgent: requestHeaders.get("user-agent"),
    });

    // Already signed — a double-submitted form, not an error worth showing.
    if (recorded) {
      await applyTransition({
        partnerId,
        to: PARTNER_STATUS.MSA_SIGNED,
        actor: "SYSTEM",
        note: `Signed by ${typedName}.`,
      });

      // Signing is the last gate; verification follows immediately. Kept as
      // two transitions because they are two facts with two audit rows.
      await applyTransition({
        partnerId,
        to: PARTNER_STATUS.VERIFIED,
        actor: "SYSTEM",
        note: "Agreement signed; account activated.",
      });

      // Only now do the agreed prices go live.
      const { activatePricing } = await import("@/lib/services/pricing");
      await activatePricing(partnerId);
    }
  } catch (error) {
    if (error instanceof SignatureError) return { ok: false, message: error.message };
    return transitionFailure(error);
  }

  revalidatePath("/portal");
  revalidatePath("/portal/agreement");
  revalidatePath("/portal/welcome");

  /* `redirect` rather than a message, because the signature IS the end of the
     process: leaving them on the agreement page with a green banner makes them
     hunt for what happens next. This one is safe to throw NEXT_REDIRECT from —
     `useFormState` is driving it, not a hand-rolled caller reading `.ok` off
     the return value. */
  redirect("/portal/welcome");
}

/* ===========================================================================
   Signing a change order.

   The last missing link in "adding medications works like applying". Every
   step before it existed — request, quote, another round, a call, accept,
   issue — and then the partner was pointed at /portal/agreement, which is
   gated on MSA_SENT and shows a verified partner "your agreement has not been
   issued yet". There was nowhere to sign, and `activateAmendment` — the only
   function that writes the new prices into the live book — had no caller
   anywhere in the codebase. A change order could reach CHANGE_ORDER_SENT and
   stop there forever.

   WHY IT IS A SEPARATE ACTION FROM `signAgreementAction`
   ------------------------------------------------------
   They complete different envelopes with different documents and different
   consequences. Signing the MSA moves a pipeline and switches a whole price
   book on; signing a change order moves nothing and adds a handful of rows.
   Folding them together would mean one function branching on partner status
   to decide which contract it just recorded a signature for.
   ========================================================================= */

export async function signChangeOrderAction(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const { partnerId } = await requireOwnPartner();

  const typedName = String(data.get("typedName") ?? "").trim();
  const agreed = data.get("agreed") === "on";

  if (!agreed) {
    return { ok: false, errors: { agreed: "Please confirm you have read the change order." } };
  }
  if (typedName.length < 3) {
    return { ok: false, errors: { typedName: "Type your full legal name." } };
  }

  /* Resolved from the session's partner, never from the form. The page that
     renders this box is the same lookup, so a change order that is not
     signable does not reach a signature box in the first place. */
  const order = await getSignableChangeOrder(partnerId);
  if (!order) {
    return { ok: false, message: "There is no change order awaiting your signature." };
  }

  /* Rebuilt rather than carried through the form. `signature.complete`
     compares its hash against the one stored when the change order was
     issued, so the text has to come from the same place both times — a
     hidden field would be a hash the signer controls. */
  const text = await buildChangeOrderText(order.id);
  if (!text) {
    return { ok: false, message: "That change order could not be read. Please contact us." };
  }

  const requestHeaders = headers();

  try {
    const recorded = await signature.complete({
      envelopeId: order.envelope.envelopeId,
      typedName,
      agreementText: text,
      ip: (requestHeaders.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null,
      userAgent: requestHeaders.get("user-agent"),
    });

    // Already signed — a double-submitted form. `activateAmendment` returns
    // early on a SIGNED amendment, so running it either way is safe and
    // repairs the case where the signature landed and activation did not.
    if (recorded) {
      await activateAmendment(order.id);

      await notifyPermissionHolders({
        permission: "pricing.review",
        type: "MSA_SIGNED",
        partnerId,
        title: `Change order ${order.number} signed`,
        body: `${typedName} signed change order ${order.number}. The ${order.lines.length} new ${
          order.lines.length === 1 ? "preparation is" : "preparations are"
        } live on their schedule.`,
        link: `/admin/partners/${partnerId}`,
      });
    }
  } catch (error) {
    if (error instanceof SignatureError) return { ok: false, message: error.message };
    if (error instanceof AmendmentError) return { ok: false, message: error.message };
    throw error;
  }

  revalidatePath("/portal");
  revalidatePath("/portal/products");
  revalidatePath("/portal/agreement");

  /* Back to the schedule, which is where the result of signing actually
     shows: the new preparations are on it now, with the prices just agreed. */
  redirect("/portal/products");
}
