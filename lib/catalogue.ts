import "server-only";

import { cache } from "react";

import {
  categories as editorialCategories,
  products as editorialProducts,
  type Category,
  type Product,
} from "@/lib/data";
import { db } from "@/lib/db";
import { categoryImage } from "@/lib/media";

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
    /* The category's photograph — no product has a picture of its own. */
    image: categoryImage(row.categorySlug ?? "").src,
    imageFit: categoryImage(row.categorySlug ?? "").fit,
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

/**
 * Published categories, in the order an admin set, each carrying its live
 * product count.
 *
 * The count is a grouped query rather than a per-category one: ten categories
 * would otherwise be ten round trips on every page that shows the menu. It
 * counts published, active products — the same predicate `getProducts` uses —
 * so the figure on a pill and the number of cards under it can never differ.
 */
export const getCategories = cache(async (): Promise<Category[]> => {
  const [rows, counts] = await Promise.all([
    db.productCategory.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { slug: true, name: true, blurb: true, icon: true },
    }),
    db.product.groupBy({
      by: ["categorySlug"],
      where: { isPublished: true, isActive: true },
      _count: { _all: true },
    }),
  ]);

  const countBySlug = new Map(counts.map((c) => [c.categorySlug, c._count._all]));

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    blurb: row.blurb ?? editorialCategoryBySlug.get(row.slug)?.blurb ?? "",
    icon: (row.icon ?? editorialCategoryBySlug.get(row.slug)?.icon ?? "vial") as Category["icon"],
    count: countBySlug.get(row.slug) ?? 0,
  }));
});

/** Every published product, across every category. The "All Categories" figure. */
export const getProductCount = cache(
  async (): Promise<number> => db.product.count({ where: { isPublished: true, isActive: true } })
);

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
/**
 * What a product card actually needs.
 *
 * `/products` is a client component — it filters by category without a round
 * trip — so everything handed to it is serialised into the HTML as RSC flight
 * data. Passing the full `CatalogueProduct` sent `detail` with it: the
 * description, prescriber directions, active and inactive ingredients and the
 * spec table, for all 29 products, none of which the card renders. The page
 * came to 249 kB of which 120 kB was that payload, and on throttled mobile
 * the transfer alone was most of a 3.7 s first paint.
 *
 * Eight fields, which is what `ProductCard` reads.
 */
export type FormularyProduct = Pick<
  CatalogueProduct,
  "slug" | "name" | "category" | "categorySlug" | "doses" | "form" | "blurb" | "image" | "imageFit"
>;

/** Narrow a catalogue entry to what crosses to the client. */
export function toFormularyProduct(p: CatalogueProduct): FormularyProduct {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    categorySlug: p.categorySlug,
    doses: p.doses,
    form: p.form,
    blurb: p.blurb,
    image: p.image,
    imageFit: p.imageFit,
  };
}

/**
 * The catalogue grouped by category, with each group capped.
 *
 * WHY A CAP. /products renders every group at once, and the formulary is 692
 * products — Weight Management alone is 116. The page that shows them is a
 * client component so the category filter needs no round trip, which means
 * every product handed to it is serialised into the HTML twice: once as
 * markup, once as RSC flight data. Uncapped that was ~1.1 MB of payload for a
 * page nobody scrolls to the bottom of.
 *
 * So the index shows a sample per category and links to the category page for
 * the rest, which is server-rendered and pays for only the one category
 * somebody asked for. `category.count` is the real total either way, so the
 * heading and the pill still read 116 while twelve cards sit under them.
 */
export const getProductsGrouped = cache(
  async (
    perCategory = Number.POSITIVE_INFINITY
  ): Promise<{ category: Category; items: CatalogueProduct[] }[]> => {
    const [categories, products] = await Promise.all([getCategories(), getProducts()]);

    return categories.map((category) => ({
      category,
      items: products
        .filter((p) => p.categorySlug === category.slug)
        .slice(0, perCategory),
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

/**
 * "116 products", for the Products menu and the home-page cards.
 *
 * Every published category now has a count, because the ten are the formulary
 * and the formulary has no empty category. The old "Available on request"
 * fallback is gone — the brief asks for the count in its place, and a count
 * of zero would mean a category published with nothing in it, which is a data
 * fault to fix rather than a phrase to print.
 */
export const getCategoryMetaLabel = cache(async (slugOrHref: string): Promise<string> => {
  const slug = slugOrHref.replace(/^\/products\//, "");
  const categories = await getCategories();
  const count = categories.find((c) => c.slug === slug)?.count ?? 0;
  return `${count} ${count === 1 ? "product" : "products"}`;
});

/** The home page's featured line. */
export const getFeaturedProducts = cache(async (): Promise<CatalogueProduct[]> =>
  getProductsByCategory("weight-management")
);
