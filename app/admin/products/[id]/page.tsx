import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/ui";
import { requirePermissionPage } from "@/lib/guard";
import { getProduct } from "@/lib/services/catalog";
import { listAssignableCategories } from "@/lib/services/categories";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requirePermissionPage("products.send");

  const [product, categories] = await Promise.all([
    getProduct(params.id),
    listAssignableCategories(),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title={product.name}
      />
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
