import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Card, Eyebrow, Glass, SectionTitle } from "@/components/ui/glass";
import { Counter } from "@/components/motion/Counter";
import { Button } from "@/components/ui/button";
import { hero, providers, quality } from "@/lib/content";
import { site, telHref } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  path: "/",
});

/* Redesigned home. Server component; every string is server-rendered text
   from lib/content.ts. Section rhythm: 160px between sections on desktop,
   96px on mobile. Container 1120px. */

const container = "mx-auto w-full max-w-[1120px] px-5";
const section = "pt-24 lg:pt-40";

export default function HomePage() {
  const custody = quality.custody.recorded.steps;
  const tests = quality.testing.banner.specs;
  const areas = providers.therapeuticAreas.items;
  const onboarding = providers.onboarding;
  const tel = telHref();

  return (
    <div className="bg-paper text-navy">
      {/* ---- Hero ---- */}
      <section aria-labelledby="hero-h" className={`${container} flex flex-col items-center gap-7 pt-20 text-center lg:pt-[120px]`}>
        <Eyebrow tone="muted">503A Compounding · {site.addressShort}</Eyebrow>
        <h1
          id="hero-h"
          className="max-w-[900px] font-display text-[clamp(2.75rem,6.6vw,5.5rem)] font-normal leading-[1.02] tracking-display text-balance"
        >
          {hero.headline.before}
          {hero.headline.accent}{" "}
          <span className="text-brand-500">{hero.headline.after}</span>
        </h1>
        <p className="max-w-[600px] text-lg leading-[1.65] text-ink-soft text-pretty">{hero.lead}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {/* The one Button, as a link. `asChild` passes the styling to
              next/link rather than nesting an <a> inside a <button>. */}
          <Button asChild>
            <Link href={hero.actions.primary.href}>{hero.actions.primary.label}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={hero.actions.secondary.href}>{hero.actions.secondary.label}</Link>
          </Button>
        </div>
      </section>

      {/* ---- Hero image + glass specification plate ---- */}
      <section aria-label={hero.spec.docLabel} className={`${container} pt-12 lg:pt-20`}>
        <div className="relative h-[clamp(22.5rem,52vw,38.75rem)] overflow-hidden rounded-hero bg-stone">
          <Image
            src="/images/brand/vial-blue-ice.webp"
            alt="A MediCraft semaglutide injection vial, double strength 5 mg/mL, resting in ice"
            fill
            priority
            sizes="(min-width: 1120px) 1080px, 100vw"
            className="object-cover"
          />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-white/30 to-transparent" />
          {/* Pinned to the FOOT of the image, not the head. At the top the
              plate covered the vial — the one thing the photograph is of —
              and sat directly under the floating header, so two frosted
              panels stacked with 20px between them. At the bottom it reads
              as a caption on the image, which is what it is. */}
          {/* The ONLY thing above the fold that moves. 12px rather than 24
              because it sits on the photograph — a longer throw reads as the
              plate sliding off the picture — and 200ms behind the paint so
              the image has landed before the caption arrives on it.
              
              CSS, not a motion leaf: it is one element, it animates once on
              load rather than on scroll, and `/` has an 8 kB budget. */}
          <Glass
            as="dl"
            /* THE PLATE SHRINKS, IT DOES NOT DISAPPEAR.
            
               At 375 this was four cells of 22px figures with 12.5px notes
               under them, inset 20px from each edge of a photograph — the
               notes wrapped to three lines and the plate covered most of the
               vial. Hiding it on mobile was the other option and it is the
               wrong one: these four facts are the page's only hard claims
               about scope and licensure, and a phone is where most people
               will read them.
            
               So everything scales with the viewport instead. Inset drops to
               10px, the figure runs 15px → 22px, the note 11px → 12.5px, and
               the note itself is hidden only under 380px, where there is
               genuinely no room for a third line and the figure above it
               already carries the fact. */
            className="absolute inset-x-2.5 bottom-2.5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl shadow-float motion-safe:animate-[reveal-up-sm_600ms_cubic-bezier(0.22,1,0.36,1)_200ms_both] sm:inset-x-5 sm:bottom-5 sm:rounded-[20px] lg:grid-cols-4"
          >
            {hero.spec.fields.map((f) => (
              <div
                key={f.field}
                className="flex flex-col gap-0.5 bg-white/35 px-3 py-2.5 text-left sm:gap-1 sm:px-[18px] sm:py-4"
              >
                <dt className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-soft sm:text-[10.5px] sm:tracking-[0.1em]">
                  {f.field}
                </dt>
                <dd className="text-[0.9375rem] font-medium leading-tight tracking-[-0.02em] sm:text-[1.375rem]">
                  {f.value}
                </dd>
                <dd className="hidden text-[11px] leading-snug text-ink-soft min-[380px]:block sm:text-[12.5px]">
                  {f.note}
                </dd>
              </div>
            ))}
          </Glass>
        </div>
      </section>

      {/* ---- Chain of custody ---- */}
      <section aria-labelledby="custody-h" className={`${container} ${section} flex flex-col gap-14`}>
        <div className="flex max-w-[640px] flex-col gap-4">
          <Eyebrow>{quality.custody.panel.badge}</Eyebrow>
          <SectionTitle id="custody-h">{quality.custody.panel.title}</SectionTitle>
          <p className="text-[17px] leading-[1.65] text-ink-soft">
            Most pharmacies can tell you a package shipped. We can show you exactly what was in it.
          </p>
        </div>
        <ol className="reveal-group grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {custody.map((s, i) => (
            <li key={s.title}>
              <Card className="flex h-full min-h-[240px] flex-col gap-3.5 p-7">
                <span className="font-mono text-xs text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-auto text-[19px] font-medium leading-tight">{s.title}</h3>
                <p className="text-[14.5px] leading-relaxed text-ink-soft text-pretty">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- Finished product testing ---- */}
      <section aria-labelledby="testing-h" className={`${container} ${section} grid items-start gap-12 lg:grid-cols-2 lg:gap-20`}>
        <div className="flex flex-col gap-4 lg:sticky lg:top-[120px]">
          <Eyebrow>{quality.testing.banner.eyebrow}</Eyebrow>
          <SectionTitle id="testing-h">{quality.testing.banner.title}</SectionTitle>
          <p className="text-[17px] leading-[1.65] text-ink-soft text-pretty">{quality.testing.banner.body}</p>
          <Link href="/quality" className="mt-2 text-[15px] font-medium text-brand-500 hover:text-navy">
            How we hold the standard →
          </Link>
        </div>
        {/* Each row on the CSS `.reveal` utility, not a motion leaf. Four
            ruled rows do not need an orchestrator, and this way the whole
            section ships no JavaScript. */}
        <ul className="border-t border-hair">
          {tests.map((t) => (
            <li key={t.mark} className="reveal grid grid-cols-[110px_minmax(0,1fr)] gap-5 border-b border-hair py-[26px]">
              <span className="pt-1 font-mono text-xs tracking-[0.06em] text-brand-500">{t.mark}</span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[19px] font-medium">{t.title}</h3>
                <p className="text-[15px] leading-relaxed text-ink-soft">{t.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Formulary ---- */}
      <section aria-labelledby="formulary-h" className={`${container} ${section} flex flex-col gap-10`}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex max-w-[640px] flex-col gap-4">
            <Eyebrow>{providers.therapeuticAreas.eyebrow}</Eyebrow>
            <SectionTitle id="formulary-h">{providers.therapeuticAreas.title}</SectionTitle>
          </div>
          <Link href="/products" className="text-[15px] font-medium text-brand-500 hover:text-navy">View the full formulary →</Link>
        </div>
        <ul className="reveal-group grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {areas.map((a) => (
            <li key={a.href}>
              {/* `.reveal-media` settles the packshot out of a 1.05 scale as
                  the tile enters. The frame does not move — it clips — so
                  the grid never reflows and CLS stays at 0. */}
              <Link
                href={a.href}
                className="reveal-media group relative block aspect-[3/4] overflow-hidden rounded-card bg-stone"
              >
                <Image
                  src={`/images/site/mc-area-${a.href.split("/").pop()}-4x3-2x.webp`}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 210px, 45vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
                />
                <Glass as="span" className="absolute inset-x-3 top-3 rounded-[14px] px-3.5 py-[11px] text-[14.5px] font-medium shadow-none">
                  {a.title}
                </Glass>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-[13.5px] text-ink-muted">
          All formulations require a valid prescription from a licensed provider for a specific, identified patient.
        </p>
      </section>

      {/* ---- Getting started ---- */}
      <section aria-labelledby="start-h" className={`${container} ${section} flex flex-col gap-14`}>
        <div className="flex max-w-[640px] flex-col gap-4">
          <Eyebrow>{onboarding.eyebrow}</Eyebrow>
          <SectionTitle id="start-h">{onboarding.title}</SectionTitle>
          <p className="text-[17px] leading-[1.65] text-ink-soft">{onboarding.lead}</p>
        </div>
        <ol className="reveal-group grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {onboarding.steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3 border-t border-hair-strong pt-5">
              {/* `tabular-nums` so the box does not reflow as the digit
                  changes — a counter that nudges its neighbours is a layout
                  shift, and the target here is CLS 0. */}
              <span className="font-mono text-xs tabular-nums text-ink-muted">
                0<Counter value={i + 1} />
              </span>
              <h3 className="text-lg font-medium leading-snug">{s.title}</h3>
              <p className="text-[14.5px] leading-relaxed text-ink-soft text-pretty">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- Closing CTA ---- */}
      <section aria-labelledby="cta-h" className={`${container} ${section} pb-24`}>
        <div className="reveal flex flex-col items-center gap-5 rounded-hero border border-hair-soft bg-gradient-to-b from-white to-[#f1f3f8] px-6 py-[clamp(2.5rem,6vw,5.5rem)] text-center">
          <h2 id="cta-h" className="max-w-[720px] text-[clamp(2.1rem,4.6vw,3.6rem)] font-normal leading-[1.06] tracking-[-0.04em] text-balance">
            Ready to Partner with MediCraft?
          </h2>
          <p className="max-w-[520px] text-[17px] leading-relaxed text-ink-soft">
            Join the providers who trust MediCraft to craft the precision compounds their patients need.
          </p>
          <div className="mt-1.5 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/work-with-us">Open a Provider Account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">Request a Formulary</Link>
            </Button>
          </div>
          {tel && (
            <a href={tel} className="mt-1.5 font-mono text-[13px] text-ink-soft hover:text-navy">
              {site.phone} · {site.hours[0].time}
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
