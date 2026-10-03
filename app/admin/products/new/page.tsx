import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/ui";
import { requirePermissionPage } from "@/lib/guard";
import { listAssignableCategories } from "@/lib/services/categories";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  // Not just a render guard: reaching this URL without products.send bounces
  // back to the admin home before the form is ever drawn.
  await requirePermissionPage("products.send");

  const categories = await listAssignableCategories();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title="New product"
      />
      <ProductForm categories={categories} />
    </div>
  );
}
