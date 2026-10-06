import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PUBLIC_PHASES } from "@/lib/partner/steps";

/* ===========================================================================
   How becoming a partner actually works.

   Every step, its number and its description come from lib/partner/steps.ts —
   the same table the portal's progress tracker reads. That is deliberate: a
   marketing page describing an onboarding flow is the easiest thing on a site
   to let drift, and the moment it does, the first thing a new partner learns
   is that the pharmacy's own account of itself is out of date. Adding a step
   to the pipeline forces a sentence for it here; removing one removes it.

   Numbered markers, which are usually a generic tell, earn their place here:
   this is literally a sequence, and a prospective partner's real question is
   "how far in do I have to be before I see a price?" — which only the numbers
   answer.
   ========================================================================= */

export function HowItWorks({ showCta = false }: { showCta?: boolean }) {
  return (
    <section className="section bg-sand">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-display-sm font-black text-ink text-balance md:text-display-md">
            Ten steps, and you see pricing at step four
          </h2>
          <p className="mt-4 text-intro text-ink-soft text-pretty">
            Licences, signatures and documents come last, not first. You will have
            seen exactly what we charge before we ask you to sign anything.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-8">
          {PUBLIC_PHASES.map(({ phase, steps }) => (
            <div key={phase}>
              <h3 className="border-b border-hair pb-3 text-meta font-medium text-navy">
                {phase}
              </h3>

              <ol className="mt-5 space-y-6">
                {steps.map((step) => (
                  <li key={step.id} className="flex gap-4">
                    <span
                      aria-hidden
                      className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-hair bg-white font-mono text-caption text-brand-500"
                    >
                      {step.number}
                    </span>
                    <div className="min-w-0">
                      <p className="text-meta font-bold text-ink">
                        {step.publicLabel ?? step.label}
                      </p>
                      <p className="mt-1 text-caption leading-relaxed text-ink-soft text-pretty">
                        {step.publicDetail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {showCta && (
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-hair pt-8">
            <Link href="/work-with-us" className="btn-primary btn-lg">
              Open a provider account
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </Link>
            <p className="fine-print">
              Step one takes a couple of minutes and commits you to nothing.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
