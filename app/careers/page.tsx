import type { Metadata } from "next";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import { Building2, Clock, MapPin } from "lucide-react";
import { Figure, PageHero, SectionHead } from "@/components/blocks";
import { Stagger, StaggerItem } from "@/components/motion/Motion";
import { CareerForm } from "@/components/forms/CareerForm";
import { Reveal } from "@/components/ui/Reveal";
import { careerBenefits, careers } from "@/lib/data";
import { media } from "@/lib/media";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Careers",
  description: `Join the ${site.name} team in Palm Harbor, Florida — open roles in compounding, fulfillment, lab and support.`,
  path: "/careers",
});

export default function CareersPage() {
  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "Careers", path: "/careers" }]))} />
      <PageHero
        media={media.team}
        eyebrow="Careers"
        title={`Join the ${site.shortName} Team`}
        lead="Help others feel their best. Every role here sits inside a quality system built by people who have spent careers setting the standards others follow."
      />

      {/* ---- Culture ---- */}
      <section className="section">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
          <Reveal>
            <SectionHead
              eyebrow="Culture"
              title="Great talent, one shared standard."
              size="sm"
            />
            <p className="mt-6 text-body text-ink-soft text-pretty">
              Our team comes from every corner of healthcare and beyond, united by a
              single commitment: doing right by the patients who depend on us. We
              hire for precision, curiosity, and care — then give people the tools
              and trust to do their best work.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <Figure media={media.careersTeam} ratio="4/3" caption="Palm Harbor facility" />
          </Reveal>
        </div>
      </section>

      {/* ---- Benefits ----
          A plain list of what the job includes, so it is not numbered: the
          order carries no meaning and 01/02/03 markers here would be
          decoration pretending to be structure. */}
      <section className="band section">
        <div className="container-x">
          <Reveal>
            <SectionHead
              eyebrow="Benefits"
              title="We take care of our people."
            />
          </Reveal>
          <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {careerBenefits.map((b) => (
              <StaggerItem key={b.title} className="h-full">
                <div className="card card-hover h-full">
                  <h3 className="card-title">{b.title}</h3>
                  <p className="card-body">{b.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---- Open positions ---- */}
      <section className="section">
        <div className="container-x">
          <Reveal>
            <SectionHead
              eyebrow="Open Positions"
              title="Find your role"
              lead={`${careers.length} roles open at our Palm Harbor facility.`}
            />
          </Reveal>

          <ul className="mt-10 border-t border-line">
            {careers.map((job) => (
              <li
                key={job.title}
                className="flex flex-col gap-4 border-b border-line py-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="text-[1.125rem] font-bold text-brand-600">{job.title}</h3>
                  <p className="mt-1 text-meta text-ink-soft text-pretty">{job.blurb}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-caption text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {job.dept}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {job.shift}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </span>
                  </div>
                </div>
                <a href="#apply" className="btn-primary shrink-0">
                  Apply now <span aria-hidden>→</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Application ---- */}
      <section id="apply" className="band section scroll-mt-32">
        <div className="container-narrow">
          <Reveal>
            <SectionHead
              eyebrow="Apply now"
              title="Tell us about you"
              lead="Send us your details and résumé — we review every application."
              align="center"
            />
          </Reveal>
          <Reveal delay={0.1} className="mt-12">
            <div className="rounded-panel border border-line bg-white p-7 shadow-card md:p-10">
              <CareerForm />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
