"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/forms";
import { requirePermission } from "@/lib/guard";
import { recordAudit } from "@/lib/services/audit";
import {
  categorySchema,
  CategoryInUseError,
  createCategory,
  createCategorySchema,
  deleteCategory,
  reassignProducts,
  slugifyCategory,
  updateCategory,
} from "@/lib/services/categories";

/* Category mutations. Every one re-checks `products.send` against the database
   before touching a row — the rendered page already hid the buttons for an
   admin without it, but hiding a button is not a permission check. */

const PERMISSION = "products.send" as const;

function fieldErrors(error: unknown): FormState {
  if (error && typeof error === "object" && "issues" in error) {
    const errors: Record<string, string> = {};
    for (const issue of (error as { issues: { path: (string | number)[]; message: string }[] })
      .issues) {
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
    blurb: String(data.get("blurb") ?? ""),
    icon: String(data.get("icon") ?? ""),
    sortOrder: String(data.get("sortOrder") ?? "0"),
    // An unchecked checkbox sends nothing at all, so absence is `false`.
    isPublished: data.get("isPublished") === "on",
    isActive: data.get("isActive") === "on",
  };
}

export async function saveCategory(
  id: string | null,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const session = await requirePermission(PERMISSION);

  const raw = read(data);
  // Offer a slug derived from the name when the field is left blank, the same
  // way a new product does. Only on create — a slug never changes after that.
  if (!id && !raw.slug.trim()) raw.slug = slugifyCategory(raw.name);

  let saved: { id: string; slug: string };

  try {
    saved = id
      ? await updateCategory(id, categorySchema.parse(raw))
      : await createCategory(createCategorySchema.parse(raw));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return {
        ok: false,
        errors: { slug: "A category already uses that URL slug." },
        message: "Some fields need attention.",
      };
    }
    return fieldErrors(error);
  }

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: id ? "category.update" : "category.create",
    entityType: "ProductCategory",
    entityId: saved.id,
    metadata: { slug: saved.slug, name: raw.name },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  // The public catalogue is built from these, so its pages go stale too.
  revalidatePath("/products");
  revalidatePath(`/products/${saved.slug}`);

  redirect("/admin/categories");
}

export async function removeCategory(id: string, _prev: FormState): Promise<FormState> {
  const session = await requirePermission(PERMISSION);

  try {
    await deleteCategory(id);
  } catch (error) {
    if (error instanceof CategoryInUseError) {
      // Deleting would succeed at the database level — the foreign key is
      // SET NULL — and silently orphan every product in it. Say so instead.
      return {
        ok: false,
        message: `${error.message} Move them first, or retire the category instead of deleting it.`,
      };
    }
    throw error;
  }

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "category.delete",
    entityType: "ProductCategory",
    entityId: id,
    metadata: {},
  });

  revalidatePath("/admin/categories");
  revalidatePath("/products");
  return { ok: true, message: "Category deleted." };
}

export async function moveProducts(
  fromId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const session = await requirePermission(PERMISSION);

  const toId = String(data.get("toId") ?? "");
  if (!toId) return { ok: false, errors: { toId: "Choose a category to move them to." } };
  if (toId === fromId) return { ok: false, errors: { toId: "That is the same category." } };

  const moved = await reassignProducts(fromId, toId);

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "category.reassign",
    entityType: "ProductCategory",
    entityId: fromId,
    metadata: { toId, moved },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/products");

  return {
    ok: true,
    message: `Moved ${moved} ${moved === 1 ? "product" : "products"}.`,
  };
}
