import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";
import { legal } from "@/lib/content";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: legal.shipping.title,
  description: legal.shipping.intro.slice(0, 155),
  path: "/shipping-and-returns",
});

export default function Page() {
  return (
    <>
      <script
        {...jsonLdProps(breadcrumbJsonLd([{ name: legal.shipping.title, path: "/shipping-and-returns" }]))}
      />
      <LegalPage
        doc={legal.shipping}
        contactEmail={site.email}
        contactLabel="Questions about this notice:"
      />
    </>
  );
}
