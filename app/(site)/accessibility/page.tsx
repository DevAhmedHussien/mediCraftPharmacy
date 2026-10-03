import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";
import { legal } from "@/lib/content";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: legal.accessibility.title,
  description: legal.accessibility.intro.slice(0, 155),
  path: "/accessibility",
});

export default function Page() {
  return (
    <>
      <script
        {...jsonLdProps(breadcrumbJsonLd([{ name: legal.accessibility.title, path: "/accessibility" }]))}
      />
      <LegalPage
        doc={legal.accessibility}
        contactEmail={site.email}
        contactLabel="Questions about this notice:"
      />
    </>
  );
}
