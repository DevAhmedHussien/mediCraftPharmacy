import Link from "next/link";
import { Plus } from "lucide-react";

import { Cell, DataTable, EmptyState, PageHeader, Panel, Pill, Row } from "@/components/admin/ui";
import { hasPermission, requireAdminPage } from "@/lib/guard";
import { listCategories } from "@/lib/services/categories";

export const metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const session = await requireAdminPage();
  const canEdit = hasPermission(session, "products.send");

  const categories = await listCategories();

  const published = categories.filter((c) => c.isPublished);
  const operational = categories.filter((c) => !c.isPublished);
  const filed = categories.reduce((total, c) => total + c._count.products, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categories"
        description="How the catalogue is divided. Published categories appear on the public site; the rest organise the partner formulary."
        actions={
          canEdit && (
            <Link href="/admin/categories/new" className="admin-btn admin-btn-primary">
              <Plus className="size-3.5" strokeWidth={2.4} aria-hidden />
              New category
            </Link>
          )
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="A product needs somewhere to go. Create the first one."
          action={{ label: "New category", href: "/admin/categories/new" }}
        />
      ) : (
        <>
          <Panel
            title="On the public site"
            description={`${published.length} of ${categories.length}, ordered as they appear.`}
            bodyClassName="p-0"
          >
            <CategoryTable rows={published} canEdit={canEdit} />
          </Panel>

          <Panel
            title="Formulary only"
            description="Not shown to the public. Publish one to give it a page on the site."
            bodyClassName="p-0"
          >
            {operational.length === 0 ? (
              <p className="px-4 py-3 text-[0.8125rem] text-[color:var(--admin-ink-50)]">
                Every category is published.
              </p>
            ) : (
              <CategoryTable rows={operational} canEdit={canEdit} />
            )}
          </Panel>

          <p className="text-[0.75rem] text-[color:var(--admin-ink-50)]">
            {filed.toLocaleString()} products filed across {categories.length} categories.
          </p>
        </>
      )}
    </div>
  );
}

type CategoryRow = Awaited<ReturnType<typeof listCategories>>[number];

function CategoryTable({ rows, canEdit }: { rows: CategoryRow[]; canEdit: boolean }) {
  return (
    <DataTable head={["Category", "Slug", "Products", "Order", "Status", ""]}>
      {rows.map((category) => (
        <Row key={category.id}>
          <Cell>
            <span className="block font-medium">{category.name}</span>
            {category.blurb && (
              <span className="mt-0.5 block max-w-prose truncate text-[0.75rem] text-[color:var(--admin-ink-50)]">
                {category.blurb}
              </span>
            )}
          </Cell>
          <Cell>
            <span className="admin-id">{category.slug}</span>
          </Cell>
          <Cell numeric>{category._count.products}</Cell>
          <Cell numeric className="text-[color:var(--admin-ink-50)]">
            {category.sortOrder}
          </Cell>
          <Cell>
            {!category.isActive ? (
              <Pill tone="neutral">retired</Pill>
            ) : category.isPublished ? (
              <Pill tone="good">published</Pill>
            ) : (
              <Pill tone="info">formulary</Pill>
            )}
          </Cell>
          <Cell>
            {canEdit && (
              <Link
                href={`/admin/categories/${category.id}`}
                className="text-[0.8125rem] font-medium text-[color:var(--admin-accent)] hover:underline"
              >
                Edit
              </Link>
            )}
          </Cell>
        </Row>
      ))}
    </DataTable>
  );
}
