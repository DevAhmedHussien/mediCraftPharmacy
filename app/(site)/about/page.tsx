import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
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
    "A 503A compounding pharmacy in Tampa, Florida — established 2025, built on a decade of quality engineering across 503A, 503B and cGMP environments.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "About MediCraft", path: "/about" }]))} />
      <PageHero
        eyebrow={about.intro.eyebrow}
        title={about.intro.title}
        lead={about.intro.body[0]}
        media={media.aboutCover}
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
              <NavyPanel title={about.panel.title}>
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

      {/* ---- Our facility, beside what we test ----
          The right-hand panel used to be "Facility Heritage", about the
          building's past as an oncology infusion pharmacy. It is Quality
          Assurance now: what MediCraft does to a batch before it ships. The
          left column still tells the building's story, so the pair reads as
          the premises and the practice rather than two claims about the
          premises. */}
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
                {/* An image, because the brief asks the panel to carry one and
                    because a list of five assurances is a wall of text
                    otherwise. The quality hero is the right frame: sealed
                    vials on a bench beside batch data on a monitor, which is
                    what the five lines below describe. */}
                <div className="relative mt-5 aspect-[16/9] overflow-hidden rounded-2xl">
                  <Image
                    src={media.lab.src}
                    alt={media.lab.alt}
                    fill
                    sizes="(min-width: 1024px) 34rem, 92vw"
                    className="object-cover"
                  />
                </div>

                <p className="mt-5 text-meta text-white/70 text-pretty">
                  {about.facility.panel.body}
                </p>

                <ul className="mt-5 space-y-2.5">
                  {about.facility.panel.checks.map((check) => (
                    <li key={check} className="flex gap-2.5 text-caption text-white/70">
                      {/* The tick is decoration beside its own text, so it is
                          hidden rather than announced — a screen reader
                          already has the list semantics. */}
                      <Check
                        className="mt-0.5 size-3.5 shrink-0 text-cyan-400"
                        strokeWidth={2.6}
                        aria-hidden
                      />
                      <span className="text-pretty">{check}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-5 text-caption leading-relaxed text-white/50 text-pretty">
                  {about.facility.panel.note}
                </p>

                <Link
                  href={about.facility.panel.cta.href}
                  className="btn-primary mt-6 inline-flex"
                >
                  {about.facility.panel.cta.label}{" "}
                  <span aria-hidden>→</span>
                </Link>
              </NavyPanel>
            </Reveal>
          </TwoCol>
        </div>
      </section>

      <ClosingCta {...closingCta} />
    </>
  );
}
