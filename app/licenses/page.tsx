import type { Metadata } from "next";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import {
  Callout,
  CheckList,
  ClosingCta,
  NavyPanel,
  PageHero,
  SectionHead,
  TwoCol,
} from "@/components/blocks";
import { Icon } from "@/components/icons/set";
import { CoverageMap } from "@/components/sections/CoverageMap";
import { Reveal } from "@/components/ui/Reveal";
import { closingCta, coverage } from "@/lib/content";
import { GradientPlate } from "@/components/media/GradientPlate";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "State Coverage",
  description:
    "MediCraft Pharmacy is currently licensed to serve patients and providers in Florida, and is pursuing licensure across all 49 eligible states.",
  path: "/licenses",
});

export default function CoveragePage() {
  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "State Coverage", path: "/licenses" }]))} />
      <PageHero
        eyebrow={coverage.intro.eyebrow}
        title={coverage.intro.title}
        lead={coverage.intro.body}
      >
        {/* The same specification plate as the home hero, so coverage reads as
            a stated fact rather than a marketing figure. The first value is a
            two-letter state code, which is the whole point: coverage is Florida
            today, and overstating it on a pharmacy site is a licensing problem
            rather than a marketing one. */}
        <div className="spec-plate mt-12">
          <div className="spec-plate-head">
            <span className="spec-plate-head-label">Licensure status</span>
            <span className="spec-plate-head-meta">Current · {site.established}</span>
          </div>
          <dl className="spec-plate-grid-3">
            {coverage.features.map((f) => (
              <div key={f.label} className="spec-cell">
                <dt className="spec-cell-label">{f.label}</dt>
                <dd>
                  <span className="spec-cell-value">{f.value}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </PageHero>

      {/* ---- Licensed today ---- */}
      <section className="section">
        <div className="container-x">
          <Reveal>
            <SectionHead
              eyebrow={coverage.licensed.eyebrow}
              title={coverage.licensed.title}
              size="sm"
            />
          </Reveal>

          {/*
           * Brief §4.14 bans the stock US map outright and requires a
           * data-driven vector component the team can update without a
           * designer. This renders from lib/coverage.ts — flipping one status
           * there updates the map, the legend and the counts together.
           */}
          <Reveal delay={0.05} className="mt-10">
            <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
              <CoverageMap />

              <div>
                <ul className="flex flex-wrap gap-3">
                  {coverage.licensed.states.map((state) => (
                    <li
                      key={state}
                      className="inline-flex items-center gap-2.5 rounded-lg border-[1.5px] border-brand-500 bg-brand-50 px-5 py-3 text-body font-bold text-brand-700"
                    >
                      <Icon name="pin" className="h-[1.1rem] w-[1.1rem]" />
                      {state}
                    </li>
                  ))}
                </ul>

                <Callout label={coverage.licensed.noteLabel} className="mt-6">
                  {coverage.licensed.note}
                </Callout>
              </div>
            </div>
          </Reveal>

        </div>
      </section>

      {/* ---- Shipping ---- */}
      <section id="shipping" className="band section scroll-mt-32">
        <div className="container-x">
          <TwoCol>
            <Reveal>
              <SectionHead
                eyebrow={coverage.shipping.eyebrow}
                title={coverage.shipping.title}
                size="sm"
              />
              <p className="mt-6 text-body text-ink-soft text-pretty">
                {coverage.shipping.body}
              </p>
              <CheckList items={coverage.shipping.checks} className="mt-8" />
            </Reveal>

            <Reveal delay={0.1} className="space-y-6">
              <GradientPlate
                ratio="3/2"
                icon="truck"
                label="Shipping — Phase 1"
                subject="Validated cold-chain shipper, open mid-pack: gel packs, insulated liner and a temperature indicator strip in frame, shot slightly overhead."
              />
              <NavyPanel
                badge={coverage.shipping.panel.badge}
                title={coverage.shipping.panel.title}
              >
                <p className="mt-4 text-meta text-white/70 text-pretty">
                  {coverage.shipping.panel.body}
                </p>
                <Link
                  href={coverage.shipping.panel.cta.href}
                  className="btn-accent mt-7 inline-flex"
                >
                  {coverage.shipping.panel.cta.label} <span aria-hidden>→</span>
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
