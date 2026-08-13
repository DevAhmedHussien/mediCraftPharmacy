import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CustodyBand } from "@/components/sections/CustodyBand";
import { Hero } from "@/components/sections/Hero";
import { TrustMarquee } from "@/components/sections/TrustMarquee";
import {
  CheckList,
  ClosingCta,
  IconCard,
  NavyPanel,
  PanelMetrics,
  SectionHead,
  SpecRail,
  TwoCol,
} from "@/components/blocks";
import { GradientPlate } from "@/components/media/GradientPlate";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/Motion";
import { about, closingCta, providers, quality } from "@/lib/content";
import { categoryMetaLabel } from "@/lib/data";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

/**
 * The home page inherits the root layout's title (name + tagline) and its
 * Pharmacy JSON-LD, so it only needs to assert its own canonical — without one,
 * "/" and any query-stringed variant compete with each other in the index.
 */
export const metadata: Metadata = pageMetadata({
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  path: "/",
});

/**
 * Home page.
 *
 * Sequenced as an argument rather than a feature tour: the thesis (hero), the
 * credentials that back it (trust bar), who is making the claim (who we are),
 * the proof on film (custody band), why the systems can be believed (quality),
 * what they make (therapeutic areas), and how to start (CTA).
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustMarquee />

      {/* ---- Who we are ---- */}
      <section className="section">
        <div className="container-x">
          <TwoCol>
            <FadeIn>
              <SectionHead
                eyebrow={about.intro.eyebrow}
                title={about.intro.title}
              />
              <div className="prose-body mt-6">
                {about.intro.body.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </div>
              <CheckList items={about.intro.checks} className="mt-8" />
              <Link href="/about" className="link-arrow mt-8 inline-flex">
                More about MediCraft
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </FadeIn>

            <FadeIn delay={0.1} className="space-y-6">
              <GradientPlate
                ratio="3/2"
                icon="microscope"
                label="Facility — Phase 2"
                subject="Cleanroom environmental wide: the anteroom doorway looking through into the classified space, one gowned figure small in frame, architecture dominant."
              />
              <NavyPanel badge={about.panel.badge} title={about.panel.title}>
                <p className="mt-4 text-meta text-white/70 text-pretty">
                  {about.panel.body}
                </p>
                <PanelMetrics items={about.panel.metrics} />
              </NavyPanel>
            </FadeIn>
          </TwoCol>
        </div>
      </section>

      {/* ---- Mission / vision / values ---- */}
      <section className="band section">
        <div className="container-x">
          <FadeIn>
            <SectionHead
              eyebrow="What Drives Us"
              title="Precision Over Convenience"
              lead="Three commitments that decide how every compound we produce gets made."
              align="center"
            />
          </FadeIn>
          <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {about.principles.map((p) => (
              <StaggerItem key={p.title} className="h-full">
                <IconCard {...p} className="h-full" />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---- Proof, on film ----
          Video, because the claim is that everything is filmed. */}
      <CustodyBand />

      {/* ---- Quality systems ----
          The spec rail is the site's signature treatment, and this is the
          section it exists for: four regulatory facts, each with its mark, its
          claim, and — critically — the honest status of that claim. */}
      <section className="section">
        <div className="container-x">
          <TwoCol reverse>
            <FadeIn>
              <NavyPanel
                badge={quality.banner.eyebrow}
                title={quality.banner.title}
              >
                <p className="mt-4 text-meta text-white/70 text-pretty">
                  {quality.banner.body}
                </p>
                <SpecRail
                  items={quality.banner.specs}
                  invert
                  className="mt-8 border-t border-white/10 pt-2"
                />
              </NavyPanel>
            </FadeIn>

            <FadeIn delay={0.1}>
              <SectionHead
                eyebrow={quality.sops.eyebrow}
                title={quality.sops.title}
              />
              <div className="prose-body mt-6">
                {quality.sops.body.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </div>
              <CheckList items={quality.sops.checks} className="mt-8" />
              <Link href="/quality" className="link-arrow mt-8 inline-flex">
                See how we prove it
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </FadeIn>
          </TwoCol>
        </div>
      </section>

      {/* ---- Therapeutic areas ---- */}
      <section className="band section">
        <div className="container-x">
          <FadeIn>
            <SectionHead
              eyebrow={providers.therapeuticAreas.eyebrow}
              title={providers.therapeuticAreas.title}
              lead="Compounded to each patient's dose, tolerances and delivery form — across every specialty we serve."
            />
          </FadeIn>
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
          <FadeIn delay={0.1}>
            <Link href="/products" className="link-arrow mt-10 inline-flex">
              Browse the full formulary
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </FadeIn>
        </div>
      </section>

      <ClosingCta {...closingCta} />
    </>
  );
}
