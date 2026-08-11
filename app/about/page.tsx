import type { Metadata } from "next";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import {
  CheckList,
  ClosingCta,
  IconCard,
  NavyPanel,
  PageHero,
  PanelMetrics,
  SectionHead,
  SpecRail,
  Timeline,
  TwoCol,
} from "@/components/blocks";
import { Reveal } from "@/components/ui/Reveal";
import { about, closingCta } from "@/lib/content";
import { media } from "@/lib/media";

export const metadata: Metadata = pageMetadata({
  title: "About MediCraft",
  description:
    "MediCraft Pharmacy is a 503A compounding pharmacy in Palm Harbor, Florida — established 2025, opened 2026, built on a decade of quality engineering across 503A, 503B and cGMP environments.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "About MediCraft", path: "/about" }]))} />
      <PageHero
        media={media.glassware}
        eyebrow={about.intro.eyebrow}
        title={about.intro.title}
        lead={about.intro.body[0]}
      />

      {/* ---- Who we are ---- */}
      <section className="section">
        <div className="container-x">
          <TwoCol>
            <Reveal>
              <p className="text-body text-ink-soft text-pretty">
                {about.intro.body[1]}
              </p>
              <CheckList items={about.intro.checks} className="mt-8" />
            </Reveal>

            <Reveal delay={0.1}>
              <NavyPanel badge={about.panel.badge} title={about.panel.title}>
                <p className="mt-4 text-meta text-white/70 text-pretty">
                  {about.panel.body}
                </p>
                <PanelMetrics items={about.panel.metrics} />
              </NavyPanel>
            </Reveal>
          </TwoCol>
        </div>
      </section>

      {/* ---- Journey ----
          A real chronology, so it is set as a dated timeline: the order is the
          information. Note two entries share 2026 — that is the owner's own
          sequence (the pharmacy opened and the accreditation process began in
          the same year), not a duplication. */}
      <section className="band section">
        <div className="container-x">
          <Reveal>
            <SectionHead
              eyebrow={about.journey.eyebrow}
              title={about.journey.title}
            />
          </Reveal>

          <div className="mt-12 grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
            <Reveal>
              <Timeline items={about.journey.timeline} />
            </Reveal>

            <Reveal delay={0.1}>
              <div className="grid gap-5">
                {about.principles.map((p) => (
                  <IconCard key={p.title} {...p} />
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- Quality foundation ---- */}
      <section className="section">
        <div className="container-x">
          <Reveal>
            <NavyPanel
              badge={about.foundation.eyebrow}
              title={about.foundation.title}
            >
              <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-12">
                <div className="space-y-4">
                  {about.foundation.body.map((p) => (
                    <p key={p.slice(0, 32)} className="text-meta text-white/70 text-pretty">
                      {p}
                    </p>
                  ))}
                </div>
                <SpecRail items={about.foundation.specs} invert />
              </div>
            </NavyPanel>
          </Reveal>
        </div>
      </section>

      {/* ---- Facility heritage ---- */}
      <section className="band section">
        <div className="container-x">
          <TwoCol>
            <Reveal>
              <SectionHead
                eyebrow={about.facility.eyebrow}
                title={about.facility.title}
                size="sm"
              />
              <div className="prose-body mt-6">
                {about.facility.body.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </div>
              <CheckList items={about.facility.checks} className="mt-8" />
            </Reveal>

            <Reveal delay={0.1}>
              <NavyPanel
                badge={about.facility.panel.badge}
                title={about.facility.panel.title}
              >
                <p className="mt-4 text-meta text-white/70 text-pretty">
                  {about.facility.panel.body}
                </p>
                <p className="mt-4 text-caption leading-relaxed text-white/50 text-pretty">
                  {about.facility.panel.note}
                </p>
                <PanelMetrics items={about.facility.panel.metrics} />
              </NavyPanel>
            </Reveal>
          </TwoCol>
        </div>
      </section>

      <ClosingCta {...closingCta} />
    </>
  );
}
