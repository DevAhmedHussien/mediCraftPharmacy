"use client";

import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { SendIcon } from "@/components/icons";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/site";

export function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <section id="contact" className="bg-white py-20 md:py-28">
      <div className="container-x grid gap-12 lg:grid-cols-2">
        <div>
          <Reveal>
            <span className="eyebrow">Get in touch</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="section-title mt-5">Let&apos;s talk about your patients</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 text-lg text-ink-soft">
              Questions about a formulation, pricing, or getting set up as a
              provider? Our team responds within one business day.
            </p>
          </Reveal>

          <div className="mt-10 space-y-4">
            {[
              { icon: Phone, label: `${site.phone} · Toll-free ${site.tollFree}`, href: `tel:${site.phone}` },
              { icon: Mail, label: site.email, href: `mailto:${site.email}` },
              { icon: MapPin, label: site.address, href: `https://maps.google.com/?q=${encodeURIComponent(site.address)}` },
            ].map((c) => (
              <Reveal key={c.label}>
                <a
                  href={c.href}
                  className="flex items-center gap-4 rounded-xl border border-brand-100 bg-sand p-4 transition-colors hover:border-brand-300"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <span className="text-ink-soft">{c.label}</span>
                </a>
              </Reveal>
            ))}
          </div>

          {/* Florida locations — NAP data for local SEO */}
          <Reveal delay={0.1}>
            <div className="mt-10">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Our Florida locations
              </h3>
              <address className="mt-4 grid gap-4 not-italic sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {site.locations.map((loc) => (
                  <div
                    key={loc.name}
                    className="rounded-xl border border-brand-100 bg-white p-4"
                  >
                    <p className="text-sm font-semibold text-ink">{loc.name}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {loc.street}
                      <br />
                      {loc.city}, {loc.state} {loc.zip}
                    </p>
                    <a
                      href={`tel:${loc.phone}`}
                      className="mt-2 inline-block text-sm font-medium text-brand-700 hover:text-brand-800"
                    >
                      {loc.phone}
                    </a>
                  </div>
                ))}
              </address>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="rounded-2xl border border-brand-100 bg-sand p-8"
          >
            <div className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First name" name="firstName" />
                <Field label="Last name" name="lastName" />
              </div>
              <Field label="Email" name="email" type="email" />
              <Field label="Practice / Clinic" name="practice" />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-soft">
                  How can we help?
                </label>
                <textarea
                  name="message"
                  rows={4}
                  required
                  className="w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                {sent ? "Thank you — we’ll be in touch" : "Send message"}
                {!sent && <SendIcon className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <input
        type={type}
        name={name}
        required
        className="w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}
