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
import { products, productsGrouped } from "@/lib/data";

export const metadata: Metadata = pageMetadata({
  title: "Products",
  description: "MediCraft Pharmacy",
  path: "/products",
});

export default function ProductsPage() {
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
      />

      <Formulary groups={productsGrouped} />

      <ClosingCta {...closingCta} />
    </>
  );
}
