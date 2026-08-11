import type { Metadata } from "next";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { PageHero, SectionHead } from "@/components/blocks";
import { Icon, type IconName } from "@/components/icons/set";
import { ContactForm } from "@/components/forms/ContactForm";
import { Reveal } from "@/components/ui/Reveal";
import { contact } from "@/lib/content";
import { media } from "@/lib/media";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Reach the MediCraft Pharmacy team in Palm Harbor, Florida — provider accounts, patient questions, and partnership enquiries.",
  path: "/contact",
});

/** The four ways to reach the pharmacy, as listed in the owner's document. */
const CHANNELS = [
  {
    icon: "phone" as IconName,
    label: "Phone",
    value: site.phone,
    note: "Mon–Fri 8 AM–6 PM ET",
    href: `tel:${site.phone.replace(/[^\d+]/g, "")}`,
  },
  {
    icon: "mail" as IconName,
    label: "Email",
    value: site.email,
    note: "Response within 1 business day",
    href: `mailto:${site.email}`,
  },
  {
    icon: "pin" as IconName,
    label: "Location",
    value: site.address,
    note: "Serving patients nationwide",
  },
  {
    icon: "link" as IconName,
    label: "Provider Accounts",
    value: site.providerEmail,
    note: "Dedicated provider support line",
    href: `mailto:${site.providerEmail}`,
    accent: true,
  },
];

export default function ContactPage() {
  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "Contact", path: "/contact" }]))} />
      <PageHero
        media={media.support}
        eyebrow={contact.intro.eyebrow}
        title={contact.intro.title}
        lead={contact.intro.lead}
      />

      {/* ---- Channels ---- */}
      <section className="section-tight">
        <div className="container-x">
          <Reveal>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {CHANNELS.map((c) => (
                <li
                  key={c.label}
                  className={`card border-t-[3px] ${
                    c.accent ? "border-t-cyan-400" : "border-t-brand-500"
                  }`}
                >
                  <span
                    className={`card-icon ${
                      c.accent ? "card-icon-cyan" : "card-icon-blue"
                    }`}
                  >
                    <Icon name={c.icon} className="h-[1.45rem] w-[1.45rem]" />
                  </span>
                  <h2 className="card-title">{c.label}</h2>
                  {c.href ? (
                    <a
                      href={c.href}
                      className="break-words text-meta font-medium text-brand-600 hover:underline"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <p className="text-meta font-medium text-ink">{c.value}</p>
                  )}
                  <p className="mt-1.5 text-caption text-ink-muted">{c.note}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---- Form + hours ---- */}
      <section className="section">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
            <Reveal>
              <div className="rounded-panel border border-line bg-white p-7 shadow-card md:p-10">
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
