import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminSearch } from "@/components/admin/AdminSearch";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { EmptyState, PageHeader, Panel } from "@/components/admin/ui";
import { hasPermission, requireAdminPage } from "@/lib/guard";
import { listCategories, listProducts } from "@/lib/services/catalog";

export const metadata = { title: "Products" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { category?: string; status?: string; saved?: string; all?: string };
}) {
  const session = await requireAdminPage();
  const canEdit = hasPermission(session, "products.send");

  const status = (["active", "hidden"] as const).find((s) => s === searchParams.status) ?? "all";

  /* The catalogue is 721 rows. The table filters and sorts on the client, so
     it needs the rows it is filtering — but shipping all of them to every
     visit is 700 rows of HTML for someone who wanted to check one price.
     A page of 100, and one link for the times you want the lot. */
  const showAll = searchParams.all === "1";

  const [{ items, total }, categories] = await Promise.all([
    listProducts({
      category: searchParams.category,
      status,
      limit: showAll ? 5000 : 100,
    }),
    listCategories(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description="The published list price partners negotiate against. A partner's own agreed price lives on their price list and is never changed from here."
        actions={
          canEdit && (
            <Link href="/admin/products/new" className="admin-btn admin-btn-primary">
              <Plus className="size-3.5" strokeWidth={2.4} aria-hidden />
              New product
            </Link>
          )
        }
      />

      {searchParams.saved && (
        <p
          role="status"
          className="admin-panel px-4 py-2.5 text-[0.8125rem]"
          style={{ borderColor: "#bcd9c6", background: "#f2f9f4", color: "#2c6b4d" }}
        >
          Product saved.
        </p>
      )}

      <Panel
        bodyClassName="p-3"
        actions={
          <AdminSearch
            basePath="/admin/products"
            filters={[
              {
                name: "status",
                value: searchParams.status,
                options: [
                  { value: "", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "hidden", label: "Hidden" },
                ],
              },
              {
                name: "category",
                value: searchParams.category,
                options: [
                  { value: "", label: "All categories" },
                  ...categories.map((c) => ({ value: c, label: c.replace(/-/g, " ") })),
                ],
              },
            ]}
          />
        }
        title={
          items.length < total
            ? `${items.length} of ${total.toLocaleString()} products`
            : `${total.toLocaleString()} product${total === 1 ? "" : "s"}`
        }
      >
        {items.length === 0 ? (
          <EmptyState
            title="No products match these filters"
            description="Clear the filters to see the whole catalog, or add a product."
            action={canEdit ? { label: "New product", href: "/admin/products/new" } : undefined}
          />
        ) : (
          <ProductsTable
            rows={items.map((p) => ({
              ...p,
              // The relation comes back nested; the table wants one flat row.
              categoryName: p.category?.name ?? null,
            }))}
            canEdit={canEdit}
          />
        )}

        {items.length < total && (
          <p className="border-t px-4 py-3 text-[0.8125rem]" style={{ borderColor: "var(--admin-border)" }}>
            Showing the first {items.length}.{" "}
            <Link
              href={{ pathname: "/admin/products", query: { ...searchParams, all: "1" } }}
              className="font-medium text-[color:var(--admin-accent)] hover:underline"
            >
              Load all {total.toLocaleString()}
            </Link>{" "}
            <span className="text-[color:var(--admin-ink-50)]">
              — or narrow it with the filters above.
            </span>
          </p>
        )}
      </Panel>
    </div>
  );
}
