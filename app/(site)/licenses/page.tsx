import type { Metadata } from "next";
import { media } from "@/lib/media";
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
import { BrandFigure } from "@/components/sections/BrandFigure";

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
        media={media.licensesCover}
      >
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
          {/* The map takes the full column width.
              It used to sit in a 1.35fr track beside the state list, which
              left it about 55% of the page — small enough that the two-letter
              codes on the north-eastern states were the first thing to become
              unreadable, on exactly the states a reader is most likely to be
              hunting for. The list and the note read perfectly well underneath
              it, so the width goes to the thing that needs it. */}
          <Reveal delay={0.05} className="mt-10">
            <CoverageMap />
          </Reveal>

          <Reveal delay={0.1} className="mt-12">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
              <ul className="flex flex-wrap content-start gap-3">
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

              <Callout label={coverage.licensed.noteLabel}>
                {coverage.licensed.note}
              </Callout>
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
              {/* The real packaging, not a placeholder describing a shot
                  nobody has taken. */}
              <BrandFigure
                variant="framed"
                src="/images/brand/stationery-box.webp"
                alt="MediCraft Pharmacy packaging"
                width={1600}
                height={900}
                sizes="(min-width: 1024px) 32rem, 92vw"
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
