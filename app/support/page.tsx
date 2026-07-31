import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PartnershipCTA } from "@/components/sections/PartnershipCTA";
import { faqs } from "@/lib/data";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support",
  description: `Get help from the ${site.name} care team — contact details, hours, and answers to common questions.`,
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  const contacts = [
    { icon: Phone, label: site.phone, href: `tel:${site.phone}` },
    { icon: Mail, label: site.email, href: `mailto:${site.email}` },
    { icon: MapPin, label: site.address, href: "#" },
    { icon: Clock, label: site.hours, href: "#" },
  ];

  return (
    <>
      <PageHeader
        cover="/images/site/cover-support.jpg"
        eyebrow="Support"
        title="We're here to help"
        subtitle="A dedicated care team that answers on the first ring — no phone trees, no waiting on hold. Reach us during business hours or send a note anytime."
      />

      <section className="bg-white py-14 md:py-20">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="section-title">Contact us</h2>
            <div className="mt-8 space-y-4">
              {contacts.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  className="flex items-center gap-4 rounded-xl border border-brand-100 bg-sand p-4 transition-colors hover:border-brand-300"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <span className="text-ink-soft">{c.label}</span>
                </a>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/refill" className="btn-primary">
                Request a refill
              </Link>
              <Link href="/providers" className="btn-ghost">
                New provider enrollment
              </Link>
            </div>
          </div>

          <div>
            <h2 className="section-title">Frequently asked</h2>
            <div className="mt-8 space-y-4">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-xl border border-brand-100 bg-sand p-5"
                >
                  <summary className="cursor-pointer list-none font-semibold text-ink marker:content-['']">
                    {f.q}
                  </summary>
                  <p className="mt-3 text-sm text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PartnershipCTA />
    </>
  );
}
