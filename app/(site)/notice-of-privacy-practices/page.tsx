import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";
import { legal } from "@/lib/content";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: legal.hipaa.title,
  description: legal.hipaa.intro.slice(0, 155),
  path: "/notice-of-privacy-practices",
});

export default function Page() {
  return (
    <>
      <script
        {...jsonLdProps(breadcrumbJsonLd([{ name: legal.hipaa.title, path: "/notice-of-privacy-practices" }]))}
      />
      <LegalPage
        doc={legal.hipaa}
        contactEmail={site.privacyEmail}
        contactLabel="Questions about this notice:"
      />
    </>
  );
}
