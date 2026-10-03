import "server-only";

import { cache } from "react";

import {
  categories as editorialCategories,
  products as editorialProducts,
  productImage,
  type Category,
  type Product,
} from "@/lib/data";
import { db } from "@/lib/db";

/* ===========================================================================
   The public catalogue, from the database.

   lib/data.ts used to be the public site's catalogue outright, which meant an
   admin could add a product, see it in the admin, and never see it on the
   site. The database is the source of truth now; this module is the bridge,
   and every public page reads it instead.

   EDITORIAL COPY STILL COMES FROM lib/data.ts, AND SHOULD
   -------------------------------------------------------
   A product page carries active and inactive ingredient lists, directions, an
   appearance description and a packshot. That is written copy and photography,
   not catalogue data — there are twenty-nine of them and seven hundred
   database rows, and inventing an ingredients list for the other six hundred
   and ninety-two is not something an import can do. So the database decides
   WHICH products and categories exist and are visible, and lib/data.ts
   supplies the prose for the ones that have it. A product with no editorial
   entry still gets a page; it just shows what the formulary knows.

   Every reader is wrapped in React's `cache`, so a page that asks for the
   categories in its nav, its breadcrumb and its footer runs one query.
   ========================================================================= */

const editorialBySlug = new Map(editorialProducts.map((p) => [p.slug, p]));
const editorialCategoryBySlug = new Map(editorialCategories.map((c) => [c.slug, c]));

/** What a public page needs about a product, however it was created. */
export type CatalogueProduct = Product & {
  /** Present when an admin created it and no editorial entry exists. */
  fromDatabase: boolean;
  coldChain: boolean;
  deaSchedule: string | null;
  packageSize: string | null;
};

const PRODUCT_FIELDS = {
  slug: true,
  name: true,
  strength: true,
  form: true,
  route: true,
  packageSize: true,
  deaSchedule: true,
  coldChain: true,
  blurb: true,
  description: true,
  categorySlug: true,
  sortOrder: true,
  category: { select: { name: true } },
} as const;

type Row = {
  slug: string;
  name: string;
  strength: string | null;
  form: string | null;
  route: string | null;
  packageSize: string | null;
  deaSchedule: string | null;
  coldChain: boolean;
  blurb: string | null;
  description: string | null;
  categorySlug: string | null;
  sortOrder: number;
  category: { name: string } | null;
};

/**
 * Merge a database row with its editorial entry.
 *
 * The row wins on anything the admin controls — name, category, price-bearing
 * facts. The editorial entry wins on prose and photography, which is the only
 * place that content exists.
 */
function toProduct(row: Row): CatalogueProduct {
  const editorial = editorialBySlug.get(row.slug);

  if (editorial) {
    return {
      ...editorial,
      name: row.name,
      form: row.form ?? editorial.form,
      categorySlug: row.categorySlug ?? editorial.categorySlug,
      category: row.category?.name ?? editorial.category,
      blurb: row.blurb ?? editorial.blurb,
      fromDatabase: false,
      coldChain: row.coldChain,
      deaSchedule: row.deaSchedule,
      packageSize: row.packageSize,
    };
  }

  /* No editorial entry: build a page out of what the formulary knows. Honest
     rather than empty — a prescriber looking one up wants the strength, the
     route and the dating, which is exactly what the catalogue has. */
  const doses = row.strength ?? "";

  return {
    slug: row.slug,
    name: row.name,
    categorySlug: row.categorySlug ?? "",
    category: row.category?.name ?? "",
    doses,
    form: row.form ?? "",
    blurb: row.blurb ?? "",
    image: productImage(row.slug),
    detail: {
      productId: row.slug.toUpperCase().slice(0, 24),
      brand: "MediCraft Pharmacy",
      size: row.packageSize ?? "",
      appearance: "",
      packaging: row.packageSize ?? "",
      schedule: row.deaSchedule && row.deaSchedule !== "NC" ? row.deaSchedule : "Rx only",
      route: row.route ?? "",
      activeIngredients: [],
      inactiveIngredients: [],
      description: row.description ?? row.blurb ?? "",
      directions: "",
    },
    fromDatabase: true,
    coldChain: row.coldChain,
    deaSchedule: row.deaSchedule,
    packageSize: row.packageSize,
  };
}

/** Published categories, in the order an admin set. */
export const getCategories = cache(async (): Promise<Category[]> => {
  const rows = await db.productCategory.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true, name: true, blurb: true, icon: true },
  });

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    blurb: row.blurb ?? editorialCategoryBySlug.get(row.slug)?.blurb ?? "",
    icon: (row.icon ?? editorialCategoryBySlug.get(row.slug)?.icon ?? "vial") as Category["icon"],
  }));
});

/** Published products, whatever their category. */
export const getProducts = cache(async (): Promise<CatalogueProduct[]> => {
  const rows = await db.product.findMany({
    where: { isPublished: true, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: PRODUCT_FIELDS,
  });

  return rows.map(toProduct);
});

export const getCategory = cache(async (slug: string): Promise<Category | undefined> => {
  const all = await getCategories();
  return all.find((c) => c.slug === slug);
});

export const getProduct = cache(async (slug: string): Promise<CatalogueProduct | undefined> => {
  const row = await db.product.findFirst({
    where: { slug, isPublished: true, isActive: true },
    select: PRODUCT_FIELDS,
  });
  return row ? toProduct(row) : undefined;
});

export const getProductsByCategory = cache(
  async (slug: string): Promise<CatalogueProduct[]> => {
    const all = await getProducts();
    return all.filter((p) => p.categorySlug === slug);
  }
);

/** Catalogue grouped by category, INCLUDING the empty ones. */
export const getProductsGrouped = cache(
  async (): Promise<{ category: Category; items: CatalogueProduct[] }[]> => {
    const [categories, products] = await Promise.all([getCategories(), getProducts()]);

    /* Empty groups are kept deliberately: the formulary page shows every
       therapeutic area and offers "request formulary" where nothing is
       published yet, which is what the owner's own document does. */
    return categories.map((category) => ({
      category,
      items: products.filter((p) => p.categorySlug === category.slug),
    }));
  }
);

/** Same-category products first, topped up from the wider catalogue if sparse. */
export const getRelatedProducts = cache(
  async (slug: string, categorySlug: string, limit = 8): Promise<CatalogueProduct[]> => {
    const all = await getProducts();
    const same = all.filter((p) => p.categorySlug === categorySlug && p.slug !== slug);
    if (same.length >= limit) return same.slice(0, limit);

    const filler = all.filter((p) => p.categorySlug !== categorySlug && p.slug !== slug);
    return [...same, ...filler].slice(0, limit);
  }
);

/** "6 formulations", or the honest thing to say when there are none. */
export const getCategoryMetaLabel = cache(async (slugOrHref: string): Promise<string> => {
  const slug = slugOrHref.replace(/^\/products\//, "");
  const items = await getProductsByCategory(slug);
  if (items.length === 0) return "Available on request";
  return `${items.length} ${items.length === 1 ? "formulation" : "formulations"}`;
});

/** The home page's featured line. */
export const getFeaturedProducts = cache(async (): Promise<CatalogueProduct[]> =>
  getProductsByCategory("weight-management")
);
