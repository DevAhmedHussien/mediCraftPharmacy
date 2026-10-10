import "server-only";

import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/* ===========================================================================
   The formulary, as a partner browses it.

   Seven hundred orderable items. The old page rendered every one of them into
   a single table with no search, no filter and no paging, which is not a
   catalogue so much as a wall — a practice that buys eight products had to
   scroll past six hundred and ninety-two to find them.

   PAGING IS SERVER-SIDE, AND SO IS THE SELECTION. Both have to be: shipping
   the whole catalogue to the browser to filter it there is 700 rows of JSON on
   every visit, and a selection held in component state evaporates the moment
   someone turns the page. The selection lives in the database from the first
   tick, which also means an admin can see it and a returning partner finds
   their work where they left it.
   ========================================================================= */

export const PAGE_SIZE = 25;

export type FormularyQuery = {
  q?: string;
  category?: string;
  /** Show only what this partner has already picked. */
  selectedOnly?: boolean;
  page?: number;
};

export type FormularyRow = {
  id: string;
  name: string;
  strength: string | null;
  form: string | null;
  route: string | null;
  packageSize: string | null;
  deaSchedule: string | null;
  coldChain: boolean;
  listPrice: string;
  unit: string;
  /** Priced by written quote under MSA §4.1, not from the list. */
  isQuoteOnly: boolean;
  categoryName: string | null;
  selected: boolean;
};

function buildWhere(
  { q, category }: FormularyQuery,
  selectedIds?: string[]
): Prisma.ProductWhereInput {
  return {
    isActive: true,
    /* Quote-only items are IN the list.
     *
     * They used to be filtered out, on the reasoning that showing one in a
     * price column invites a partner to select something we cannot put a
     * figure against. But MSA §4.1 and Schedule A-1 both carry them — printed
     * as "Quote" rather than a number — so hiding them made the portal's
     * formulary a different document from the one the partner signed, and
     * made its category counts disagree with the website by ten items. The
     * browser prints "Quote" in the price column instead. */
    ...(category ? { categorySlug: category } : {}),
    ...(selectedIds ? { id: { in: selectedIds } } : {}),
    ...(q
      ? {
          OR: [
            // `insensitive` maps to ILIKE. Without it a search for
            // "semaglutide" misses "Semaglutide", which is most of the rows.
            { name: { contains: q, mode: "insensitive" } },
            { strength: { contains: q, mode: "insensitive" } },
            { form: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

/** One page of the formulary, with each row flagged as chosen or not. */
export async function listFormulary(partnerId: string, query: FormularyQuery) {
  const page = Math.max(1, query.page ?? 1);

  const selections = await db.partnerFormularySelection.findMany({
    where: { partnerId },
    select: { productId: true },
  });
  const selectedIds = selections.map((s) => s.productId);
  const selectedSet = new Set(selectedIds);

  /* "Show only my selection" with nothing selected must return nothing, not
     everything — an empty `in` list is the correct answer, and passing
     `undefined` instead would quietly drop the filter. */
  const where = buildWhere(query, query.selectedOnly ? selectedIds : undefined);

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        strength: true,
        form: true,
        route: true,
        packageSize: true,
        deaSchedule: true,
        coldChain: true,
        listPrice: true,
        unit: true,
        isQuoteOnly: true,
        category: { select: { name: true } },
      },
    }),
    db.product.count({ where }),
  ]);

  return {
    rows: rows.map(
      (row): FormularyRow => ({
        id: row.id,
        name: row.name,
        strength: row.strength,
        form: row.form,
        route: row.route,
        packageSize: row.packageSize,
        deaSchedule: row.deaSchedule,
        coldChain: row.coldChain,
        // Decimal must not become a float on the way to the browser.
        listPrice: row.listPrice.toString(),
        unit: row.unit,
        isQuoteOnly: row.isQuoteOnly,
        categoryName: row.category?.name ?? null,
        selected: selectedSet.has(row.id),
      })
    ),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    selectedCount: selectedIds.length,
  };
}

/**
 * The ten formulary categories, each with the same count the website shows.
 *
 * TWO THINGS CHANGED HERE, BOTH SO THE THREE LISTS AGREE.
 *
 * The categories come from `ProductCategory` filtered on `isActive`, not from
 * whatever slugs happen to appear on a product row. Grouping the products
 * produced nineteen entries — the ten plus the nine retired marketing
 * categories, which still had their demo items filed under them — so a
 * partner's filter offered "IV Therapy (2)" against a website that has no
 * such category.
 *
 * And the count no longer excludes quote-only items. It did, which made
 * TRT read 93 here and 101 on the site. Schedule A-1 lists those items; it
 * just prints "Quote" where the others have a figure, which is what the
 * browser now does too.
 */
export async function listFormularyCategories() {
  const rows = await db.product.groupBy({
    by: ["categorySlug"],
    where: { isActive: true, categorySlug: { not: null } },
    _count: { _all: true },
  });

  const categories = await db.productCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true, name: true },
  });

  const counts = new Map(rows.map((r) => [r.categorySlug, r._count._all]));

  return categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    count: counts.get(c.slug) ?? 0,
  }));
}

export async function setSelected(partnerId: string, productId: string, selected: boolean) {
  if (selected) {
    // Idempotent: a double-clicked checkbox is one row, not a unique violation.
    await db.partnerFormularySelection.upsert({
      where: { partnerId_productId: { partnerId, productId } },
      update: {},
      create: { partnerId, productId },
    });
  } else {
    await db.partnerFormularySelection.deleteMany({ where: { partnerId, productId } });
  }
}

/**
 * Select or clear everything matching the current filter.
 *
 * Scoped to the filter rather than to the visible page: someone who has
 * searched "semaglutide" and pressed select-all means the eleven results, not
 * the twenty-five rows that happen to be on screen.
 */
export async function setSelectedForQuery(
  partnerId: string,
  query: FormularyQuery,
  selected: boolean
) {
  const where = buildWhere(query);
  const matching = await db.product.findMany({ where, select: { id: true } });
  const ids = matching.map((m) => m.id);

  if (selected) {
    await db.partnerFormularySelection.createMany({
      data: ids.map((productId) => ({ partnerId, productId })),
      skipDuplicates: true,
    });
  } else {
    await db.partnerFormularySelection.deleteMany({
      where: { partnerId, productId: { in: ids } },
    });
  }

  return ids.length;
}

export async function clearSelection(partnerId: string) {
  await db.partnerFormularySelection.deleteMany({ where: { partnerId } });
}

/** The chosen products, for the admin and for a price-list draft. */
export async function getSelection(partnerId: string) {
  const rows = await db.partnerFormularySelection.findMany({
    where: { partnerId },
    orderBy: { product: { name: "asc" } },
    select: {
      productId: true,
      product: {
        select: {
          name: true,
          strength: true,
          form: true,
          listPrice: true,
          unit: true,
          deaSchedule: true,
          coldChain: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    productId: row.productId,
    name: row.product.name,
    strength: row.product.strength,
    form: row.product.form,
    listPrice: row.product.listPrice.toString(),
    unit: row.product.unit,
    deaSchedule: row.product.deaSchedule,
    coldChain: row.product.coldChain,
    categoryName: row.product.category?.name ?? null,
  }));
}

export async function countSelection(partnerId: string) {
  return db.partnerFormularySelection.count({ where: { partnerId } });
}
