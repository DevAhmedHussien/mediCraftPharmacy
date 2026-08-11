import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClosingCta, PageHero } from "@/components/blocks";
import { Icon } from "@/components/icons/set";
import { ProductCard } from "@/components/ProductCard";
import { closingCta, formulary } from "@/lib/content";
import { categories, getCategory, productsByCategory } from "@/lib/data";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  jsonLdProps,
  pageMetadata,
} from "@/lib/seo";

type Params = { params: { category: string } };

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const category = getCategory(params.category);
  if (!category) return { title: "Products" };

  const items = productsByCategory(category.slug);
  // The count makes each of the eleven category descriptions distinct, which
  // matters: near-identical descriptions get collapsed in search results.
  const description =
    items.length > 0
      ? `${category.blurb}. ${items.length} compounded ${
          items.length === 1 ? "formulation" : "formulations"
        } available by prescription from MediCraft Pharmacy.`
      : `${category.blurb}. Contact our provider team for current formulary availability in this category.`;

  return pageMetadata({
    title: category.name,
    description,
    path: `/products/${category.slug}`,
  });
}

export default function CategoryPage({ params }: Params) {
  const category = getCategory(params.category);
  if (!category) notFound();

  const items = productsByCategory(category.slug);

  return (
    <>
      <script
        {...jsonLdProps(
          breadcrumbJsonLd([
            { name: "Products", path: "/products" },
            { name: category.name, path: `/products/${category.slug}` },
          ])
        )}
      />
      {items.length > 0 && (
        <script
          {...jsonLdProps(
            itemListJsonLd({
              name: category.name,
              items: items.map((p) => ({
                name: p.name,
                path: `/product/${p.slug}`,
              })),
            })
          )}
        />
      )}

      <PageHero eyebrow="Formulary" title={category.name} lead={category.blurb}>
        <Link
          href="/products"
          className="link-arrow-invert mt-7 inline-flex text-meta"
        >
          <span aria-hidden>←</span> All categories
        </Link>
      </PageHero>

      <section className="section">
        <div className="container-x">
          {items.length > 0 ? (
            <>
              <p className="font-mono text-caption font-medium uppercase tracking-wider text-ink-muted">
                {items.length} {items.length === 1 ? "product" : "products"}
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            </>
          ) : (
            /* Nothing published in this specialty yet. The pharmacy still
               compounds here, so this invites the enquiry instead of reading
               as an empty shelf. */
            <div className="rounded-tile border-2 border-dashed border-line bg-sand px-6 py-16 text-center">
              <p className="text-[1.0625rem] font-bold text-ink">
                {formulary.comingSoon.title}
              </p>
              <p className="mx-auto mt-2 max-w-md text-meta text-ink-soft text-pretty">
                {formulary.comingSoon.body}
              </p>
              <Link
                href={formulary.comingSoon.cta.href}
                className="btn-primary mt-6 inline-flex"
              >
                {formulary.comingSoon.cta.label} <span aria-hidden>→</span>
              </Link>
            </div>
          )}

          <aside className="mt-14 flex items-start gap-4 rounded-tile border border-line bg-sand px-6 py-5">
            <Icon name="rx" className="mt-0.5 h-5 w-5 text-cyan-700" />
            <p className="text-meta text-ink-soft text-pretty">
              <strong className="font-bold text-ink">
                {formulary.rxNotice.label}
              </strong>{" "}
              {formulary.rxNotice.body}
            </p>
          </aside>
        </div>
      </section>

      <ClosingCta {...closingCta} />
    </>
  );
}
