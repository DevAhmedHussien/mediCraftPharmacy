import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CustodyFilm } from "@/components/media/CustodyFilm";
import { FadeIn } from "@/components/motion/Motion";
import { quality } from "@/lib/content";

/**
 * Full-bleed band carrying the chain-of-custody claim.
 *
 * The brief calls this the highest-differentiation section on the site and its
 * most under-illustrated (§4.10, P1). The frame it wants is specific: a packing
 * station from a slightly elevated three-quarter angle **with the overhead
 * camera visibly in frame** — because "the entire claim is 'we filmed it'. If
 * the viewer cannot see the camera, the claim is just text."
 *
 * Until that is shot, this runs on the brand gradient rather than a stock
 * substitute (§6). A stock packing bench with no camera in it would illustrate
 * the opposite of the claim.
 */
export function CustodyBand() {
  const { panel } = quality.custody;

  return (
    <section className="relative isolate overflow-hidden border-y border-line bg-sand py-20 text-ink md:py-28">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(150deg, #070f26 0%, #142b6b 55%, #1b54fb 130%)",
        }}
      />
      <span aria-hidden className="hero-grid" />

      <div className="container-x">
        <FadeIn className="max-w-3xl">
          <p className="eyebrow eyebrow-invert">{panel.badge}</p>
          <h2 className="mt-4 text-display-md font-black text-white text-balance md:text-display-lg">
            {panel.title}
          </h2>
          <p className="mt-5 text-intro text-white/75 text-pretty">{panel.body}</p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <dl className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {panel.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-tile border border-line bg-white p-5"
              >
                <dt className="sr-only">{m.label}</dt>
                <dd>
                  <span className="block text-[1.75rem] font-black leading-none text-cyan-300">
                    {m.value}
                  </span>
                  <span className="mt-2 block text-caption leading-snug text-white/70">
                    {m.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </FadeIn>

        {/* The contact sheet. This is what turns the claim from an assertion
            into something with a shape — the frames carry camera IDs, timecodes
            and a prescription number, which is what makes footage evidential.
            See components/media/CustodyFilm.tsx. */}
        <FadeIn delay={0.15}>
          <CustodyFilm invert className="mt-12" />
        </FadeIn>

        <FadeIn delay={0.2}>
          <Link href="/quality" className="btn-accent btn-lg group mt-10">
            See the full quality record
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.2}
            />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}
