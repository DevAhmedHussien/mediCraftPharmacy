import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { legal } from "@/lib/content";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: legal.terms.title,
  description:
    "Terms governing use of the MediCraft Pharmacy website, including intended use, the prescription requirement, and limitation of liability.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <script
        {...jsonLdProps(
          breadcrumbJsonLd([{ name: legal.terms.title, path: "/terms" }])
        )}
      />
      <LegalPage
        doc={legal.terms}
        contactEmail={site.legalEmail}
        contactLabel="For legal inquiries:"
      />
    </>
  );
}
