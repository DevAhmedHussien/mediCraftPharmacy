import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { PartnershipCTA } from "@/components/sections/PartnershipCTA";
import { qualityStandards } from "@/lib/data";

export const metadata: Metadata = {
  title: "Quality",
  description:
    "PCAB-accredited, USP 795/797-compliant compounding with third-party potency testing and end-to-end batch tracking.",
  alternates: { canonical: "/quality" },
};

export default function QualityPage() {
  return (
    <>
      <PageHeader
        cover="/images/site/cover-quality.jpg"
        eyebrow="Quality"
        title="Held to a higher standard, every batch"
        subtitle="Quality isn't a checkpoint at the end — it's built into every step, from ingredient sourcing to the moment a prescription ships."
      />

      <section className="bg-white py-14 md:py-20">
        <div className="container-x grid gap-6 sm:grid-cols-2">
          {qualityStandards.map((s) => (
            <div
              key={s.title}
              className="flex gap-5 rounded-2xl border border-brand-100 bg-sand p-6"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
                <s.icon className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold text-ink">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-ink-soft">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-x">
          <div className="overflow-hidden rounded-[2rem] bg-brand-900 p-10 text-center md:p-16">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Our 99.7% quality pass rate
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-100">
              Independent labs verify potency and sterility on representative
              batches before release. When something doesn&apos;t meet spec, it
              never leaves the lab.
            </p>
          </div>
        </div>
      </section>

      <PartnershipCTA />
    </>
  );
}
