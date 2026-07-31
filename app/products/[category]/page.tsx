import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ProductCard } from "@/components/ProductCard";
import { categories, getCategory, productsByCategory } from "@/lib/data";

type Params = { params: { category: string } };

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const category = getCategory(params.category);
  if (!category) return { title: "Products" };
  return {
    title: category.name,
    description: category.blurb,
    alternates: { canonical: `/products/${category.slug}` },
  };
}

export default function CategoryPage({ params }: Params) {
  const category = getCategory(params.category);
  if (!category) notFound();

  const items = productsByCategory(category.slug);

  return (
    <>
      <PageHeader
        cover="/images/site/cover-products.jpg"
        eyebrow="Products"
        title={category.name}
        subtitle={category.blurb}
      >
        {/* Light type: this link now sits on the cover's dark scrim, where the
            brand-700 it used to carry would be unreadable. */}
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          All products
        </Link>
      </PageHeader>

      <section className="bg-white py-14 md:py-20">
        <div className="container-x">
          {items.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.name} product={p} />
              ))}
            </div>
          ) : (
            <p className="text-ink-soft">
              Formulations in this category are made to order.{" "}
              <Link href="/providers" className="font-semibold text-brand-700 hover:underline">
                Contact us
              </Link>{" "}
              to discuss a custom compound.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
