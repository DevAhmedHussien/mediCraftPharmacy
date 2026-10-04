import type { Metadata } from "next";

import { PartnerEnquiryForm } from "@/components/forms/PartnerEnquiryForm";
import { PageHero } from "@/components/blocks";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import { media } from "@/lib/media";

export const metadata: Metadata = pageMetadata({
  title: "Work With Us",
  description:
    "Open a MediCraft Pharmacy provider account. Tell us about your practice and we will send your formulary and pricing — no card details, no commitment.",
  path: "/work-with-us",
});

export default function WorkWithUsPage() {
  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "Open an Account", path: "/work-with-us" }]))} />

      <PageHero
        eyebrow="Work with us"
        title="Open a Provider Account"
        lead="Tell us about your practice and we will send your formulary and pricing. Licences, signatures and documents come later, once you have seen what we charge."
        media={media.reception}
      />

      {/* Before the form, not after it: the first question anyone filling this
          in has is how much of their life it is going to take, and the answer
          — pricing at step four, licences at step eight — is the reason to
          start. */}
      <HowItWorks />

      <section className="section">
        <div className="mx-auto w-full max-w-[52rem] px-5 sm:px-8">
          <h2 className="text-display-sm font-bold text-ink">Step one</h2>
          <p className="mt-3 max-w-prose text-intro text-ink-soft text-pretty">
            Your details and how your practice operates. We will come back within
            one business day.
          </p>
          <div className="mt-10">
            <PartnerEnquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
