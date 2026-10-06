import type { Metadata } from "next";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import {
  Callout,
  CheckList,
  ClosingCta,
  Figure,
  IconCard,
  NavyPanel,
  PageHero,
  PanelMetrics,
  SectionHead,
  SpecRail,
  TwoCol,
} from "@/components/blocks";
import { Stagger, StaggerItem } from "@/components/motion/Motion";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { CardsBesideFigure } from "@/components/sections/CardsBesideFigure";
import { ProcessSequence } from "@/components/media/ProcessSequence";
import { Reveal } from "@/components/ui/Reveal";
import { closingCta, quality } from "@/lib/content";
import { automationMedia, media } from "@/lib/media";

export const metadata: Metadata = pageMetadata({
  title: "Quality Standards",
  description:
    "PCAB accreditation in progress, USP 795/797/800 compliance, ISO-class cleanrooms, third-party testing on every batch, and video-verified fulfillment.",
  path: "/quality",
});

export default function QualityPage() {
  return (
    <>
      <ScrollProgress />
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "Quality Standards", path: "/quality" }]))} />
      <PageHero
        eyebrow={quality.banner.eyebrow}
        title={quality.banner.title}
        lead={quality.banner.body}
        media={media.lab}
      />

      {/* ---- Accreditation status ----
          Put first and stated plainly. PCAB and LegitScript are both still in
          progress; the spec rail's job here is to make each claim's status
          unmissable rather than letting four logos imply four awards. */}
      <section className="section">
        <div className="container-x">
          <TwoCol>
            <Reveal>
              <SectionHead
                eyebrow="Where We Stand"
                title="Accreditation, Stated Plainly"
                size="sm"
                lead="Four standards, and exactly where MediCraft sits against each one today."
              />
              <SpecRail items={quality.banner.specs} className="mt-8" />
            </Reveal>

            <Reveal delay={0.1}>
              <NavyPanel
                badge={quality.sops.panel.badge}
                title={quality.sops.panel.title}
              >
                <p className="mt-4 text-meta text-white/70 text-pretty">
                  {quality.sops.panel.body}
                </p>
                <p className="mt-4 text-caption leading-relaxed text-white/50 text-pretty">
                  {quality.sops.panel.note}
                </p>
                <Link
                  href={quality.sops.panel.cta.href}
                  className="btn-pill mt-7"
                >
                  {quality.sops.panel.cta.label} <span aria-hidden>→</span>
                </Link>
              </NavyPanel>
            </Reveal>
          </TwoCol>

        
        </div>
      </section>

      {/* ---- Leadership ---- */}
      <section id="leadership" className="band section scroll-mt-32">
        <div className="container-x">
          <Reveal>
            <SectionHead
              eyebrow={quality.leadership.eyebrow}
              title={quality.leadership.title}
              lead={quality.leadership.lead}
            />
          </Reveal>
          <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {quality.leadership.team.map((member) => (
              <StaggerItem key={member.title} className="h-full">
                <IconCard {...member} className="h-full" />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---- SOPs ---- */}
      <section className="section">
        <div className="container-x">
          <div className="container-narrow px-0">
            <Reveal>
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
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- Automation ---- */}
      <section className="band section">
        <div className="container-x">
          <Reveal>
            <SectionHead
              eyebrow={quality.automation.eyebrow}
              title={quality.automation.title}
              lead={quality.automation.lead}
            />
          </Reveal>
          {/* The suite itself, before the equipment inside it. The copy claims
              ISO-classified cleanrooms with environmental monitoring; this draws
              what that classification actually consists of — air changes,
              pressure cascade, and the fact that USP 800 containment runs the
              cascade negative where 797 runs it positive. */}

          <Stagger className="mt-14 grid gap-6 md:grid-cols-2">
            {quality.automation.items.map((item) => (
              <StaggerItem key={item.title} className="h-full">
                <IconCard {...item} media={automationMedia[item.title]} className="h-full" />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---- Chain of custody ---- */}
      <section className="section">
        <div className="container-x">
          <Reveal>
            <NavyPanel
              badge={quality.custody.panel.badge}
              title={quality.custody.panel.title}
            >
              <p className="mt-4 max-w-3xl text-meta text-white/70 text-pretty">
                {quality.custody.panel.body}
              </p>
              <PanelMetrics items={quality.custody.panel.metrics} cols={4} />
            </NavyPanel>
          </Reveal>

          {/*
           * The four checkpoints are pinned and stacked as you scroll. The
           * stack is the sequence: you cannot reach checkpoint three without
           * passing checkpoint two, which is exactly what the copy claims about
           * the process. Reduced motion renders it as a plain ordered list.
           */}
          <div className="mt-16">
            <Reveal>
              <h3 className="section-title-sm">{quality.custody.recorded.title}</h3>
              <p className="mt-3 max-w-2xl text-meta text-ink-soft text-pretty">
                {quality.custody.recorded.lead}
              </p>
            </Reveal>

            {/* The pack station with the overhead camera in frame. The whole
                claim of this section is "we filmed it", so the shot that shows
                the camera is the one that belongs beside it. */}
            <CardsBesideFigure
              className="mt-10"
              items={quality.custody.recorded.steps}
              image={media.custody}
              eyebrow="On every order"
            />
          </div>

          <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
            <Reveal>
              {/* A purpose-made specimen SOP, as the brief requires — never a
                  real batch record. */}
              <Figure media={media.sopPlate} ratio="4/3" />
            </Reveal>
            <Reveal delay={0.1}>
              <h3 className="section-title-sm">{quality.custody.why.title}</h3>
              <p className="mt-3 text-meta text-ink-soft text-pretty">
                {quality.custody.why.lead}
              </p>
              <CheckList items={quality.custody.why.checks} className="mt-6" />
              <Callout label={quality.custody.why.calloutLabel} className="mt-7">
                {quality.custody.why.callout}
              </Callout>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- Raw material vetting ---- */}
      <section className="band section">
        <div className="container-x">
          <Reveal>
            <SectionHead
              eyebrow={quality.sourcing.eyebrow}
              title={quality.sourcing.title}
              lead={quality.sourcing.lead}
            />
          </Reveal>

          {/* Four gates, each of which must pass before the next. The slide
              reader beside them: vetting an ingredient is testing it, not
              trusting the label on the drum it arrived in.

              The picture is on the right here and on the left in the section
              above, so two consecutive card-and-figure sections do not read as
              the same block repeated. */}
          <CardsBesideFigure
            className="mt-12"
            items={quality.sourcing.steps}
            image={media.microscope}
            eyebrow="Before it enters the cleanroom"
            imageSide="right"
          />

          <Reveal className="mt-16">
            <div className="rounded-panel border border-line bg-white p-7 md:p-10">
              <h3 className="section-title-sm">{quality.sourcing.aside.title}</h3>
              <div className="prose-body mt-4 max-w-3xl">
                {quality.sourcing.aside.body.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </div>
              <CheckList
                items={quality.sourcing.aside.checks}
                className="mt-6 sm:columns-2 sm:gap-8"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Finished product testing ---- */}
      <section className="section">
        <div className="container-x">
          <Reveal>
            <NavyPanel
              badge={quality.testing.banner.eyebrow}
              title={quality.testing.banner.title}
            >
              <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-12">
                <p className="text-meta text-white/70 text-pretty">
                  {quality.testing.banner.body}
                </p>
                <SpecRail items={quality.testing.banner.specs} invert />
              </div>
            </NavyPanel>
          </Reveal>

          <Stagger className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {quality.testing.cards.map((card) => (
              <StaggerItem key={card.title} className="h-full">
                <IconCard {...card} className="h-full" />
              </StaggerItem>
            ))}
          </Stagger>

          {/* The whole path in one view. The sections above argue inbound
              vetting and outbound testing separately; drawn as a single line
              the reader can see that a compound passes eight gates end to end,
              and — the point of the drawing — where a failure goes. */}
          <Reveal delay={0.1}>
            <h3 className="section-title-sm mt-16">
              The full path, receipt to release
            </h3>
            <ProcessSequence className="mt-8" />
          </Reveal>
        </div>
      </section>

      {/* ---- Technology layer ---- */}
      <section className="band section">
        <div className="container-x">
          <TwoCol reverse>
            <Reveal>
              <NavyPanel
                badge={quality.technology.panel.badge}
                title={quality.technology.panel.title}
              >
                <p className="mt-4 text-meta text-white/70 text-pretty">
                  {quality.technology.panel.body}
                </p>
                <PanelMetrics items={quality.technology.panel.metrics} />
              </NavyPanel>
            </Reveal>

            <Reveal delay={0.1}>
              <SectionHead
                eyebrow={quality.technology.eyebrow}
                title={quality.technology.title}
                size="sm"
              />
              <div className="prose-body mt-6">
                {quality.technology.body.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </div>
              <CheckList items={quality.technology.checks} className="mt-8" />
            </Reveal>
          </TwoCol>
        </div>
      </section>

      <ClosingCta {...closingCta} />
    </>
  );
}
