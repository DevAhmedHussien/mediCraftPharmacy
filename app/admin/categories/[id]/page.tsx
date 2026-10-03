import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/CategoryForm";
import { PageHeader, Pill } from "@/components/admin/ui";
import { requirePermissionPage } from "@/lib/guard";
import { getCategory, listCategories } from "@/lib/services/categories";

export const metadata = { title: "Category" };
export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  await requirePermissionPage("products.send");

  const [category, all] = await Promise.all([getCategory(params.id), listCategories()]);
  if (!category) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        back={{ href: "/admin/categories", label: "Categories" }}
        title={category.name}
        description={`/products/${category.slug}`}
        actions={
          category.isPublished ? (
            <Pill tone="good">published</Pill>
          ) : (
            <Pill tone="info">formulary only</Pill>
          )
        }
      />

      <CategoryForm
        category={{
          id: category.id,
          slug: category.slug,
          name: category.name,
          blurb: category.blurb,
          icon: category.icon,
          sortOrder: category.sortOrder,
          isPublished: category.isPublished,
          isActive: category.isActive,
          productCount: category._count.products,
        }}
        others={all
          .filter((c) => c.id !== category.id && c.isActive)
          .map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
