import type { Metadata } from "next";
import Image from "next/image";
import { MapPin, Clock, Building2, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PartnershipCTA } from "@/components/sections/PartnershipCTA";
import { Reveal } from "@/components/ui/Reveal";
import { CareerForm } from "@/components/forms/CareerForm";
import { careers, careerBenefits } from "@/lib/data";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Careers",
  description: `Join the ${site.name} family — open roles in compounding, fulfillment, lab, and support. Help others feel their best.`,
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
  return (
    <>
      <PageHeader
        cover="/images/site/cover-careers.jpg"
        eyebrow="Careers"
        title={`Join the ${site.shortName} family`}
        subtitle="Help others feel their best."
      />

      {/* Culture */}
      <section className="bg-white py-16 md:py-24">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Reveal>
              <span className="eyebrow">Culture</span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="section-title mt-5">Great talent, one shared standard.</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 text-lg text-ink-soft">
                Our team comes from every corner of healthcare and beyond, united
                by a single commitment: doing right by the patients who depend on
                us. We hire for precision, curiosity, and care — then give people
                the tools and trust to do their best work.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-xl shadow-brand-900/10">
              <Image
                src="/images/site/careers-team.jpg"
                alt="Medicraft pharmacy team at work"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24">
        <div className="container-x">
          <Reveal>
            <span className="eyebrow">Benefits</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="section-title mt-5 max-w-2xl">
              We take care of our people.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {careerBenefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-brand-100 bg-white p-6">
                  <span className="font-display text-sm font-semibold text-brand-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-ink">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-soft">{b.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="bg-white py-16 md:py-24">
        <div className="container-x">
          <Reveal>
            <span className="eyebrow">Open Positions</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="section-title mt-5">Find your role</h2>
          </Reveal>

          <div className="mt-10 border-t border-brand-100">
            {careers.map((job) => (
              <div
                key={job.title}
                className="flex flex-col gap-4 border-b border-brand-100 py-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {job.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">{job.blurb}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      {job.dept}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {job.shift}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </span>
                  </div>
                </div>
                <a href="#apply" className="btn-primary shrink-0">
                  Apply Now
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply now */}
      <section id="apply" className="scroll-mt-24 py-16 md:py-24">
        <div className="container-x max-w-2xl">
          <Reveal>
            <span className="eyebrow">Apply now</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="section-title mt-5">Tell us about you</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 text-ink-soft">
              Send us your details and résumé — we review every application.
            </p>
          </Reveal>
          <div className="mt-8 rounded-2xl border border-brand-100 bg-white p-6 sm:p-8">
            <CareerForm />
          </div>
        </div>
      </section>

      <PartnershipCTA />
    </>
  );
}
