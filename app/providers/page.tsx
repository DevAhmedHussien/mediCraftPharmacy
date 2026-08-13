import type { Metadata } from "next";
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
import { ProviderForm } from "@/components/forms/ProviderForm";
import { GradientPlate } from "@/components/media/GradientPlate";
import { Reveal } from "@/components/ui/Reveal";
import { providers } from "@/lib/content";
import { categoryMetaLabel } from "@/lib/data";

export const metadata: Metadata = pageMetadata({
  title: "For Providers",
  description:
    "Open a MediCraft provider account: a dedicated account representative, clinical consultation, e-prescribing with real-time tracking, and EMR/EHR integration.",
  path: "/providers",
});

export default function ProvidersPage() {
  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "For Providers", path: "/providers" }]))} />
      <PageHero
        eyebrow={providers.intro.eyebrow}
        title={providers.intro.title}
        lead={providers.intro.body[0]}
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
                  meta={categoryMetaLabel(area.href)}
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
              lead="Your DEA number, NPI and practice details are all we need to verify your credentials. A pharmacy liaison responds within one business day."
              align="center"
            />
          </Reveal>
          <Reveal delay={0.1} className="mt-12">
            <div className="rounded-panel border border-line bg-white p-7 shadow-card md:p-10">
              <ProviderForm />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
