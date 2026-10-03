"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/forms";
import { requirePermission } from "@/lib/guard";
import { recordAudit } from "@/lib/services/audit";
import {
  createProduct,
  createProductSchema,
  productSchema,
  setProductActive,
  slugifyProduct,
  updateProduct,
} from "@/lib/services/catalog";

/* Catalog mutations. Every one re-checks `products.send` against the database
   before touching a row — the rendered page already hid the buttons for an
   admin without it, but hiding a button is not a permission check. */

const PERMISSION = "products.send" as const;

function fieldErrors(error: unknown): FormState {
  if (error && typeof error === "object" && "issues" in error) {
    const errors: Record<string, string> = {};
    for (const issue of (error as { issues: { path: (string | number)[]; message: string }[] }).issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { ok: false, errors, message: "Some fields need attention." };
  }
  throw error;
}

function read(data: FormData) {
  return {
    name: String(data.get("name") ?? ""),
    slug: String(data.get("slug") ?? ""),
    strength: String(data.get("strength") ?? ""),
    form: String(data.get("form") ?? ""),
    ndc: String(data.get("ndc") ?? ""),
    categoryId: String(data.get("categoryId") ?? ""),
    blurb: String(data.get("blurb") ?? ""),
    description: String(data.get("description") ?? ""),
    productClass: String(data.get("productClass") ?? ""),
    route: String(data.get("route") ?? ""),
    packageSize: String(data.get("packageSize") ?? ""),
    rxStatus: String(data.get("rxStatus") ?? ""),
    deaSchedule: String(data.get("deaSchedule") ?? ""),
    bud: String(data.get("bud") ?? ""),
    listPrice: String(data.get("listPrice") ?? ""),
    unit: String(data.get("unit") ?? "each"),
    // An unchecked checkbox sends nothing at all, so absence is `false`.
    coldChain: data.get("coldChain") === "on",
    isQuoteOnly: data.get("isQuoteOnly") === "on",
    isPublished: data.get("isPublished") === "on",
    isActive: data.get("isActive") === "on",
    sortOrder: String(data.get("sortOrder") ?? "0"),
    imageMediaId: String(data.get("imageMediaId") ?? ""),
  };
}

export async function saveProduct(
  id: string | null,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const session = await requirePermission(PERMISSION);

  const raw = read(data);

  try {
    let product;

    if (id) {
      // An update never carries a slug: it is a live URL, and the edit form
      // shows it as text rather than as a field.
      product = await updateProduct(id, productSchema.parse(raw));
    } else {
      // A new product derives its slug from its own name when left blank.
      const slug = raw.slug || slugifyProduct(raw.name, raw.form, raw.strength);
      product = await createProduct(createProductSchema.parse({ ...raw, slug }));
    }

    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: id ? "product.update" : "product.create",
      entityType: "Product",
      entityId: product.id,
      metadata: { name: raw.name, listPrice: raw.listPrice, isActive: raw.isActive },
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");
  } catch (error) {
    // Zod first: a field-level message belongs back on the form.
    if (error && typeof error === "object" && "issues" in error) return fieldErrors(error);

    // The only constraint a user can realistically hit is a duplicate slug or
    // NDC; anything else is ours, not theirs.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const target = String((error as { meta?: { target?: string[] } }).meta?.target ?? "");
      return {
        ok: false,
        errors: target.includes("ndc")
          ? { ndc: "Another product already uses this NDC." }
          : { slug: "Another product already uses this URL slug." },
      };
    }
    throw error;
  }

  redirect("/admin/products?saved=1");
}

export async function toggleProduct(id: string, isActive: boolean): Promise<void> {
  const session = await requirePermission(PERMISSION);
  await setProductActive(id, isActive);

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: isActive ? "product.activate" : "product.hide",
    entityType: "Product",
    entityId: id,
  });

  revalidatePath("/admin/products");
  revalidatePath("/products");
}
