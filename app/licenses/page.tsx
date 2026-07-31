import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { PartnershipCTA } from "@/components/sections/PartnershipCTA";
import { licenses } from "@/lib/data";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Licenses",
  description: `${site.name} pharmacy licenses and state permits.`,
  alternates: { canonical: "/licenses" },
};

export default function LicensesPage() {
  return (
    <>
      <PageHeader
        cover="/images/site/cover-licenses.jpg"
        eyebrow="Licenses"
        title="Licensed and permitted where we ship"
        subtitle="We maintain resident and non-resident pharmacy licenses across a growing list of states. Reach out if you don't see yours listed — coverage is expanding."
      />

      <section className="bg-white py-14 md:py-20">
        <div className="container-x">
          <div className="overflow-hidden rounded-2xl border border-brand-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-sand text-ink-muted">
                <tr>
                  <th className="px-6 py-4 font-semibold">State</th>
                  <th className="px-6 py-4 font-semibold">License type</th>
                  <th className="px-6 py-4 font-semibold">Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {licenses.map((l) => (
                  <tr key={l.state} className="text-ink-soft">
                    <td className="px-6 py-4 font-medium text-ink">{l.state}</td>
                    <td className="px-6 py-4">{l.type}</td>
                    <td className="px-6 py-4">{l.number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm text-ink-muted">
            License numbers shown are placeholders. Replace with verified permit
            numbers before launch.
          </p>
        </div>
      </section>

      <PartnershipCTA />
    </>
  );
}
