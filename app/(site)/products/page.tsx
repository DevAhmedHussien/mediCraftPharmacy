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
import { getProducts, getProductsGrouped, toFormularyProduct } from "@/lib/catalogue";
import { media } from "@/lib/media";

export const metadata: Metadata = pageMetadata({
  title: "Compounded Formulary",
  description: "Browse the MediCraft formulary: compounded weight management, hormone, peptide, dermatology and wellness preparations. Every one requires a valid prescription.",
  path: "/products",
});

export default async function ProductsPage() {
  const [products, grouped] = await Promise.all([getProducts(), getProductsGrouped()]);

  /* Narrowed before it crosses to the client.
  
     `Formulary` is a client component so it can filter by category without a
     round trip, which means everything handed to it is serialised into the
     HTML as flight data. Passing the catalogue entries whole sent each
     product's `detail` — description, directions, both ingredient lists, the
     spec table — for 29 products that render none of it. See
     `FormularyProduct` in lib/catalogue.ts. */
  const groups = grouped.map((g) => ({
    category: g.category,
    items: g.items.map(toFormularyProduct),
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

      <Formulary groups={groups} />

      <ClosingCta {...closingCta} />
    </>
  );
}
