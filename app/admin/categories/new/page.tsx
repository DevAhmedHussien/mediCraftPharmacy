import { CategoryForm } from "@/components/admin/CategoryForm";
import { PageHeader } from "@/components/admin/ui";
import { requirePermissionPage } from "@/lib/guard";

export const metadata = { title: "New category" };

export default async function NewCategoryPage() {
  await requirePermissionPage("products.send");

  return (
    <div className="space-y-4">
      <PageHeader
        back={{ href: "/admin/categories", label: "Categories" }}
        title="New category"
        description="A way to divide the catalogue. Publish it to give it a page on the site, or leave it unpublished to organise the partner formulary only."
      />
      <CategoryForm />
    </div>
  );
}
