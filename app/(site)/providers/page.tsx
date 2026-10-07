import type { Metadata } from "next";
import { media } from "@/lib/media";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  CheckList,
  IconCard,
  PageHero,
  SectionHead,
  TwoCol,
} from "@/components/blocks";
import { Stagger, StaggerItem } from "@/components/motion/Motion";
import { CardsBesideFigure } from "@/components/sections/CardsBesideFigure";
import { areaMedia } from "@/lib/media";
import { Reveal } from "@/components/ui/Reveal";
import { providers } from "@/lib/content";
import { getCategoryMetaLabel } from "@/lib/catalogue";

export const metadata: Metadata = pageMetadata({
  title: "For Providers",
  description:
    "Open a MediCraft provider account: a dedicated account representative, clinical consultation, e-prescribing with real-time tracking, and EMR/EHR integration.",
  path: "/providers",
});

export default async function ProvidersPage() {
  /* One label per therapeutic area, resolved before the render.
     `getCategoryMetaLabel` reads the database now, and JSX cannot await — so
     the counts are looked up once here rather than pretending to be sync. */
  const areaMeta = Object.fromEntries(
    await Promise.all(
      providers.therapeuticAreas.items.map(
        async (area) => [area.href, await getCategoryMetaLabel(area.href)] as const
      )
    )
  );

  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "For Providers", path: "/providers" }]))} />
      {/* Reception, rendered — the reception slot in lib/media.ts. */}
      <PageHero
        eyebrow={providers.intro.eyebrow}
        title={providers.intro.title}
        lead={providers.intro.body[0]}
        media={media.reception}
      />

      {/* ---- Partnership ---- */}
      <section className="section">
        <div className="container-x">
          <TwoCol>
            <Reveal>
              <p className="text-body text-ink-soft text-pretty">
                {providers.intro.body[1]}
              </p>
              <CheckList items={providers.intro.checks} className="mt-8" />
            </Reveal>

            <Stagger className="grid gap-5">
              {providers.benefits.map((benefit) => (
                <StaggerItem key={benefit.title}>
                  {/* `headingLevel={2}`: these are the first content under
                      the page's h1, with no section heading above them. */}
                  <IconCard {...benefit} headingLevel={2} />
                </StaggerItem>
              ))}
            </Stagger>
          </TwoCol>
        </div>
      </section>

      {/* ---- Onboarding ----
          The same shape as the Partnership section above: a still on one
          side, a column of cards on the other, built from the same `IconCard`
          so the two sections are one layout used twice rather than two that
          happen to look alike. No pinning and no numerals — the order is in
          the markup, which is where it belongs. */}
      <section className="band section">
        <div className="container-x">
          <Reveal>
            <SectionHead
              align="center"
              eyebrow={providers.onboarding.eyebrow}
              title={providers.onboarding.title}
              lead={providers.onboarding.lead}
              className="mx-auto max-w-2xl"
            />
          </Reveal>

          <CardsBesideFigure
            className="mt-16"
            items={providers.onboarding.steps}
            image={{
              src: "/images/brand/vial-clear-glass-shelf.webp",
              alt: "A MediCraft semaglutide vial on a glass shelf",
              width: 1086,
              height: 1448,
            }}
          />

          <div className="mt-16 flex justify-center">
            <Link href="#apply" className="btn-primary btn-lg">
              {providers.onboarding.panel.cta.label}
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Therapeutic areas ---- */}
      <section className="section">
        <div className="container-x">
          <Reveal>
            <SectionHead
              eyebrow={providers.therapeuticAreas.eyebrow}
              title={providers.therapeuticAreas.title}
            />
          </Reveal>
          <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {providers.therapeuticAreas.items.map((area) => (
              <StaggerItem key={area.title} className="h-full">
                {/* `areaMedia` has artwork for six of the eleven areas,
                    keyed by the same href the card links to. Passing
                    `undefined` for the rest is the correct outcome: InfoCard
                    simply renders without a picture rather than reserving an
                    empty well. */}
                <IconCard
                  {...area}
                  media={areaMedia[area.href]}
                  meta={areaMeta[area.href]}
                  className="h-full"
                />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---- Application ---- */}
      <section id="apply" className="band section scroll-mt-32">
        <div className="container-narrow">
          <Reveal>
            <SectionHead
              eyebrow="Provider Application"
              title="Open Your Provider Account"
              lead="Tell us about your practice and we will send your formulary and pricing. A pharmacy liaison responds within one business day."
              align="center"
            />
          </Reveal>
          {/* A link, not a second copy of the form.
              The same fourteen fields lived here and on /work-with-us, which
              meant two URLs competing to be the one a prescriber bookmarks and
              two places to keep in step. The page that is about applying owns
              the form; this page points at it. */}
          <Reveal delay={0.1} className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/work-with-us" className="btn-primary btn-lg">
              Open an Account
            </Link>
            <Link href="/contact" className="btn-outline btn-lg">
              Talk to a pharmacist first
            </Link>
          </Reveal>

          <p className="mt-6 text-center text-caption text-ink-muted">
            Takes about two minutes. No card details, and nothing is shared until you have seen
            our pricing.
          </p>
        </div>
      </section>
    </>
  );
}
