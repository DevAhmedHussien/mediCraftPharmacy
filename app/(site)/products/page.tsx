import type { Metadata } from "next";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  jsonLdProps,
  pageMetadata,
} from "@/lib/seo";
import { ClosingCta, PageHero } from "@/components/blocks";
import { Formulary } from "@/components/sections/Formulary";
import {
  FormularyCategoryList,
  FormularyLock,
} from "@/components/sections/FormularyLock";
import { closingCta, formulary } from "@/lib/content";
import {
  getCategories,
  getProductCount,
  getProducts,
  getProductsGrouped,
  toFormularyProduct,
} from "@/lib/catalogue";
import { canBrowseFormulary } from "@/lib/guard";
import { categoryImage, media } from "@/lib/media";

export const metadata: Metadata = pageMetadata({
  title: "Compounded Formulary",
  description: "Browse 692 compounded preparations across weight management, HRT, TRT, sexual health, hair loss, pain management, skin care and wellness. Prescription required.",
  path: "/products",
});

/**
 * How many products each category shows on the index before deferring to its
 * own page. Twelve fills three rows at the widest grid and one screen on a
 * phone — enough to show what a category contains, short of reprinting it.
 */
const SAMPLE_PER_CATEGORY = 12;

/* Rendered per request, like the category pages beside it. The page now has
   two forms depending on who is asking, and a prerendered one would serve
   whichever form the build happened to produce to everybody. */
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  /* Two pages behind one route.
   *
   * Signed out, or signed in as anything short of a verified partner, this is
   * a directory: ten categories, their artwork, their blurbs and their live
   * counts, and one panel saying who the preparations are for. Verified, it
   * is the formulary.
   *
   * The product queries are inside the branch rather than above it. Hoisting
   * them would read 692 rows and hand them to a client component on a page
   * that renders none of them — and `Formulary` serialises everything it is
   * given into the HTML, so a gate built that way would publish the list in
   * view-source while hiding it on screen. */
  const unlocked = await canBrowseFormulary();

  if (!unlocked) {
    const [categories, totalCount] = await Promise.all([
      getCategories(),
      getProductCount(),
    ]);

    return (
      <>
        <script
          {...jsonLdProps(breadcrumbJsonLd([{ name: "Products", path: "/products" }]))}
        />
        {/* No ItemList. The products are not on this page, and marking up
            692 of them anyway is structured data that contradicts its own
            document. The individual /product pages stay public, indexable
            and in the sitemap, so the catalogue's search surface is intact. */}
        <PageHero
          eyebrow={formulary.eyebrow}
          title={formulary.title}
          lead={formulary.lead}
          media={media.formulary}
        />

        <section className="section">
          <div className="container-x flex flex-col gap-10">
            <FormularyCategoryList
              categories={categories.map((c) => ({
                slug: c.slug,
                name: c.name,
                blurb: c.blurb,
                count: c.count,
                image: categoryImage(c.slug),
              }))}
            />
            <FormularyLock count={totalCount} returnTo="/products" />
          </div>
        </section>

        <ClosingCta {...closingCta} />
      </>
    );
  }

  const [products, grouped, totalCount] = await Promise.all([
    getProducts(),
    getProductsGrouped(SAMPLE_PER_CATEGORY),
    getProductCount(),
  ]);

  /* Narrowed before it crosses to the client.

     `Formulary` is a client component so it can filter by category without a
     round trip, which means everything handed to it is serialised into the
     HTML as flight data. Passing the catalogue entries whole sent each
     product's `detail` — description, directions, both ingredient lists, the
     spec table — none of which the card renders. See `FormularyProduct` in
     lib/catalogue.ts. */
  const groups = grouped.map((g) => ({
    category: g.category,
    items: g.items.map(toFormularyProduct),
    image: categoryImage(g.category.slug),
  }));

  return (
    <>
      <script
        {...jsonLdProps(breadcrumbJsonLd([{ name: "Products", path: "/products" }]))}
      />
      {/* Marks the formulary as an ordered listing of named products rather
          than prose that happens to mention them. */}
      <script
        {...jsonLdProps(
          itemListJsonLd({
            name: "MediCraft Pharmacy formulary",
            items: products.map((p) => ({
              name: p.name,
              path: `/product/${p.slug}`,
            })),
          })
        )}
      />
      <PageHero
        eyebrow={formulary.eyebrow}
        title={formulary.title}
        lead={formulary.lead}
        media={media.formulary}
      />

      <Formulary groups={groups} totalCount={totalCount} />

      <ClosingCta {...closingCta} />
    </>
  );
}
