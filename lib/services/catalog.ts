import "server-only";

import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";

/* ===========================================================================
   Product catalog — queries and mutations for the admin.

   Prices are `Decimal` in the database and must not become JavaScript numbers
   on the way through. `Prisma.Decimal` survives the round trip exactly;
   `Number(decimal)` does not, and a catalog that quietly rounds is the bug
   this schema was designed to prevent. Everything here therefore takes and
   returns strings at the boundary and lets Prisma do the conversion.
   ========================================================================= */

/** Money, as typed by a human. Rejects anything that is not a plain amount. */
const price = z
  .string()
  .trim()
  .regex(/^\d{1,9}(\.\d{1,4})?$/, "Enter a price like 148.50.")
  .refine((v) => Number(v) > 0, "Price must be greater than zero.");

/**
 * Everything an edit form posts.
 *
 * `slug` is deliberately NOT here. The edit form renders it as read-only text
 * (it is a public URL — see `updateProduct`), so it never appears in the
 * FormData; requiring it in the shared schema made every single update fail
 * validation against a field the user could not even see. It lives on
 * `createProductSchema` below, which is the only place it is ever set.
 */
export const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required.").max(160),
  strength: z.string().trim().max(80).optional().or(z.literal("")),
  form: z.string().trim().max(80).optional().or(z.literal("")),
  ndc: z
    .string()
    .trim()
    .regex(/^\d{4,5}-\d{3,4}-\d{1,2}$/, "NDC looks like 12345-678-90.")
    .optional()
    .or(z.literal("")),
  /** The category row. Empty means unfiled, which is allowed. */
  categoryId: z.string().trim().optional().or(z.literal("")),

  blurb: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),

  // --- From the 2026 formulary -------------------------------------------
  productClass: z.string().trim().max(40).optional().or(z.literal("")),
  route: z.string().trim().max(60).optional().or(z.literal("")),
  packageSize: z.string().trim().max(60).optional().or(z.literal("")),
  rxStatus: z.string().trim().max(20).optional().or(z.literal("")),
  deaSchedule: z.string().trim().max(10).optional().or(z.literal("")),
  bud: z.string().trim().max(160).optional().or(z.literal("")),
  coldChain: z.boolean().default(false),

  /* A quote-only item has no list price, so `price` — which insists on a
     positive amount — cannot apply to it. The refinement below makes the
     requirement conditional rather than making the field optional for
     everyone, which would let a normal product be saved with no price. */
  isQuoteOnly: z.boolean().default(false),
  listPrice: z.string().trim().optional().or(z.literal("")),

  unit: z.string().trim().min(1).max(24).default("each"),
  isPublished: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  imageMediaId: z.string().trim().optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.isQuoteOnly) return;
  const result = price.safeParse(value.listPrice ?? "");
  if (!result.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["listPrice"],
      message: result.error.issues[0]?.message ?? "Enter a price like 148.50.",
    });
  }
});

export type ProductInput = z.infer<typeof productSchema>;

/** The edit shape plus the one field only a new product carries. */
export const createProductSchema = productSchema.safeExtend({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.")
    .max(160),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Empty strings from a form are absent values, not empty ones. */
const nullIfBlank = (v: string | undefined) => (v && v.length > 0 ? v : null);

export function slugifyProduct(name: string, form?: string, strength?: string): string {
  return [name, form, strength]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export type ProductListParams = {
  q?: string;
  category?: string;
  status?: "all" | "active" | "hidden";
  limit?: number;
  cursor?: string;
};

export async function listProducts({
  q,
  category,
  status = "all",
  limit = 100,
  cursor,
}: ProductListParams) {
  const where: Prisma.ProductWhereInput = {
    ...(status === "active" ? { isActive: true } : status === "hidden" ? { isActive: false } : {}),
    ...(category ? { categorySlug: category } : {}),
    ...(q
      ? {
          OR: [
            // `insensitive` maps to ILIKE. Without it a search for
            // "semaglutide" misses "Semaglutide", which is every row.
            { name: { contains: q, mode: "insensitive" } },
            { strength: { contains: q, mode: "insensitive" } },
            { ndc: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const rows = await db.product.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      slug: true,
      name: true,
      strength: true,
      form: true,
      ndc: true,
      categorySlug: true,
      listPrice: true,
      unit: true,
      route: true,
      packageSize: true,
      deaSchedule: true,
      coldChain: true,
      isQuoteOnly: true,
      isPublished: true,
      isActive: true,
      sortOrder: true,
      updatedAt: true,
      category: { select: { name: true } },
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  /* How many match, not how many came back. The header used to print
     `items.length`, which said "50 products" whether the catalogue held fifty
     or seven hundred — and with no pager on screen, fifty looked like all of
     them. */
  const total = await db.product.count({ where });

  return {
    items: items.map((p) => ({ ...p, listPrice: p.listPrice.toString() })),
    total,
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
  };
}

export async function getProduct(id: string) {
  const p = await db.product.findUnique({ where: { id } });
  return p ? { ...p, listPrice: p.listPrice.toString() } : null;
}

/**
 * Category slugs for the product filter.
 *
 * Reads the category table rather than the distinct slugs on products, which
 * is what it used to do: derived that way, an empty category simply did not
 * exist as far as the filter was concerned, so there was no way to look at one
 * and notice it needed filling.
 */
export async function listCategories(): Promise<string[]> {
  const rows = await db.productCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

/**
 * The columns both create and update write.
 *
 * `categorySlug` is derived from the chosen category rather than posted: it is
 * the public URL key, and a form that let you pick "Hormone Therapy" while
 * typing a different slug would render a product under one category and link
 * it to another.
 */
async function writableFields(input: ProductInput) {
  const category = input.categoryId
    ? await db.productCategory.findUnique({
        where: { id: input.categoryId },
        select: { id: true, slug: true },
      })
    : null;

  return {
    name: input.name,
    strength: nullIfBlank(input.strength),
    form: nullIfBlank(input.form),
    ndc: nullIfBlank(input.ndc),
    categoryId: category?.id ?? null,
    categorySlug: category?.slug ?? null,
    blurb: nullIfBlank(input.blurb),
    description: nullIfBlank(input.description),
    productClass: nullIfBlank(input.productClass),
    route: nullIfBlank(input.route),
    packageSize: nullIfBlank(input.packageSize),
    rxStatus: nullIfBlank(input.rxStatus),
    deaSchedule: nullIfBlank(input.deaSchedule),
    bud: nullIfBlank(input.bud),
    coldChain: input.coldChain,
    isQuoteOnly: input.isQuoteOnly,
    // Quote-only items carry zero; `isQuoteOnly` is what stops anything
    // reading that zero as a price. See lib/services/pricing.ts.
    listPrice: input.isQuoteOnly ? "0" : (input.listPrice as string),
    unit: input.unit,
    isPublished: input.isPublished,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    imageMediaId: nullIfBlank(input.imageMediaId),
  };
}

export async function createProduct(input: CreateProductInput) {
  return db.product.create({
    data: { slug: input.slug, ...(await writableFields(input)) },
  });
}

export async function updateProduct(id: string, input: ProductInput) {
  return db.product.update({
    where: { id },
    // `slug` is deliberately absent. It is the public URL of the product page;
    // editing it silently 404s every link a prescriber has saved and every
    // link an email has already sent. Changing one is a redirect decision, not
    // a form field.
    data: await writableFields(input),
  });
}

/**
 * Products are hidden, never deleted.
 *
 * A product is referenced by historical price-list items and by partner
 * pricing; the schema's `onDelete: Restrict` on those relations would refuse
 * the delete anyway, and rightly — removing it would erase what a partner
 * once negotiated over. Hiding takes it out of the catalog and leaves the
 * record intact.
 */
export async function setProductActive(id: string, isActive: boolean) {
  return db.product.update({ where: { id }, data: { isActive } });
}
