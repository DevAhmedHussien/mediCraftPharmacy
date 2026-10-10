import type { Metadata } from "next";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  jsonLdProps,
  pageMetadata,
} from "@/lib/seo";
import { ClosingCta, PageHero } from "@/components/blocks";
import { Formulary } from "@/components/sections/Formulary";
import { closingCta, formulary } from "@/lib/content";
import {
  getProductCount,
  getProducts,
  getProductsGrouped,
  toFormularyProduct,
} from "@/lib/catalogue";
import { categoryImage, media } from "@/lib/media";

export const metadata: Metadata = pageMetadata({
  title: "Compounded Formulary",
  description: "Browse the MediCraft formulary: 692 compounded preparations across weight management, HRT, TRT, sexual health, hair loss, pain management, skin care, wellness and supplies. Every one requires a valid prescription.",
  path: "/products",
});

/**
 * How many products each category shows on the index before deferring to its
 * own page. Twelve fills three rows at the widest grid and one screen on a
 * phone — enough to show what a category contains, short of reprinting it.
 */
const SAMPLE_PER_CATEGORY = 12;

export default async function ProductsPage() {
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
