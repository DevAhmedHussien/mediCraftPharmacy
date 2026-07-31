import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ProviderForm } from "@/components/forms/ProviderForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "New Provider Enrollment",
  description: `Enroll your practice with ${site.name} — reliable compounding, fast turnaround, and dedicated clinical partnership.`,
  alternates: { canonical: "/providers" },
};

const perks = [
  "Free provider portal with real-time order tracking",
  "Dedicated clinical liaison for your practice",
  "Bulk and recurring prescription workflows",
  "Transparent pricing, no hidden fees",
];

export default function ProvidersPage() {
  return (
    <>
      <PageHeader
        cover="/images/site/cover-providers.jpg"
        eyebrow="For Providers"
        title="Partner with a pharmacy that works the way you do"
        subtitle="Join 1,200+ providers who trust Medicraft for reliable compounding, fast turnaround, and clinical partnership. Complete the enrollment below to get started."
      />

      <section className="bg-white py-14 md:py-20">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              Why practices choose Medicraft
            </h2>
            <ul className="mt-6 space-y-4">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-ink-soft">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl border border-brand-100 bg-sand p-6 text-sm text-ink-soft">
              Already enrolled?{" "}
              <a
                href={site.loginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-700 hover:underline"
              >
                Log in to the provider portal
              </a>
              .
            </div>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-sand p-6 sm:p-8">
            <ProviderForm />
          </div>
        </div>
      </section>
    </>
  );
}
