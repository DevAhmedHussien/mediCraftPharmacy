"use client";

import Image from "next/image";

import { Reveal } from "@/components/ui/Reveal";
import { pillars } from "@/lib/data";

/**
 * Quality pillars. The floating accreditation badge and the heavy drop shadow
 * that used to sit on the image are gone — Apple lets a large rounded plate
 * stand on its own, and the accreditations are already stated in the footer.
 */
export function Quality() {
  return (
    <section id="quality" className="band py-16 md:py-24">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <div className="relative aspect-[4/3] overflow-hidden rounded-panel">
            <Image
              src="/images/site/compounding-lab.webp"
              alt="Sterile compounding laboratory at Medicraft Pharmacy"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="eyebrow">Redefining quality</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="section-title mt-2">Standards you can trust, in every batch</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-intro text-ink-soft">
              Our facility is built around four pillars that never bend — because
              compounding is only as good as the discipline behind it.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={0.1 + i * 0.06}>
                <div>
                  <p.icon className="h-6 w-6 text-brand-500" aria-hidden />
                  <h3 className="mt-3 text-body font-semibold text-ink">{p.title}</h3>
                  <p className="mt-1 text-meta text-ink-soft">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
