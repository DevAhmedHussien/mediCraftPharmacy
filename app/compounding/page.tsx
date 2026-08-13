import type { Metadata } from "next";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import {
  CheckList,
  ClosingCta,
  IconCard,
  NavyPanel,
  PageHero,
  SectionHead,
  TwoCol,
} from "@/components/blocks";
import { Stagger, StaggerItem } from "@/components/motion/Motion";
import { GradientPlate } from "@/components/media/GradientPlate";
import { Reveal } from "@/components/ui/Reveal";
import { closingCta, compounding } from "@/lib/content";

export const metadata: Metadata = pageMetadata({
  title: "Our Compounding",
  description:
    "What makes compounded medications different: custom strengths, allergen-free formulations, and six delivery forms — injectables, topicals, capsules, nasal sprays, troches and IV solutions.",
  path: "/compounding",
});

export default function CompoundingPage() {
  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "Our Compounding", path: "/compounding" }]))} />
      <PageHero
        eyebrow={compounding.intro.eyebrow}
        title={compounding.intro.title}
        lead={compounding.intro.lead}
      />

      {/* ---- Customised for outcomes ---- */}
      <section className="section">
        <div className="container-x">
          <TwoCol>
            <Reveal>
              <SectionHead title={compounding.customized.title} size="sm" />
              <div className="prose-body mt-6">
                {compounding.customized.body.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </div>
              <CheckList items={compounding.customized.checks} className="mt-8" />
            </Reveal>

            <Reveal delay={0.1} className="space-y-6">
              <GradientPlate
                ratio="3/2"
                icon="scale"
                label="Compounding — Phase 1"
                subject="A pharmacist calculating a dose by hand: pen, worksheet, calculator and a precision balance in frame."
              />
              <NavyPanel
                badge={compounding.customized.panel.badge}
                title={compounding.customized.panel.title}
              >
                {/* 503A is the pharmacy's regulatory category, so the label is
                    set in the mono reserved for regulatory data. */}
                <p className="mt-6 font-mono text-caption font-semibold uppercase tracking-wider text-cyan-300">
                  {compounding.customized.panel.label}
                </p>
                <p className="mt-2 text-meta text-white/70 text-pretty">
                  {compounding.customized.panel.body}
                </p>
              </NavyPanel>
            </Reveal>
          </TwoCol>
        </div>
      </section>

      {/* ---- Delivery methods ---- */}
      <section className="band section">
        <div className="container-x">
          <Reveal>
            <SectionHead
              eyebrow={compounding.delivery.eyebrow}
              title={compounding.delivery.title}
              lead="Six dosage forms, each chosen for how a given compound is best absorbed and how a given patient will actually take it."
            />
          </Reveal>
          <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {compounding.delivery.items.map((item) => (
              <StaggerItem key={item.title} className="h-full">
                <IconCard {...item} className="h-full" />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <ClosingCta {...closingCta} />
    </>
  );
}
