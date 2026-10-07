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
import { getProducts, getProductsGrouped } from "@/lib/catalogue";
import { media } from "@/lib/media";

export const metadata: Metadata = pageMetadata({
  title: "Compounded Formulary",
  description: "Browse the MediCraft formulary: compounded weight management, hormone, peptide, dermatology and wellness preparations. Every one requires a valid prescription.",
  path: "/products",
});

export default async function ProductsPage() {
  const [products, grouped] = await Promise.all([getProducts(), getProductsGrouped()]);

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

      <Formulary groups={grouped} />

      <ClosingCta {...closingCta} />
    </>
  );
}
