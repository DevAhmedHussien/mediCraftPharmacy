"use client";

import { Reveal } from "@/components/ui/Reveal";
import { highlights } from "@/lib/data";

/**
 * Feature grid as Apple builds them: plain grey tiles, no borders and no
 * hover lift, with the icon rendered as a simple blue glyph rather than sitting
 * inside a coloured chip.
 */
export function Highlights() {
  return (
    <section id="why" className="band py-16 md:py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="eyebrow">Why Medicraft</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="section-title mt-2">The difference is in the craft</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-intro text-ink-soft">
              Four commitments that shape every prescription we make — and every
              relationship we build.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h, i) => (
            <Reveal key={h.title} delay={i * 0.06} className="h-full">
              <div className="flex h-full flex-col rounded-tile bg-white p-8">
                <h.icon className="h-7 w-7 text-brand-500" aria-hidden />
                <h3 className="mt-5 text-[1.3125rem] font-semibold tracking-[-0.021em] text-ink">
                  {h.title}
                </h3>
                <p className="mt-2 text-meta text-ink-soft">{h.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
