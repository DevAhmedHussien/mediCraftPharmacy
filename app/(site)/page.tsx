import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CheckList, ClosingCta, SectionHead } from "@/components/blocks";
import { BrandFigure } from "@/components/sections/BrandFigure";
import { FeatureTiles } from "@/components/sections/FeatureTiles";
import { Hero } from "@/components/sections/Hero";
import { NumberedSteps } from "@/components/sections/NumberedSteps";
import { ProductShowcase } from "@/components/sections/ProductShowcase";
import { TrustMarquee } from "@/components/sections/TrustMarquee";
import { FadeIn } from "@/components/motion/Motion";
import { getProducts } from "@/lib/catalogue";
import { about, closingCta, providers, quality } from "@/lib/content";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  path: "/",
});

/**
 * Home page.
 *
 * Sequenced the way a prescriber decides: the thesis, what they get, what it
 * is worth to them, what is actually in the formulary, why the systems can be
 * believed, how long it takes to start, and the credentials behind all of it.
 *
 * Every section is composed from a shared component — FeatureTiles,
 * NumberedSteps, ProductShowcase, SectionHead, CheckList — so the interior
 * pages are built from the same vocabulary rather than each inventing its own
 * version of a row of claims.
 *
 * WHITE, WITH ONE TINT
 * --------------------
 * Sections alternate between white and `sand` (#f5f8fd), a faint blue drawn
 * from the identity. That is the only ground colour on the page: no navy
 * bands, no gradients, no second accent. The product photography is shot on
 * white, so the page and the pictures share a surface.
 */
export default async function HomePage() {
  // Nine, to fill three rows of three without a ragged last row.
  const products = (await getProducts()).slice(0, 9);

  return (
    <>
      <Hero />

      {/* ---- What a provider gets ---- */}
      <section className="section border-t border-line">
        <div className="container-x">
          <FadeIn>
            <FeatureTiles items={providers.benefits} />
          </FadeIn>
        </div>
      </section>

      {/* ---- Who we are, and what that is worth ---- */}
      <section className="band section">
        <div className="container-x">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <FadeIn>
              <SectionHead
                eyebrow={about.intro.eyebrow}
                title={about.intro.title}
                lead={about.intro.body[0]}
              />
              {about.intro.body.slice(1).map((paragraph) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className="mt-4 text-body leading-relaxed text-ink-soft text-pretty"
                >
                  {paragraph}
                </p>
              ))}
              <CheckList items={about.intro.checks} className="mt-8" />
              <Link href="/about" className="link-arrow mt-8 inline-flex">
                More about MediCraft
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </FadeIn>

            <FadeIn delay={0.1}>
              {/* The identity's own glass mark. It is the mortar and pestle
                  from the logo rendered as an object, which is the one image
                  on the site that is about the brand rather than the
                  medicine. */}
              <BrandFigure
                src="/images/brand/vial-clear-water.webp"
                alt="A MediCraft semaglutide vial in water"
                width={1086}
                height={1448}
                sizes="(min-width: 1024px) 26rem, 80vw"
                className="max-w-[26rem] rounded-tile border border-line overflow-hidden"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ---- The formulary ---- */}
      <section className="section">
        <div className="container-x">
          <FadeIn>
            {/* No eyebrow. "Our formulary" above "Compounded preparations,
                made to the prescription" is the same fact twice, and the
                eyebrow device only earns its place where it adds a word the
                title does not already carry. */}
            <SectionHead
              align="center"
              title="Compounded preparations, made to the prescription"
              lead="A growing formulary of patient-specific compounded medications. Every preparation requires a valid prescription from a licensed provider."
              className="mx-auto max-w-2xl"
            />
          </FadeIn>

          <ProductShowcase products={products} className="mt-12" />

          <div className="mt-10 text-center">
            <Link href="/products" className="btn-outline btn-lg">
              View the full formulary
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Why the systems can be believed ---- */}
      <section className="band section">
        <div className="container-x">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <FadeIn className="order-2 lg:order-1">
              <BrandFigure
                variant="framed"
                src="/images/brand/vial-clear-pair-glass.webp"
                alt="Two MediCraft semaglutide vials beside a glass of water"
                width={1086}
                height={1448}
                sizes="(min-width: 1024px) 30rem, 88vw"
                className="max-w-[30rem]"
              />
            </FadeIn>

            <FadeIn delay={0.1} className="order-1 lg:order-2">
              <SectionHead
                eyebrow={quality.banner.eyebrow}
                title={quality.banner.title}
                lead={quality.banner.body}
              />
              <CheckList items={about.facility.checks} className="mt-8" />
              <Link href="/quality" className="link-arrow mt-8 inline-flex">
                How we hold the standard
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ---- How long it takes to start ---- */}
      <section className="section">
        <div className="container-x">
          <FadeIn>
            <SectionHead
              align="center"
              eyebrow={providers.onboarding.eyebrow}
              title={providers.onboarding.title}
              lead={providers.onboarding.lead}
              className="mx-auto max-w-2xl"
            />
          </FadeIn>

          <NumberedSteps items={providers.onboarding.steps} className="mt-14" />
        </div>
      </section>

      {/* ---- The credentials behind all of it ----
          Hallandale puts a named provider testimonial here. We have no real
          one, and a quote attributed to an invented prescriber on a pharmacy
          site is not a design decision — so this is the accreditation row
          instead, which is verifiable. */}
      <TrustMarquee />

      <ClosingCta {...closingCta} />
    </>
  );
}
