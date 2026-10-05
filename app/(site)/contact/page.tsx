import type { Metadata } from "next";
import { media } from "@/lib/media";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { PageHero, SectionHead } from "@/components/blocks";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactChannels } from "@/components/sections/ContactChannels";
import { Reveal } from "@/components/ui/Reveal";
import { contact } from "@/lib/content";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Reach the MediCraft Pharmacy team in Tampa, Florida — provider accounts, patient questions, and partnership inquiries.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "Contact", path: "/contact" }]))} />
      {/* Storefront straight-on at blue hour, rendered — not a photograph of 4190 Corporate Ct. */}
      <PageHero
        eyebrow={contact.intro.eyebrow}
        title={contact.intro.title}
        lead={contact.intro.lead}
        media={media.contactCover}
      />

      {/* ---- Channels ----
          The same component the site layout puts above every footer, with
          real headings here because on this page it *is* the content. */}
      <section className="section-tight">
        <div className="container-x">
          <Reveal>
            <ContactChannels headingLevel="h2" />
          </Reveal>
        </div>
      </section>

      {/* ---- Form + hours ---- */}
      <section className="section">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
            <Reveal>
              <div className="rounded-panel border border-line bg-white p-7 md:p-10">
                <SectionHead
                  title={contact.form.title}
                  lead={contact.form.lead}
                  size="sm"
                />
                <div className="mt-8">
                  <ContactForm />
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="space-y-6">
              {/* Hours */}
              <div className="card">
                <h2 className="card-title mb-5">Business Hours</h2>
                <dl className="divide-y divide-line">
                  {site.hours.map((row) => (
                    <div
                      key={row.days}
                      className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                    >
                      <dt className="text-meta text-ink-soft">{row.days}</dt>
                      <dd
                        className={`text-meta font-bold ${
                          row.closed ? "text-ink-muted" : "text-ink"
                        }`}
                      >
                        {row.time}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="callout mt-6 text-caption">{site.afterHours}</p>
              </div>

              {/* Provider quick start */}
              <div className="panel-navy">
                <h2 className="panel-title text-[1.25rem]">
                  {contact.providerQuickStart.title}
                </h2>
                <p className="mt-3 text-meta text-white/70 text-pretty">
                  {contact.providerQuickStart.body}
                </p>
                <Link href="/providers#apply" className="btn-accent mt-6 inline-flex">
                  {contact.providerQuickStart.cta} <span aria-hidden>→</span>
                </Link>
              </div>

              {/* Social */}
              <div className="card">
                <h2 className="card-title mb-4">Follow MediCraft</h2>
                <ul className="space-y-2.5">
                  {[
                    { name: "LinkedIn", handle: "MediCraft Pharmacy", href: site.social.linkedin },
                    { name: "Instagram", handle: "@medicraftpharmacy", href: site.social.instagram },
                    { name: "Facebook", handle: "MediCraft Pharmacy", href: site.social.facebook },
                  ].map((s) => (
                    <li key={s.name}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-lg border-[1.5px] border-line px-4 py-3 text-meta font-medium text-ink transition-colors hover:border-brand-300 hover:text-brand-600"
                      >
                        <span>{s.name}</span>
                        <span className="text-caption text-ink-muted">{s.handle}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
