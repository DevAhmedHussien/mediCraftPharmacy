import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { PartnershipCTA } from "@/components/sections/PartnershipCTA";
import { pillars, stats } from "@/lib/data";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about ${site.name} — a specialty compounding pharmacy pairing precision science with genuine patient care.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        cover="/images/site/cover-about.jpg"
        eyebrow="About Us"
        title="Where wellness is crafted, not manufactured"
        subtitle={`${site.name} is a specialty compounding pharmacy pairing precision science with genuine care — custom medications built around every patient, delivered fast and backed by real clinical support.`}
      />

      <section className="bg-white py-14 md:py-20">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="section-title">Our story</h2>
            <p className="mt-5 text-lg text-ink-soft">
              {site.since}, we have partnered with providers and patients to
              solve the problems commercial manufacturing can&apos;t — unusual
              doses, allergen-free bases, discontinued medications, and
              combination therapies that simplify a patient&apos;s day.
            </p>
            <p className="mt-4 text-lg text-ink-soft">
              Every prescription is made in-house by licensed compounding
              pharmacists, tracked digitally end to end, and released only after
              it clears our quality process.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-brand-100 bg-sand p-6 text-center"
              >
                <div className="font-display text-3xl font-semibold text-brand-700">
                  {s.value}
                </div>
                <p className="mt-1 text-sm text-ink-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-x">
          <h2 className="section-title text-center">What sets us apart</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-brand-100 bg-white p-6"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white">
                  <p.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-ink-soft">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PartnershipCTA />
    </>
  );
}
