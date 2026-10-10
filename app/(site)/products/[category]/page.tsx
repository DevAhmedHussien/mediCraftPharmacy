import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClosingCta, PageHero } from "@/components/blocks";
import { ProductCard } from "@/components/ProductCard";
import { closingCta } from "@/lib/content";
import { getCategory, getProductsByCategory } from "@/lib/catalogue";
import { categoryImage } from "@/lib/media";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  jsonLdProps,
  pageMetadata,
} from "@/lib/seo";

type Params = { params: { category: string } };

/* Rendered per request.
 *
 * This route used to read its paths from Postgres at build time, and
 * lib/static-params.ts degrades to zero paths when no database is reachable
 * — which is exactly what happens inside `docker build`, by design. Next
 * then treats the route as static with no prerendered paths and renders it
 * on demand in a STATIC context, where the (site) layout's `auth()` call
 * throws DYNAMIC_SERVER_USAGE and the request 500s.
 *
 * Locally the database is up, every path is prerendered to a file, and no
 * page ever re-renders — so the build is green, the local site is perfect,
 * and every one of these pages is a 500 in production. This is the line
 * that makes the two environments agree.
 *
 * `generateStaticParams` is GONE rather than kept. Next 14 prioritises it
 * over this directive — with both present the route is still prerendered
 * and the 500 comes back — so the two cannot coexist. Nothing is lost: the
 * layout's session read makes every page here dynamic anyway, so the
 * prerendering only ever took effect in a local build and never in the
 * image that actually serves production.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const category = await getCategory(params.category);
  if (!category) return { title: "Products" };

  // The count makes each of the ten category descriptions distinct, which
  // matters: near-identical descriptions get collapsed in search results.
  const description = `${category.blurb}. ${category.count} compounded ${
    category.count === 1 ? "formulation" : "formulations"
  } available by prescription from MediCraft Pharmacy.`;

  return pageMetadata({
    title: category.name,
    description,
    path: `/products/${category.slug}`,
  });
}

export default async function CategoryPage({ params }: Params) {
  const category = await getCategory(params.category);
  if (!category) notFound();

  const items = await getProductsByCategory(category.slug);

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

      <PageHero
        eyebrow="Formulary"
        title={category.name}
        lead={category.blurb}
        media={categoryImage(category.slug)}
      >
        <Link
          href="/products"
          className="link-arrow-invert mt-7 inline-flex text-meta"
        >
          <span aria-hidden>←</span> All categories
        </Link>
      </PageHero>

      <section className="section">
        <div className="container-x">
          <p className="font-mono text-caption font-medium uppercase tracking-wider text-ink-muted">
            {items.length} {items.length === 1 ? "product" : "products"}
          </p>

          {/* `headingLevel={2}`: on this page the grid is the content directly
              under the h1, with no category heading between, so the cards' own
              titles are the second level. */}
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.slug} product={p} headingLevel={2} />
            ))}
          </div>

          {/* No "coming soon" panel and no prescription box.
              Every published category is a formulary category and every
              formulary category has products, so the panel could only ever
              appear on a data fault — and the Rx notice it sat beside was the
              third copy of a statement the site footer already makes on every
              page. Both were removed per the 8 October brief; the footer
              disclaimer stays. */}
        </div>
      </section>

      <ClosingCta {...closingCta} />
    </>
  );
}
