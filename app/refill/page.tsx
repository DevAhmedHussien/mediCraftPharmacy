import type { Metadata } from "next";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import { PageHero, SectionHead, SpecRail } from "@/components/blocks";
import { RefillForm } from "@/components/forms/RefillForm";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Patient Refill Request",
  description: `Request a prescription refill from ${site.name}. Enter the details from your prescription label and our team confirms every request before it enters the fulfillment queue.`,
  path: "/refill",
});

/**
 * What to expect, in the owner's own turnaround figures — 2–3 business days for
 * non-sterile, 3–5 for sterile — rather than the 24–48 hours the previous copy
 * promised. His document is explicit about both, and a refill page is the worst
 * place on the site to overpromise.
 */
const EXPECTATIONS = [
  {
    mark: "2–3 DAYS",
    title: "Non-sterile compounds",
    body: "Most non-sterile prescriptions are fulfilled within 2–3 business days of a valid prescription.",
  },
  {
    mark: "3–5 DAYS",
    title: "Sterile preparations",
    body: "Injectables and other sterile preparations typically take 3–5 business days, because every batch is tested before release.",
  },
  {
    mark: "COLD CHAIN",
    title: "Temperature-controlled shipping",
    body: "Temperature-sensitive medications ship in validated cold-chain packaging with tracking from our door to yours.",
  },
  {
    mark: "5–7 DAYS",
    title: "Request early",
    body: "Please request refills at least 5–7 days before you run out, especially for medications that require cold-chain shipping.",
  },
];

export default function RefillPage() {
  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "Patient Refill", path: "/refill" }]))} />
      <PageHero
        eyebrow="Patient Refill"
        title="Request Your Prescription Refill"
        lead="Enter the details from your prescription label and shipping address. Our team confirms every request before it enters the fulfillment queue."
      />

      <section className="section">
        <div className="container-x grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <Reveal>
            <SectionHead title="What to expect" size="sm" />
            <SpecRail items={EXPECTATIONS} className="mt-6" />

            <div className="callout mt-8">
              <strong className="font-bold text-ink">No refills left?</strong> If your
              prescription has expired or has no refills remaining, your provider
              needs to send a new one before we can fill it.
            </div>

            <p className="mt-6 text-meta text-ink-soft">
              Need help with your order? Call{" "}
              <a
                href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
                className="font-bold text-brand-600 hover:underline"
              >
                {site.phone}
              </a>{" "}
              during business hours.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-panel border border-line bg-white p-7 shadow-card md:p-9">
              <RefillForm />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
