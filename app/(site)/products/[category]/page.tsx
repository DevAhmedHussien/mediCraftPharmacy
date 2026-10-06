import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClosingCta, PageHero } from "@/components/blocks";
import { Icon } from "@/components/icons/set";
import { ProductCard } from "@/components/ProductCard";
import { closingCta, formulary } from "@/lib/content";
import { getCategory, getProductsByCategory } from "@/lib/catalogue";
import { media } from "@/lib/media";
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

  const items = await getProductsByCategory(category.slug);
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
        media={media.formulary}
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
               compounds here, so this invites the inquiry instead of reading
               as an empty shelf. */
            <div className="flex flex-col items-start gap-2.5 rounded-card border border-dashed border-hair-strong px-7 py-12">
              <p className="text-[1.25rem] font-medium text-navy">
                {formulary.comingSoon.title}
              </p>
              <p className="max-w-[46ch] text-[0.9375rem] text-ink-soft text-pretty">
                {formulary.comingSoon.body}
              </p>
              <Link href={formulary.comingSoon.cta.href} className="btn btn-primary mt-1.5">
                {formulary.comingSoon.cta.label}
              </Link>
            </div>
          )}

          <aside className="mt-14 flex items-start gap-4 rounded-[1.25rem] border border-hair-soft bg-white px-6 py-5">
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
