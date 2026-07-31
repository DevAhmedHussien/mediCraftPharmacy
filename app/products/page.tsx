import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { PartnershipCTA } from "@/components/sections/PartnershipCTA";
import { ProductsCatalog } from "@/components/sections/ProductsCatalog";
import { StartHere } from "@/components/sections/StartHere";
import { categories, products } from "@/lib/data";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse Medicraft Pharmacy's full catalog of compounded therapies — filter by category and dosage form across weight management, hormones, peptides, dermatology, and more.",
  alternates: { canonical: "/products" },
};

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        cover="/images/site/cover-products.jpg"
        eyebrow="Our Products"
        title="Our Products"
        subtitle="Every formulation is made to order and dosed for the individual. Filter by category or dosage form to find what you need."
      />

      <StartHere />

      <ProductsCatalog products={products} categories={categories} />

      <PartnershipCTA />
    </>
  );
}
