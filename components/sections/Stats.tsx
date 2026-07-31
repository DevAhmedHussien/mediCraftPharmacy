"use client";

import { Reveal } from "@/components/ui/Reveal";
import { stats } from "@/lib/data";

/**
 * Figure row. Apple sets numbers like this in near-black on the plain page —
 * the scale of the type does the work, so there is no coloured fill.
 */
export function Stats() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-x">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <div className="text-center">
                <p className="text-display-md font-semibold text-ink md:text-display-lg">
                  {s.value}
                </p>
                <p className="mt-2 text-meta text-ink-soft">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
