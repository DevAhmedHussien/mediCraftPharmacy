"use client";

import { useFormState } from "react-dom";

import { saveProduct } from "@/app/admin/products/actions";
import { AdminAlert } from "@/components/admin/AdminAlert";
import {
  AdminCheckbox,
  AdminField,
  AdminReadOnly,
  AdminSelect,
  AdminSubmit,
  AdminTextArea,
} from "@/components/admin/form";
import { Panel } from "@/components/admin/ui";
import { initialFormState } from "@/lib/forms";

type Product = {
  id: string;
  slug: string;
  name: string;
  strength: string | null;
  form: string | null;
  ndc: string | null;
  categoryId: string | null;
  blurb: string | null;
  description: string | null;
  productClass: string | null;
  route: string | null;
  packageSize: string | null;
  rxStatus: string | null;
  deaSchedule: string | null;
  bud: string | null;
  coldChain: boolean;
  isQuoteOnly: boolean;
  listPrice: string;
  unit: string;
  isPublished: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type CategoryOption = { id: string; name: string; isPublished: boolean };

/* The vocabularies the 2026 formulary actually uses. Offered as a list rather
   than a free-text box so 692 imported rows and one typed by hand end up
   spelling the same thing the same way — the spreadsheet itself had "cream"
   for "Cream" and "CIV" for "C-IV". */
const PRODUCT_CLASSES = ["Compounded", "Non-Compounded", "Supply"];
const RX_STATUSES = ["Rx", "OTC", "OTC/Rx", "Supply"];
const DEA_SCHEDULES = [
  { value: "NC", label: "NC — not controlled" },
  { value: "C-III", label: "C-III" },
  { value: "C-IV", label: "C-IV" },
  { value: "C-V", label: "C-V" },
];

/**
 * Create / edit a product.
 *
 * `saveProduct` is bound to the id, so one component covers both cases and
 * there is no near-identical second form to keep in sync. The slug is
 * read-only on an existing product: it is a public URL, and editing it
 * silently breaks every saved link.
 */
export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: CategoryOption[];
}) {
  const action = saveProduct.bind(null, product?.id ?? null);
  const [state, formAction] = useFormState(action, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state.message && <AdminAlert ok={state.ok}>{state.message}</AdminAlert>}

      <Panel title="Identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField
            name="name"
            label="Product name"
            defaultValue={product?.name}
            error={state.errors?.name}
            className="sm:col-span-2"
          />

          {product ? (
            <AdminReadOnly
              label="URL slug"
              value={`/product/${product.slug}`}
              hint="Fixed after creation — changing it would break saved links."
            />
          ) : (
            <AdminField
              name="slug"
              label="URL slug"
              optional
              placeholder="Generated from the name when blank"
              error={state.errors?.slug}
            />
          )}

          <AdminSelect
            name="categoryId"
            label="Category"
            optional
            hint="Manage the list under Categories."
            placeholder="Unfiled"
            options={categories.map((c) => ({
              value: c.id,
              label: c.isPublished ? c.name : `${c.name} (formulary only)`,
            }))}
            defaultValue={product?.categoryId ?? ""}
            error={state.errors?.categoryId}
          />
          <AdminField
            name="strength"
            label="Strength"
            optional
            defaultValue={product?.strength ?? ""}
            error={state.errors?.strength}
          />
          <AdminField
            name="form"
            label="Dosage form"
            optional
            defaultValue={product?.form ?? ""}
            error={state.errors?.form}
          />
          <AdminField
            name="ndc"
            label="NDC"
            optional
            placeholder="12345-678-90"
            defaultValue={product?.ndc ?? ""}
            error={state.errors?.ndc}
          />
        </div>
      </Panel>

      <Panel
        title="Formulary detail"
        description="What the 2026 Partner Formulary records for an orderable item. Optional, but a partner's price list reads from it."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <AdminSelect
            name="productClass"
            label="Product class"
            optional
            options={PRODUCT_CLASSES.map((v) => ({ value: v, label: v }))}
            defaultValue={product?.productClass ?? ""}
            error={state.errors?.productClass}
          />
          <AdminField
            name="route"
            label="Route"
            optional
            placeholder="Oral, Topical, IM | SQ Injection"
            defaultValue={product?.route ?? ""}
            error={state.errors?.route}
          />
          <AdminField
            name="packageSize"
            label="Package / fill volume"
            optional
            placeholder="ea, 10ML Vial, 30gm"
            defaultValue={product?.packageSize ?? ""}
            error={state.errors?.packageSize}
          />
          <AdminSelect
            name="rxStatus"
            label="Rx status"
            optional
            options={RX_STATUSES.map((v) => ({ value: v, label: v }))}
            defaultValue={product?.rxStatus ?? ""}
            error={state.errors?.rxStatus}
          />
          <AdminSelect
            name="deaSchedule"
            label="DEA schedule"
            optional
            options={DEA_SCHEDULES}
            defaultValue={product?.deaSchedule ?? ""}
            error={state.errors?.deaSchedule}
          />
          <AdminField
            name="bud"
            label="Beyond-use dating"
            optional
            placeholder="180 Days RT"
            defaultValue={product?.bud ?? ""}
            error={state.errors?.bud}
          />
        </div>

        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--admin-border)" }}>
          <AdminCheckbox
            name="coldChain"
            label="Ships refrigerated"
            hint="MSA §1.4 commits us to validated cold packaging for anything marked here, so it is a decision rather than a guess from the dating."
            defaultChecked={product?.coldChain ?? false}
          />
        </div>
      </Panel>

      <Panel
        title="Pricing"
        description="The published list price. A partner's negotiated price lives on their own price list and is never overwritten from here."
      >
        <div className="mb-4">
          <AdminCheckbox
            name="isQuoteOnly"
            label="Priced by quote"
            hint="MSA §4.1. Leaves it out of automatic price-list drafts instead of showing a partner $0.00 and inviting them to accept it."
            defaultChecked={product?.isQuoteOnly ?? false}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <AdminField
            name="listPrice"
            label="List price (USD)"
            optional
            hint="Leave blank only when priced by quote."
            defaultValue={product?.isQuoteOnly ? "" : product?.listPrice}
            error={state.errors?.listPrice}
          />
          <AdminField
            name="unit"
            label="Per unit"
            defaultValue={product?.unit ?? "each"}
            error={state.errors?.unit}
          />
          <AdminField
            name="sortOrder"
            label="Sort order"
            type="number"
            defaultValue={product?.sortOrder ?? 0}
            error={state.errors?.sortOrder}
          />
        </div>
      </Panel>

      <Panel title="Copy">
        <div className="space-y-4">
          <AdminField
            name="blurb"
            label="Short blurb"
            optional
            defaultValue={product?.blurb ?? ""}
            error={state.errors?.blurb}
          />
          <AdminTextArea
            name="description"
            label="Description"
            optional
            defaultValue={product?.description ?? ""}
            error={state.errors?.description}
          />
        </div>
      </Panel>

      <Panel
        title="Visibility"
        description="Two separate questions: can partners order it, and can the public see it."
      >
        <div className="space-y-3">
          <AdminCheckbox
            name="isActive"
            label="Orderable by partners"
            hint="Hidden products keep their history and their negotiated prices — they just stop appearing in the formulary and in new price lists."
            defaultChecked={product?.isActive ?? true}
          />
          <AdminCheckbox
            name="isPublished"
            label="Show on the public site"
            hint="Gives it a page at /product/<slug>. Most of the formulary is orderable without being a page a patient browses to — it needs photography and copy first."
            defaultChecked={product?.isPublished ?? false}
          />
        </div>
      </Panel>

      <div className="flex items-center gap-2">
        <AdminSubmit>{product ? "Save changes" : "Create product"}</AdminSubmit>
      </div>
    </form>
  );
}
