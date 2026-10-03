import "server-only";

import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/* ===========================================================================
   Negotiated pricing.

   A partner's price list is versioned, never edited in place. Each round of
   negotiation supersedes the last, so "what did we offer them in March" stays
   answerable — which is the whole reason the applicant is asked to accept an
   explicit version rather than a mutable row.

   DECIMALS, NOT NUMBERS, ALL THE WAY THROUGH
   ------------------------------------------
   `listPrice × (1 − discount)` in JavaScript floats gives 126.64999999999999
   for a 15% discount on 148.99. `Prisma.Decimal` does the arithmetic exactly,
   and `finalPrice` is stored rather than derived on read — a later change to
   the product's list price must not silently restate an agreement the partner
   has already accepted.
   ========================================================================= */

export type DraftLine = {
  productId: string;
  /** 0–100, as the admin types it. */
  discountPercent: string;
  quantity?: number | null;
  adminComment?: string | null;
};

/** listPrice × (1 − discount/100), rounded to the cent, exactly. */
export function computeFinalPrice(
  listPrice: Prisma.Decimal | string,
  discountPercent: Prisma.Decimal | string
): Prisma.Decimal {
  const list = new Prisma.Decimal(listPrice);
  const discount = new Prisma.Decimal(discountPercent);
  const multiplier = new Prisma.Decimal(100).minus(discount).dividedBy(100);
  return list.times(multiplier).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** The version the applicant is currently looking at, if any. */
export async function getCurrentPriceList(partnerId: string) {
  return db.priceListVersion.findFirst({
    where: { partnerId, status: { in: ["SENT", "ACCEPTED", "CHANGES_REQUESTED"] } },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      adminComment: true,
      submittedAt: true,
      acceptedAt: true,
      items: {
        orderBy: { product: { name: "asc" } },
        select: {
          id: true,
          listPrice: true,
          discountPercent: true,
          finalPrice: true,
          quantity: true,
          adminComment: true,
          product: { select: { id: true, name: true, strength: true, form: true, unit: true } },
        },
      },
    },
  });
}

/** The draft an admin is building, if one exists. */
export async function getDraftPriceList(partnerId: string) {
  return db.priceListVersion.findFirst({
    where: { partnerId, status: "DRAFT" },
    orderBy: { version: "desc" },
    include: {
      items: {
        orderBy: { product: { name: "asc" } },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              strength: true,
              form: true,
              unit: true,
              deaSchedule: true,
              coldChain: true,
              categorySlug: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}

export async function listPriceListHistory(partnerId: string) {
  return db.priceListVersion.findMany({
    where: { partnerId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      submittedAt: true,
      acceptedAt: true,
      adminComment: true,
      _count: { select: { items: true } },
    },
  });
}

/**
 * Start a draft, seeded from the live catalog at zero discount.
 *
 * Seeding from the catalog rather than starting empty is the difference
 * between an admin typing four discounts and an admin picking twenty-nine
 * products from a dropdown. Returns the existing draft if there is one, so a
 * double-click does not create two.
 */
/**
 * What a draft should contain for this partner.
 *
 * Their selection if they made one; the whole priced catalogue if not.
 */
async function selectedProducts(partnerId: string) {
  const chosen = await db.partnerFormularySelection.findMany({
    where: { partnerId, product: { isActive: true, isQuoteOnly: false } },
    orderBy: { product: { name: "asc" } },
    select: { product: { select: { id: true, listPrice: true } } },
  });

  if (chosen.length > 0) return chosen.map((row) => row.product);

  return db.product.findMany({
    where: { isActive: true, isQuoteOnly: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, listPrice: true },
  });
}

export async function startDraft(partnerId: string, actorId: string) {
  const existing = await getDraftPriceList(partnerId);
  if (existing) return existing;

  const [products, latest] = await Promise.all([
    /* The partner's own selection, not the whole catalogue.
     *
     * A draft used to seed from every active product, which after the 2026
     * formulary import meant seven hundred rows for an admin to discount by
     * hand — for a practice that buys eight. The partner picks their working
     * set on /portal/pricing before asking for a call, and this is that set.
     *
     * Falls back to the full catalogue only when nothing was selected, which
     * is the pre-selection data and any partner an admin priced by hand.
     *
     * Quote-only items are excluded either way: MSA §4.1 prices them by
     * written quote, and they have no list price to discount. */
    selectedProducts(partnerId),
    db.priceListVersion.findFirst({
      where: { partnerId },
      orderBy: { version: "desc" },
      select: { version: true, items: { select: { productId: true, discountPercent: true } } },
    }),
  ]);

  // Carry the previous round's discounts forward. A second round almost
  // always adjusts a few lines rather than starting from nothing.
  const previous = new Map(latest?.items.map((i) => [i.productId, i.discountPercent]) ?? []);

  await db.priceListVersion.create({
    data: {
      partnerId,
      version: (latest?.version ?? 0) + 1,
      status: "DRAFT",
      submittedById: actorId,
      items: {
        create: products.map((product) => {
          const discountPercent = previous.get(product.id) ?? new Prisma.Decimal(0);
          return {
            productId: product.id,
            listPrice: product.listPrice,
            discountPercent,
            finalPrice: computeFinalPrice(product.listPrice, discountPercent),
          };
        }),
      },
    },
  });

  return getDraftPriceList(partnerId);
}

/** Save discounts onto the open draft. */
export async function saveDraftLines(
  partnerId: string,
  lines: { itemId: string; discountPercent: string; quantity?: number | null; adminComment?: string | null }[]
) {
  const draft = await db.priceListVersion.findFirst({
    where: { partnerId, status: "DRAFT" },
    select: { id: true, items: { select: { id: true, listPrice: true } } },
  });
  if (!draft) throw new Error("No open draft for this partner.");

  const byId = new Map(draft.items.map((item) => [item.id, item]));

  await db.$transaction(
    lines
      .filter((line) => byId.has(line.itemId))
      .map((line) => {
        const item = byId.get(line.itemId)!;
        const discount = new Prisma.Decimal(line.discountPercent || "0");

        return db.priceListItem.update({
          where: { id: line.itemId },
          data: {
            discountPercent: discount,
            finalPrice: computeFinalPrice(item.listPrice, discount),
            quantity: line.quantity ?? null,
            adminComment: line.adminComment || null,
          },
        });
      })
  );
}

/**
 * Send the draft. Supersedes whatever the partner was looking at before.
 *
 * One transaction: the old version must not sit in SENT alongside the new
 * one, or the applicant's page has two "current" lists and picks by ordering
 * luck.
 */
export async function sendDraft(partnerId: string, adminComment?: string) {
  const draft = await db.priceListVersion.findFirst({
    where: { partnerId, status: "DRAFT" },
    select: { id: true },
  });
  if (!draft) throw new Error("No open draft to send.");

  await db.$transaction([
    db.priceListVersion.updateMany({
      where: { partnerId, status: { in: ["SENT", "CHANGES_REQUESTED"] } },
      data: { status: "SUPERSEDED" },
    }),
    db.priceListVersion.update({
      where: { id: draft.id },
      data: { status: "SENT", submittedAt: new Date(), adminComment: adminComment || null },
    }),
  ]);
}

/** The applicant accepts. Writes their live price book, inactive until verified. */
export async function acceptPriceList(partnerId: string, versionId: string) {
  const version = await db.priceListVersion.findFirst({
    where: { id: versionId, partnerId, status: "SENT" },
    select: { id: true, items: { select: { productId: true, finalPrice: true } } },
  });
  if (!version) throw new Error("That price list is not awaiting acceptance.");

  await db.$transaction([
    db.priceListVersion.update({
      where: { id: version.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
    // Replace rather than accumulate: a second accepted round must not leave
    // the first round's rows behind competing for the same product.
    db.partnerPricing.deleteMany({ where: { partnerId } }),
    db.partnerPricing.createMany({
      data: version.items.map((item) => ({
        partnerId,
        productId: item.productId,
        price: item.finalPrice,
        sourceVersionId: version.id,
        effectiveFrom: new Date(),
        // Switched on at VERIFIED, not here — an unverified partner must not
        // be able to transact at a negotiated price.
        isActive: false,
      })),
    }),
  ]);
}

/**
 * Accept list pricing: no discount, but a real price book.
 *
 * This used to be a status change and nothing else, so a partner who took our
 * list rates reached VERIFIED with no PartnerPricing rows at all — their
 * "agreed prices" existed only as an implication. Writing them at list price
 * makes the record say what was agreed, and makes a later change visible as a
 * change rather than as the first thing ever written.
 */
export async function acceptListPricing(partnerId: string) {
  const chosen = await db.partnerFormularySelection.findMany({
    where: { partnerId, product: { isActive: true, isQuoteOnly: false } },
    select: { product: { select: { id: true, listPrice: true } } },
  });

  if (chosen.length === 0) return 0;

  await db.$transaction([
    // Replace rather than accumulate, for the same reason acceptPriceList does.
    db.partnerPricing.deleteMany({ where: { partnerId } }),
    db.partnerPricing.createMany({
      data: chosen.map(({ product }) => ({
        partnerId,
        productId: product.id,
        price: product.listPrice,
        effectiveFrom: new Date(),
        // Switched on at VERIFIED, never here.
        isActive: false,
      })),
    }),
  ]);

  return chosen.length;
}

/** Called on VERIFIED. Turns the accepted price book on. */
export async function activatePricing(partnerId: string) {
  await db.partnerPricing.updateMany({ where: { partnerId }, data: { isActive: true } });
}

/** The applicant asks for another round; the current list reopens for edit. */
export async function requestAnotherRound(partnerId: string, versionId: string) {
  await db.priceListVersion.updateMany({
    where: { id: versionId, partnerId, status: "SENT" },
    data: { status: "CHANGES_REQUESTED" },
  });
}

/** What the applicant sees before any negotiation: the plain catalog. */
export async function listCatalogPricing() {
  return db.product.findMany({
    // Same rule as a draft: nothing without a price is shown as though it had one.
    where: { isActive: true, isQuoteOnly: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      strength: true,
      form: true,
      unit: true,
      listPrice: true,
      categorySlug: true,
      packageSize: true,
      route: true,
      coldChain: true,
      deaSchedule: true,
    },
  });
}
