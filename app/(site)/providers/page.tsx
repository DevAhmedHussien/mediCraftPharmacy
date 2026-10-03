import type { Metadata } from "next";
import { media } from "@/lib/media";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import {
  CheckList,
  IconCard,
  NavyPanel,
  PageHero,
  SectionHead,
  TwoCol,
} from "@/components/blocks";
import { Stagger, StaggerItem } from "@/components/motion/Motion";
import { StickyStack } from "@/components/motion/StickyStack";
import { GradientPlate } from "@/components/media/GradientPlate";
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
                  <IconCard {...benefit} />
                </StaggerItem>
              ))}
            </Stagger>
          </TwoCol>
        </div>
      </section>

      {/* ---- Onboarding ----
          Four steps in a fixed order, so they are numbered. */}
      <section className="band section">
        <div className="container-x">
          <Reveal>
            <SectionHead
              eyebrow={providers.onboarding.eyebrow}
              title={providers.onboarding.title}
              lead={providers.onboarding.lead}
            />
          </Reveal>

          {/* Onboarding is a fixed order — application, then liaison, then
              portal, then first prescription — so the cards pin and stack in
              that order rather than sitting in a grid a reader can skim out of
              sequence. */}
          <div className="mt-12">
            <StickyStack
              steps={providers.onboarding.steps}
              eyebrow="Under ten minutes"
            />
          </div>

          <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-14">
            <Reveal>
              <NavyPanel
                badge={providers.onboarding.panel.badge}
                title={providers.onboarding.panel.title}
              >
                {/* A real quotation, so it is marked up as one. The source is
                    anonymised in the owner's document, so no name is invented
                    here — the attribution says exactly what he says. */}
                <blockquote className="mt-5">
                  <p className="text-body text-white/85 text-pretty">
                    “{providers.onboarding.panel.quote}”
                  </p>
                  <footer className="mt-4 text-caption text-white/50">
                    — {providers.onboarding.panel.attribution}
                  </footer>
                </blockquote>
                <Link href="#apply" className="btn-accent mt-7 inline-flex">
                  {providers.onboarding.panel.cta.label} <span aria-hidden>→</span>
                </Link>
              </NavyPanel>

            </Reveal>

            <Reveal delay={0.1}>
              <GradientPlate
                ratio="4/3"
                icon="graduation"
                label="Providers — Phase 1 · P1"
                subject="A pharmacist and a clinician in conversation over a formulation document — a working discussion, neither looking at camera. Not a handshake."
              />
            </Reveal>
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
                <IconCard
                  {...area}
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
