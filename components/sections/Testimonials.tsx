"use client";

import { Reveal } from "@/components/ui/Reveal";
import { testimonials } from "@/lib/data";

/**
 * Provider quotes. Apple sets pull quotes at intro size with no quote-mark
 * glyph and no card border — the indent and the scale carry it.
 */
export function Testimonials() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="eyebrow">Trusted by providers</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="section-title mt-2">What our partners say</h2>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08} className="h-full">
              <figure className="flex h-full flex-col rounded-tile bg-sand p-8 md:p-10">
                <blockquote className="text-intro text-ink">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 text-meta">
                  <p className="font-semibold text-ink">{t.name}</p>
                  <p className="text-ink-muted">{t.role}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
