import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { RevealWords } from "@/components/motion/Motion";
import { hero } from "@/lib/content";

/**
 * The home hero.
 *
 * White, not navy.
 *
 * The identity's own photography is shot on white — the vials, the stationery,
 * the glass mark all sit on a studio sweep — so a dark hero meant every image
 * arrived in a box of the wrong colour, and the product had to be cut out or
 * masked to survive the transition. On white the photograph and the page share
 * a ground and the vial simply stands on it.
 *
 * Colour comes from the identity and nothing else: brand blue for the accent
 * word and the primary action, cyan reserved for the small marks. No gradient,
 * no scrim, no tinted panel behind the type.
 *
 * The product shot is `priority` because it is the LCP element at every width.
 */
export function Hero() {
  return (
    /* Full first screen, less the fixed chrome the page already pads for.
     *
     * `svh` rather than `vh`: on iOS `vh` is the tallest the viewport ever
     * gets, so with the browser bars showing a 100vh hero runs past the screen
     * and the calls to action start below the fold. `min-h` rather than `h` so
     * a long headline at 320px can still grow past it. */
    <section className="relative flex items-center overflow-hidden bg-white [min-height:calc(100svh-var(--chrome-h))]">
      <div className="container-x w-full">
        <div className="grid items-center gap-12 py-14 md:py-16 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            {/* The one orchestrated type moment on the site: the headline
                arrives a word at a time on load. RevealWords returns plain
                text under `prefers-reduced-motion`, so nothing animates for
                anyone who has asked it not to. */}
            <h1 className="text-display-lg font-black leading-[1.04] tracking-tight text-ink text-balance md:text-display-xl">
              <RevealWords text={hero.headline.before.trim()} />{" "}
              <span className="text-brand-600">
                <RevealWords text={hero.headline.accent} />
              </span>{" "}
              <RevealWords text={hero.headline.after} />
            </h1>

            <p className="mt-6 max-w-xl text-intro leading-relaxed text-ink-soft text-pretty">
              {hero.lead}
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={hero.actions.primary.href} className="btn-primary btn-lg group">
                {hero.actions.primary.label}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  strokeWidth={2.2}
                />
              </Link>
              <Link href={hero.actions.secondary.href} className="btn-outline btn-lg">
                {hero.actions.secondary.label}
              </Link>
            </div>
          </div>

          {/* The product, shot on the same white the page is on. No frame and
              no mask: the studio sweep and the page are one surface, which is
              the whole reason this hero is white.
              
              The straight-on shot rather than the tilted one — the tilted
              frame sits on a reflective grey floor, and that floor reads as a
              box edge once the surrounding sweep is lifted to true white. */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto w-full max-w-[20rem] lg:ml-auto lg:mr-0 lg:max-w-[23rem]">
              <Image
                src="/images/brand/vial-blue-front.webp"
                alt="A MediCraft Pharmacy semaglutide injection vial, 2.5 mL multiple-dose, labelled in the MediCraft identity"
                width={1086}
                height={1448}
                priority
                sizes="(min-width: 1024px) 23rem, (min-width: 640px) 20rem, 80vw"
                className="hero-vial h-auto w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
