import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { legal } from "@/lib/content";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: legal.privacy.title,
  description:
    "How MediCraft Pharmacy collects, uses and safeguards personal and health information, in compliance with HIPAA and applicable federal and state law.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <script
        {...jsonLdProps(
          breadcrumbJsonLd([{ name: legal.privacy.title, path: "/privacy" }])
        )}
      />
      <LegalPage
        doc={legal.privacy}
        contactEmail={site.privacyEmail}
        contactLabel="For privacy questions:"
      />
    </>
  );
}
