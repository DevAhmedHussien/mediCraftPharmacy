"use client";

import Link from "next/link";
import { CheckBadgeIcon } from "@/components/icons";
import { Reveal } from "@/components/ui/Reveal";

const perks = [
  "Free provider portal with real-time order tracking",
  "Dedicated clinical liaison for your practice",
  "Bulk and recurring prescription workflows",
  "Transparent pricing, no hidden fees",
];

/**
 * Provider pitch. Apple keeps blue for the interactive parts only, so the
 * headline sits in near-black on white and the blue appears in the checkmarks,
 * the button, and the text link.
 */
export function Providers() {
  return (
    <section id="providers" className="py-16 md:py-24">
      <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div>
          <Reveal>
            <p className="eyebrow">For providers</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="section-title mt-2">
              Partner with a pharmacy that works the way you do
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-xl text-intro text-ink-soft">
              Join 1,200+ providers who trust Medicraft for reliable compounding, fast
              turnaround, and clinical partnership.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href="/providers" className="btn-primary">
                Get started
              </Link>
              <Link href="/support" className="link-blue text-body">
                Talk to our team <span aria-hidden>›</span>
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Hairline-separated stack: a 1px grid gap showing the line colour
            through from behind each row. */}
        <ul className="grid gap-px overflow-hidden rounded-panel bg-line">
          {perks.map((perk, i) => (
            <li key={perk} className="bg-sand">
              <Reveal delay={0.1 + i * 0.06}>
                <div className="flex items-start gap-3 p-6 text-body text-ink">
                  <CheckBadgeIcon className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{perk}</span>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
