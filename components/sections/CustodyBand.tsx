import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { FadeIn } from "@/components/motion/Motion";
import { quality } from "@/lib/content";
import { media } from "@/lib/media";

/**
 * Full-bleed band carrying the chain-of-custody claim.
 *
 * This section wants motion — the claim *is* that everything is filmed — but it
 * deliberately uses a still. There is only one clip in the project, and running
 * the same 14-second loop here and in the hero reads as an asset shortage
 * rather than as two considered decisions. Drop a second clip of the packing
 * and sealing line into public/video and this is the section to put it in.
 */
export function CustodyBand() {
  const { panel } = quality.custody;

  return (
    <section className="relative isolate overflow-hidden bg-navy py-20 text-white md:py-28">
      <div className="absolute inset-0 -z-10">
        <Image
          src={media.pipetting.src}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>
      {/* Scrim. Heavier at the top where the heading sits. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-navy via-navy/85 to-navy/95"
      />

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
                className="rounded-tile border border-white/15 bg-navy/70 p-5 backdrop-blur-sm"
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

        <FadeIn delay={0.15}>
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
