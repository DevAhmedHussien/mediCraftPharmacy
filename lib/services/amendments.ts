import "server-only";

import { db } from "@/lib/db";

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

  return db.formularyAmendment.create({
    data: {
      partnerId,
      number: (last?.number ?? 0) + 1,
      requestNotes,
      items: { create: productIds.map((productId) => ({ productId })) },
    },
    select: SELECT,
  });
}

/** An admin picks it up. Moves it off the queue without committing to prices. */
export async function startAmendmentReview(amendmentId: string, reviewerId: string) {
  return db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "UNDER_REVIEW", reviewedById: reviewerId, reviewedAt: new Date() },
  });
}

/** Attach the price list built for these items and send it to the partner. */
export async function sendAmendmentPricing(amendmentId: string, priceListVersionId: string) {
  return db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "PRICING_SENT", priceListVersionId },
  });
}

export async function requestAmendmentChanges(amendmentId: string) {
  return db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "CHANGES_REQUESTED" },
  });
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

  return db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "ACCEPTED" },
  });
}

export async function markChangeOrderSent(amendmentId: string, msaEnvelopeId: string) {
  return db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "CHANGE_ORDER_SENT", msaEnvelopeId },
  });
}

export async function declineAmendment(amendmentId: string, adminNote: string) {
  return db.formularyAmendment.update({
    where: { id: amendmentId },
    data: { status: "DECLINED", adminNote },
  });
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

    return tx.formularyAmendment.update({
      where: { id: amendment.id },
      data: { status: "SIGNED", signedAt: new Date() },
    });
  });
}
