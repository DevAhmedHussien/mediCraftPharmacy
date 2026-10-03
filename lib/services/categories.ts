import "server-only";

import { z } from "zod";

import { db } from "@/lib/db";

/* ===========================================================================
   Therapeutic categories — queries and mutations for the admin.

   These were a hardcoded array in lib/data.ts. Making them rows is the point
   of this file: the pharmacy reorganises its formulary far more often than it
   deploys, and "add a category" should not have been an engineering task.

   TWO FLAGS, TWO DIFFERENT QUESTIONS
   ----------------------------------
   `isActive`    — may products be filed here at all? Retiring a category takes
                   it out of the pickers without detaching what is already in
                   it, so an old product keeps its history.
   `isPublished` — does the public site show it? Most of the 2026 formulary is
                   an operational grouping for partner pricing, not a page a
                   patient browses to.

   A slug is frozen after creation. It is a public URL, and renaming a category
   must not 404 a link somebody bookmarked — the same rule products follow.
   ========================================================================= */

export const categorySchema = z.object({
  name: z.string().trim().min(2, "A name is required.").max(80),
  blurb: z.string().trim().max(300).optional().or(z.literal("")),
  icon: z.string().trim().max(40).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isPublished: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const createCategorySchema = categorySchema.extend({
  slug: z
    .string()
    .trim()
    .min(2, "A URL slug is required.")
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lower case, numbers and hyphens only."),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/** Every category with the number of products filed under it. */
export async function listCategories() {
  return db.productCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      blurb: true,
      icon: true,
      sortOrder: true,
      isPublished: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });
}

/** Just the ones a product may be filed under, for a picker. */
export async function listAssignableCategories() {
  return db.productCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, isPublished: true },
  });
}

export async function getCategory(id: string) {
  return db.productCategory.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      blurb: true,
      icon: true,
      sortOrder: true,
      isPublished: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });
}

export async function createCategory(input: CreateCategoryInput) {
  return db.productCategory.create({
    data: {
      slug: input.slug,
      name: input.name,
      blurb: input.blurb || null,
      icon: input.icon || null,
      sortOrder: input.sortOrder,
      isPublished: input.isPublished,
      isActive: input.isActive,
    },
    select: { id: true, slug: true },
  });
}

export async function updateCategory(id: string, input: CategoryInput) {
  /* The slug is absent by design — the edit form renders it read-only, so it
     never reaches the FormData. Requiring it in the shared schema is the bug
     that made every product update fail against a field nobody could see. */
  return db.productCategory.update({
    where: { id },
    data: {
      name: input.name,
      blurb: input.blurb || null,
      icon: input.icon || null,
      sortOrder: input.sortOrder,
      isPublished: input.isPublished,
      isActive: input.isActive,
    },
    select: { id: true, slug: true },
  });
}

export class CategoryInUseError extends Error {
  constructor(readonly productCount: number) {
    super(
      `${productCount} ${productCount === 1 ? "product is" : "products are"} filed under this category.`
    );
    this.name = "CategoryInUseError";
  }
}

/**
 * Delete a category, but only an empty one.
 *
 * The foreign key is `onDelete: SetNull`, so deleting a populated category
 * would succeed and quietly orphan every product in it — they would vanish
 * from their category page with no error anywhere. Retiring it with
 * `isActive: false` is the operation someone actually wants: it disappears
 * from the pickers and keeps its contents.
 */
export async function deleteCategory(id: string) {
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) throw new CategoryInUseError(count);

  await db.productCategory.delete({ where: { id } });
}

/** Move products from one category to another, then the old one is deletable. */
export async function reassignProducts(fromId: string, toId: string) {
  const to = await db.productCategory.findUnique({
    where: { id: toId },
    select: { slug: true },
  });
  if (!to) throw new Error("That category no longer exists.");

  const { count } = await db.product.updateMany({
    where: { categoryId: fromId },
    // `categorySlug` is the public URL key and is kept in step deliberately —
    // a product whose id moved but whose slug did not would render under one
    // category and link to another.
    data: { categoryId: toId, categorySlug: to.slug },
  });

  return count;
}
