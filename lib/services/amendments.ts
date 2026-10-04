import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { changeOrderText, type ChangeOrderLine } from "@/lib/signature-text";

/* ===========================================================================
   Formulary change orders.

   A verified partner asking to add preparations is the one flow in this
   system that must NOT touch `partner.status`. They are verified, they are
   ordering, and the request is about items they do not yet have — knocking
   them back to the pricing stage would stop the orders they are already
   placing, which is the opposite of what asking for more should do.

   So an amendment carries its own small lifecycle (`AmendmentStatus`) running
   alongside the partner's. The two never interact.

   WHY THE PRICES ARE A NORMAL PRICE LIST
   --------------------------------------
   `PriceListVersion` is already per-partner and versioned, already carries a
   DRAFT → SENT → ACCEPTED lifecycle, and already snapshots list prices at
   submission. An amendment's prices are version N+1, built by the same
   editor an admin already knows. A separate "amendment pricing" table would
   have been the same five columns and a second set of bugs.

   EVERY STEP IS MIRRORED TO THE CRM
   ---------------------------------
   The brief asks for every action between a partner and an admin to be
   tagged in GoHighLevel. Amendments used to be the hole in that: they are the
   one flow that deliberately avoids `applyTransition`, which is where the
   CrmOutbox row is normally written, so a partner could ask for six
   preparations, be quoted, accept and sign without a single tag moving.

   `mirror()` below writes the same kind of outbox row by hand. It is
   deliberately the same table and the same worker — a second delivery path
   would be a second set of retry bugs.

   WHY A SIGNATURE IS NOT OPTIONAL
   -------------------------------
   The agreement states that items are added by signed change order and that
   no pricing change takes effect without one. `activateAmendment` is
   therefore reachable only from a completed envelope — there is no admin
   button that writes prices into `PartnerPricing` without one.
   ========================================================================= */

export class AmendmentError extends Error {
  constructor(
    message: string,
    readonly httpStatus = 400
  ) {
    super(message);
    this.name = "AmendmentError";
  }
}

/** Everything the partner's own screen and the admin panel both need. */
const SELECT = {
  id: true,
  number: true,
  status: true,
  requestNotes: true,
  requestedAt: true,
  adminNote: true,
  partnerNote: true,
  signedAt: true,
  priceListVersionId: true,
  msaEnvelopeId: true,
  items: {
    select: {
      product: {
        select: { id: true, name: true, strength: true, form: true, packageSize: true, unit: true },
      },
    },
  },
  /* The call about this change order. Newest first and capped at one: a
     partner who asks for a second call after a first gets a second row, and
     the open one is the one both screens mean. */
  meetings: {
    orderBy: { requestedAt: "desc" },
    take: 1,
    select: {
      id: true,
      requestNotes: true,
      requestedAt: true,
      proposedSlots: true,
      scheduledAt: true,
      confirmedAt: true,
      durationMinutes: true,
      location: true,
      conferenceUrl: true,
      partnerNote: true,
    },
  },
} as const;

export async function listAmendments(partnerId: string) {
  return db.formularyAmendment.findMany({
    where: { partnerId },
    orderBy: { number: "desc" },
    select: SELECT,
  });
}

/**
 * The one an admin or a partner is being asked to act on.
 *
 * Anything not SIGNED or DECLINED is open. There is at most one — `request`
 * refuses to create a second — so "the open amendment" is a well-formed
 * question rather than a convention.
 */
export async function getOpenAmendment(partnerId: string) {
  return db.formularyAmendment.findFirst({
    where: { partnerId, status: { notIn: ["SIGNED", "DECLINED"] } },
    orderBy: { number: "desc" },
    select: SELECT,
  });
}

/**
 * Queue a CRM tag for one step of an amendment's life.
 *
 * `toStatus` is the partner's *current* status, deliberately unchanged: an
 * amendment does not move anybody through onboarding, so the stage pointer
 * must stay where it is. Only the event tag is new.
 *
 * The idempotency key is the amendment plus the step, so a retry, a double
 * submit or a replayed action can never tag a contact twice — an amendment
 * reaches each status once.
 *
 * Never throws. A CRM mirror failing must not roll back the change order the
 * partner just signed; the row is the retry, and its absence is recoverable.
 * Accepts an optional transaction client so callers that already have one
 * enqueue atomically with their own write.
 */
async function mirror(
  amendmentId: string,
  step: string,
  label: string,
  client: Prisma.TransactionClient | typeof db = db
): Promise<void> {
  try {
    const amendment = await client.formularyAmendment.findUnique({
      where: { id: amendmentId },
      select: { partnerId: true, partner: { select: { status: true } } },
    });
    if (!amendment) return;

    /* `createMany` with `skipDuplicates`, not `create`.
       A replay hitting the unique index on `idempotencyKey` is an expected
       outcome here, not a fault — but `create` turns it into a thrown
       constraint violation that Prisma logs at error level, so the happy path
       of "we already queued this" would fill production logs with stack
       traces. This asks the database to ignore the row instead. */
    await client.crmOutbox.createMany({
      data: [
        {
          idempotencyKey: `amendment:${amendmentId}:${step}`,
          partnerId: amendment.partnerId,
          label,
          toStatus: amendment.partner.status,
        },
      ],
      skipDuplicates: true,
    });
  } catch {
    /* A CRM mirror is never worth failing a partner's action over. */
  }
}

/**
 * Raise a hand: ask for preparations to be added.
 *
 * One open request at a time. Two in flight would mean two draft price lists
 * for the same partner, and `startDraft` has no idea which is which — the
 * second request silently reopening the first one's draft is how a partner
 * ends up signing a change order for items they did not ask for.
 */
export async function requestAmendment(input: {
  partnerId: string;
  productIds: string[];
  requestNotes: string;
}) {
  const { partnerId, productIds, requestNotes } = input;

  if (productIds.length === 0) {
    throw new AmendmentError("Choose at least one preparation to add.");
  }

  const open = await getOpenAmendment(partnerId);
  if (open) {
    throw new AmendmentError(
      `You already have an open request (change order ${open.number}). ` +
        `We will come back to you on that one before starting another.`,
      409
    );
  }

  /* Items already priced for this partner are rejected rather than ignored.
     Silently dropping them would produce a change order shorter than the
     request, and the partner would reasonably read the difference as a
     refusal nobody explained. */
  const alreadyHave = await db.partnerPricing.findMany({
    where: { partnerId, productId: { in: productIds }, isActive: true },
    select: { product: { select: { name: true } } },
  });

  if (alreadyHave.length > 0) {
    throw new AmendmentError(
      `Already on your schedule: ${alreadyHave.map((p) => p.product.name).join(", ")}.`
    );
  }

  const last = await db.formularyAmendment.findFirst({
    where: { partnerId },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  const created = await db.formularyAmendment.create({
    data: {
      partnerId,
      number: (last?.number ?? 0) + 1,
      requestNotes,
      items: { create: productIds.map((productId) => ({ productId })) },
    },
    select: SELECT,
  });

  await mirror(created.id, "requested", "Formulary change requested");
  return created;
}

/** An admin picks it up. Moves it off the queue without committing to prices. */
export async function startAmendmentReview(amendmentId: string, reviewerId: string) {
  const updated = await db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "UNDER_REVIEW", reviewedById: reviewerId, reviewedAt: new Date() },
  });

  await mirror(amendmentId, "under_review", "Formulary change under review");
  return updated;
}

/**
 * Attach the price list built for these items and send it to the partner.
 *
 * Reachable from UNDER_REVIEW (the first quote), from CHANGES_REQUESTED (they
 * asked for another round) and from MEETING_SCHEDULED (the revised quote after
 * the call) — the same three places the original negotiation sends pricing.
 */
export async function sendAmendmentPricing(amendmentId: string, priceListVersionId: string) {
  const updated = await db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "PRICING_SENT", priceListVersionId },
  });

  /* A revised quote is a distinct event in the CRM: "we sent pricing" and "we
     sent pricing again after the call" are different things to a salesperson
     reading the trail. The idempotency key carries the version, so each round
     queues its own row rather than the second one colliding with the first. */
  await mirror(
    amendmentId,
    `pricing_sent_${priceListVersionId}`,
    "Formulary change pricing sent"
  );
  return updated;
}

export async function requestAmendmentChanges(amendmentId: string) {
  const updated = await db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "CHANGES_REQUESTED" },
  });

  await mirror(amendmentId, "edits_requested", "Formulary change edits requested");
  return updated;
}

export async function acceptAmendmentPricing(amendmentId: string) {
  const amendment = await db.formularyAmendment.findUnique({
    where: { id: amendmentId },
    select: { status: true },
  });

  if (!amendment) throw new AmendmentError("That request could not be found.", 404);
  if (amendment.status !== "PRICING_SENT") {
    throw new AmendmentError("There is no pricing waiting for you to accept.", 409);
  }

  const updated = await db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "ACCEPTED" },
  });

  await mirror(amendmentId, "accepted", "Formulary change pricing accepted");
  return updated;
}

/**
 * The partner asks for another round on the quoted prices.
 *
 * The mirror of `requestPricingChanges` on the first application. Until now a
 * change order offered exactly one response — Accept — so a partner who found
 * a price wrong had to email, and nothing in this system read that.
 */
export async function requestAmendmentRound(amendmentId: string, partnerNote: string) {
  const amendment = await db.formularyAmendment.findUnique({
    where: { id: amendmentId },
    select: { status: true, priceListVersionId: true },
  });
  if (!amendment) throw new AmendmentError("That request could not be found.", 404);
  if (amendment.status !== "PRICING_SENT") {
    throw new AmendmentError("There is no pricing to ask about yet.", 409);
  }
  if (!partnerNote.trim()) {
    throw new AmendmentError("Tell us what does not work, so the next round is closer.");
  }

  /* The quoted version is reopened in the same breath, exactly as
     `requestAnotherRound` does on the first application. Leaving it in SENT
     would mean a price list the partner has explicitly rejected still reading
     as the live offer — and `getCurrentPriceList` would keep handing it back
     as the thing they are being asked to accept. */
  const updated = await db.$transaction(async (tx) => {
    if (amendment.priceListVersionId) {
      await tx.priceListVersion.updateMany({
        where: { id: amendment.priceListVersionId, status: "SENT" },
        data: { status: "CHANGES_REQUESTED" },
      });
    }

    return tx.formularyAmendment.update({
      where: { id: amendmentId },
      data: { status: "CHANGES_REQUESTED", partnerNote: partnerNote.trim() },
    });
  });

  await mirror(amendmentId, "round_requested", "Formulary change round requested");
  return updated;
}

/**
 * The partner asks to talk the prices through.
 *
 * Creates a `Meeting` carrying `amendmentId`, which is what keeps this call
 * separate from the one they had when they first applied — see the note on
 * `getLatestMeeting`.
 *
 * The partner's status is deliberately untouched. They are VERIFIED and still
 * ordering against their existing schedule; knocking them back to
 * MEETING_REQUESTED would stop the prescriptions they are filling today, which
 * is the whole reason an amendment runs its own lifecycle.
 */
export async function requestAmendmentCall(amendmentId: string, requestNotes: string) {
  const amendment = await db.formularyAmendment.findUnique({
    where: { id: amendmentId },
    select: { status: true, partnerId: true },
  });
  if (!amendment) throw new AmendmentError("That request could not be found.", 404);
  if (amendment.status !== "PRICING_SENT") {
    throw new AmendmentError("There is no pricing to discuss yet.", 409);
  }
  if (!requestNotes.trim()) {
    throw new AmendmentError("Tell us what you would like to cover, so the call is useful.");
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.meeting.create({
      data: {
        partnerId: amendment.partnerId,
        amendmentId,
        requestNotes: requestNotes.trim(),
      },
    });

    return tx.formularyAmendment.update({
      where: { id: amendmentId },
      data: { status: "MEETING_REQUESTED", partnerNote: requestNotes.trim() },
    });
  });

  await mirror(amendmentId, "call_requested", "Formulary change call requested");
  return updated;
}

/**
 * A time has been taken. The revised quote follows the call.
 *
 * Called after `confirmMeetingSlot` has booked the slot itself, so this only
 * moves the change order's own lifecycle forward.
 */
export async function markAmendmentMeetingBooked(amendmentId: string) {
  const updated = await db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "MEETING_SCHEDULED" },
  });

  await mirror(amendmentId, "call_booked", "Formulary change call booked");
  return updated;
}

export async function markChangeOrderSent(amendmentId: string, msaEnvelopeId: string) {
  const updated = await db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "CHANGE_ORDER_SENT", msaEnvelopeId },
  });

  await mirror(amendmentId, "order_sent", "Formulary change order sent");
  return updated;
}

export async function declineAmendment(amendmentId: string, adminNote: string) {
  const updated = await db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "DECLINED", adminNote },
  });

  await mirror(amendmentId, "declined", "Formulary change declined");
  return updated;
}

/**
 * The change order is signed: the new items go live.
 *
 * ONE TRANSACTION, because a partially-applied change order is the worst
 * possible outcome — an amendment marked SIGNED whose prices never landed
 * means the partner has signed for items they cannot order, and nothing in
 * the system says so.
 *
 * Prices are ADDED to the book rather than replacing it. The original flow
 * replaces wholesale — `acceptListPricing` deletes every row first — because
 * there it is negotiating the whole schedule. Here it is adding to a schedule
 * the partner is ordering against right now, and a delete-then-recreate would
 * take their live prices away for the length of the transaction.
 *
 * Rows go in active. `activatePricing` switches the original book on at
 * VERIFIED; a partner reaching a change order is already past that, so a row
 * written inactive here would be a price nobody could order at and nothing
 * would ever turn on.
 */
export async function activateAmendment(amendmentId: string) {
  const amendment = await db.formularyAmendment.findUnique({
    where: { id: amendmentId },
    select: {
      id: true,
      partnerId: true,
      status: true,
      priceListVersionId: true,
      msaEnvelope: { select: { status: true } },
    },
  });

  if (!amendment) throw new AmendmentError("That change order could not be found.", 404);
  if (amendment.status === "SIGNED") return amendment;

  if (amendment.msaEnvelope?.status !== "COMPLETED") {
    throw new AmendmentError(
      "That change order has not been signed yet, and prices do not change without one.",
      409
    );
  }
  if (!amendment.priceListVersionId) {
    throw new AmendmentError("That change order has no price list attached.", 409);
  }

  const lines = await db.priceListItem.findMany({
    where: { versionId: amendment.priceListVersionId },
    select: { productId: true, finalPrice: true },
  });

  const now = new Date();

  return db.$transaction(async (tx) => {
    /* Close any superseded row for these products before inserting. There is
       a PARTIAL unique index on (partnerId, productId) WHERE isActive, so two
       active prices for one product is a constraint violation rather than an
       ambiguity someone discovers at invoicing. */
    await tx.partnerPricing.updateMany({
      where: {
        partnerId: amendment.partnerId,
        productId: { in: lines.map((l) => l.productId) },
        isActive: true,
      },
      data: { isActive: false, effectiveTo: now },
    });

    await tx.partnerPricing.createMany({
      data: lines.map((line) => ({
        partnerId: amendment.partnerId,
        productId: line.productId,
        price: line.finalPrice,
        sourceVersionId: amendment.priceListVersionId,
        effectiveFrom: now,
        isActive: true,
      })),
    });

    await tx.priceListVersion.update({
      where: { id: amendment.priceListVersionId! },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    const signed = await tx.formularyAmendment.update({
      where: { id: amendment.id },
      data: { status: "SIGNED", signedAt: new Date() },
    });

    /* Inside the transaction, like every other outbox write in this codebase.
       The tag and the prices going live are one fact; queueing the mirror
       outside would let a rollback leave a "signed" tag on a contact whose
       prices never landed. */
    await mirror(amendment.id, "signed", "Formulary change signed", tx);

    return signed;
  });
}

/* ===========================================================================
   The change order as a document.

   `changeOrderText` is pure and lives in lib/signature-text.ts so a seed
   script or a test can reproduce the hash. This is the part that knows what a
   FormularyAmendment is: it reads the accepted price list and hands over the
   lines.

   BOTH SIDES BUILD IT THE SAME WAY, which is the whole point. The admin
   issuing the change order hashes the text this returns; the partner signing
   it is checked against a hash of the text this returns. A second rendering
   path would mean a signature that fails verification for no reason the
   partner could act on.
   ========================================================================= */

/** The priced lines on a change order, or `[]` before an admin has quoted. */
export async function getAmendmentLines(amendmentId: string): Promise<ChangeOrderLine[]> {
  const amendment = await db.formularyAmendment.findUnique({
    where: { id: amendmentId },
    select: { priceListVersionId: true },
  });
  if (!amendment?.priceListVersionId) return [];

  const items = await db.priceListItem.findMany({
    where: { versionId: amendment.priceListVersionId },
    orderBy: { product: { name: "asc" } },
    select: {
      listPrice: true,
      discountPercent: true,
      finalPrice: true,
      product: {
        select: { name: true, strength: true, form: true, packageSize: true, unit: true },
      },
    },
  });

  return items.map((item) => ({
    name: item.product.name,
    strength: item.product.strength,
    form: item.product.form,
    packageSize: item.product.packageSize,
    unit: item.product.unit,
    // Decimal, stringified. `Number()` here would reintroduce exactly the
    // float error the Decimal columns exist to prevent.
    listPrice: item.listPrice.toString(),
    discountPercent: item.discountPercent.toString(),
    finalPrice: item.finalPrice.toString(),
  }));
}

/**
 * The exact text of a change order, ready to hash or to show.
 *
 * Returns null when the amendment has no price list yet — there is no
 * document to sign before the prices exist, and generating one with an empty
 * schedule would be a contract to add nothing.
 */
export async function buildChangeOrderText(amendmentId: string): Promise<string | null> {
  const amendment = await db.formularyAmendment.findUnique({
    where: { id: amendmentId },
    select: {
      number: true,
      requestedAt: true,
      partner: { select: { companyName: true } },
    },
  });
  if (!amendment) return null;

  const lines = await getAmendmentLines(amendmentId);
  if (lines.length === 0) return null;

  return changeOrderText({
    companyName: amendment.partner.companyName,
    number: amendment.number,
    requestedAt: amendment.requestedAt,
    lines,
  });
}

/**
 * The change order this partner is being asked to sign, if there is one.
 *
 * Deliberately narrow: CHANGE_ORDER_SENT and an envelope that is actually out
 * for signature. A partner whose change order is still being priced has
 * nothing to sign, and a signing page that renders for them would be a form
 * that cannot succeed.
 */
export async function getSignableChangeOrder(partnerId: string) {
  const amendment = await db.formularyAmendment.findFirst({
    where: { partnerId, status: "CHANGE_ORDER_SENT" },
    orderBy: { number: "desc" },
    select: {
      id: true,
      number: true,
      requestedAt: true,
      msaEnvelope: {
        select: { id: true, envelopeId: true, status: true, driver: true },
      },
    },
  });

  if (!amendment?.msaEnvelope) return null;
  if (amendment.msaEnvelope.status === "COMPLETED") return null;

  const lines = await getAmendmentLines(amendment.id);
  if (lines.length === 0) return null;

  return { ...amendment, envelope: amendment.msaEnvelope, lines };
}

/** The envelope's change order, for a signing path that only knows an envelope. */
export async function amendmentForEnvelope(envelopeId: string) {
  return db.formularyAmendment.findFirst({
    where: { msaEnvelope: { envelopeId } },
    select: { id: true, number: true, partnerId: true, status: true },
  });
}
