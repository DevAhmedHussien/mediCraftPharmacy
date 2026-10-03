"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { moveProducts, removeCategory, saveCategory } from "@/app/admin/categories/actions";
import { AdminAlert } from "@/components/admin/AdminAlert";
import {
  AdminCheckbox,
  AdminField,
  AdminReadOnly,
  AdminSubmit,
  AdminTextArea,
} from "@/components/admin/form";
import { Panel } from "@/components/admin/ui";
import { initialFormState } from "@/lib/forms";

/* ===========================================================================
   Create or edit a therapeutic category.

   The two checkboxes answer different questions and the hints say which:
   `isPublished` is "does the public see it", `isActive` is "can products still
   be filed here". Collapsing them into one "enabled" toggle is how a category
   ends up either invisible to partners or unexpectedly live on the site.

   A populated category cannot be deleted — the foreign key is SET NULL, so
   deleting would succeed and silently orphan everything in it. The form offers
   to move the products somewhere first, which is the thing anyone actually
   wants to do.
   ========================================================================= */

export type CategoryFormValues = {
  id: string;
  slug: string;
  name: string;
  blurb: string | null;
  icon: string | null;
  sortOrder: number;
  isPublished: boolean;
  isActive: boolean;
  productCount: number;
};

export function CategoryForm({
  category,
  others,
}: {
  category?: CategoryFormValues;
  /** Somewhere to move products to before deleting this one. */
  others?: { id: string; name: string }[];
}) {
  const [state, action] = useFormState(
    saveCategory.bind(null, category?.id ?? null),
    initialFormState
  );

  return (
    <div className="space-y-4">
      <Panel
        title={category ? "Edit category" : "New category"}
        description={
          category
            ? "The slug is a public URL and cannot be changed."
            : "The slug becomes the URL at /products/<slug>. Leave it blank and we will derive one from the name."
        }
      >
        <form action={action} className="space-y-5">
          {state.message && <AdminAlert ok={state.ok}>{state.message}</AdminAlert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField
              name="name"
              label="Name"
              defaultValue={category?.name}
              error={state.errors?.name}
              placeholder="Hormone Therapy"
            />

            {category ? (
              <AdminReadOnly label="URL slug" value={category.slug} />
            ) : (
              <AdminField
                name="slug"
                label="URL slug"
                optional
                hint="Lower case, numbers and hyphens."
                error={state.errors?.slug}
                placeholder="hormone-therapy"
              />
            )}
          </div>

          <AdminTextArea
            name="blurb"
            label="Blurb"
            optional
            rows={2}
            hint="One line, shown under the category name on the site."
            defaultValue={category?.blurb ?? ""}
            error={state.errors?.blurb}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField
              name="icon"
              label="Icon"
              optional
              hint="A name from the icon set: scale, dna, vial, leaf, tablet, heart, stethoscope, flower, dumbbell, droplet, mortar."
              defaultValue={category?.icon ?? ""}
              error={state.errors?.icon}
            />
            <AdminField
              name="sortOrder"
              label="Sort order"
              type="number"
              optional
              hint="Lower numbers come first."
              defaultValue={category?.sortOrder ?? 0}
              error={state.errors?.sortOrder}
            />
          </div>

          <div className="space-y-3 border-t pt-4" style={{ borderColor: "var(--admin-border)" }}>
            <AdminCheckbox
              name="isPublished"
              label="Show on the public site"
              hint="Gives it a page at /products/<slug> and a place in the navigation."
              defaultChecked={category?.isPublished ?? false}
            />
            <AdminCheckbox
              name="isActive"
              label="Accepting products"
              hint="Turn off to retire it. Products already filed here keep their category; it just stops appearing in the picker."
              defaultChecked={category?.isActive ?? true}
            />
          </div>

          <div className="flex items-center gap-3 border-t pt-4" style={{ borderColor: "var(--admin-border)" }}>
            <AdminSubmit>{category ? "Save changes" : "Create category"}</AdminSubmit>
            <Link href="/admin/categories" className="admin-btn admin-btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </Panel>

      {category && <DangerZone category={category} others={others ?? []} />}
    </div>
  );
}

function DangerZone({
  category,
  others,
}: {
  category: CategoryFormValues;
  others: { id: string; name: string }[];
}) {
  const [moveState, move] = useFormState(
    moveProducts.bind(null, category.id),
    initialFormState
  );
  const [deleteState, remove] = useFormState(
    removeCategory.bind(null, category.id),
    initialFormState
  );

  const populated = category.productCount > 0;

  return (
    <Panel
      title="Move or delete"
      description={
        populated
          ? `${category.productCount} ${category.productCount === 1 ? "product is" : "products are"} filed here. Move them before deleting, or retire the category above instead.`
          : "Nothing is filed here, so this category can be deleted outright."
      }
    >
      {populated && (
        <form action={move} className="mb-5 space-y-3">
          {moveState.message && <AdminAlert ok={moveState.ok}>{moveState.message}</AdminAlert>}

          <label htmlFor="toId" className="admin-label block">
            Move all {category.productCount} products to
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select id="toId" name="toId" className="admin-input max-w-xs" defaultValue="">
              <option value="">Choose a category…</option>
              {others.map((other) => (
                <option key={other.id} value={other.id}>
                  {other.name}
                </option>
              ))}
            </select>
            <AdminSubmit>Move products</AdminSubmit>
          </div>
          {moveState.errors?.toId && (
            <p role="alert" className="text-[0.75rem] font-medium text-[#9c3a2a]">
              {moveState.errors.toId}
            </p>
          )}
        </form>
      )}

      <form action={remove}>
        {deleteState.message && <AdminAlert ok={deleteState.ok}>{deleteState.message}</AdminAlert>}
        <button
          type="submit"
          disabled={populated}
          className="admin-btn admin-btn-danger mt-3"
          title={populated ? "Move the products out of it first." : undefined}
        >
          Delete this category
        </button>
      </form>
    </Panel>
  );
}
