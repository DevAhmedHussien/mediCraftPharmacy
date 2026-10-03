import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/icons/set";
import { RevealWords } from "@/components/motion/Motion";
import { TrustMarquee } from "@/components/sections/TrustMarquee";
import { hero } from "@/lib/content";
import { media } from "@/lib/media";

/**
 * The home hero.
 *
 * The ground carries one rendered layer: the injectable line on a navy stage
 * (lib/media.ts `homeHero`), composed so the vials hold the right 45% and the
 * headline keeps the left of the frame. It is a product rendering wearing
 * MediCraft's own labels, generated from this site's own catalog — not stock,
 * and not a photograph of a facility. So the art-direction brief's §6 caution
 * does not bite here: what it forbids is filling this slot with stock
 * cleanroom footage until the real facility is certified and shot, because a
 * prescriber who tours the building and finds it does not match the site has
 * been handed a reason to doubt the compliance claims as well. Nothing in this
 * frame is a claim about a room.
 *
 * It is deliberately not put in a box. The vials are cut out on transparency
 * and stand directly on the hero ground, lit by one cyan bloom behind the
 * glass and grounded by a contact shadow under the bases (`.hero-product` in
 * globals.css). The earlier version masked a render that had its own navy
 * gradient and floor reflection baked in, which is what made the product read
 * as a faded panel parked beside the copy rather than part of the page.
 *
 * The P1 frame that belongs here once shot: a gowned compounder's gloved hands
 * working under the laminar airflow hood, mid-action, three-quarter rear angle,
 * subject in the right third so the headline keeps the left 60%. Drop it into
 * `heroVideo` and restore the <AmbientVideo> layer — the scrim and safe-area
 * geometry below are already built for it.
 *
 * The headline is the owner's thesis, with "Crafted" carried in the pestle
 * cyan, and it arrives a word at a time — the one orchestrated type moment on
 * the site.
 */
export function Hero() {
  return (
    <section className="hero hero-full pt-16 md:pt-24">
      {/* The HEPA ceiling grid, drawn in CSS — the texture the brief asks for as
          a material ground (§4.5). It gives the gradient substance without
          pretending to be a photograph of a facility that is still in buildout.
          When the P1 hood shot lands, this is the layer it replaces. */}
      <span data-layer aria-hidden className="hero-grid" />

      <div className="container-x">
        {/* Two real columns at `lg`, rather than copy in the flow with the
            product absolutely positioned behind it. The product now has a
            column of its own, so nothing has to be masked to avoid a
            collision and the two halves share one baseline. */}
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7 xl:col-span-6">
          <p className="panel-badge">
            <Icon name="flask" className="h-3.5 w-3.5" strokeWidth={1.9} />
            {hero.badge}
          </p>

          <h1 className="text-display-lg font-black text-white text-balance md:text-display-xl">
            <RevealWords text={hero.headline.before.trim()} />{" "}
            <em className="not-italic text-cyan-300">
              <RevealWords text={hero.headline.accent} />
            </em>{" "}
            <RevealWords text={hero.headline.after} />
          </h1>

          <p className="mt-6 max-w-2xl text-intro text-white/80 text-pretty">
            {hero.lead}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={hero.actions.primary.href} className="btn-accent btn-lg group">
              {hero.actions.primary.label}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                strokeWidth={2.2}
              />
            </Link>
            <Link
              href={hero.actions.secondary.href}
              className="btn-outline-invert btn-lg"
            >
              {hero.actions.secondary.label}
            </Link>
          </div>

          {/* ---- Prescriber social proof ----
              The chips are overlapped by a third of their width, which is what
              makes them read as a group rather than three separate badges.
              They are decorative shorthand for the credential classes named in the
              sentence beside them, so the group is aria-hidden and the count
              is the part a screen reader hears. */}
          <div className="mt-10 flex items-center gap-4">
            <ul aria-hidden className="flex">
              {hero.socialProof.credentials.map((c) => (
                <li
                  key={c}
                  className="-ml-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-navy-soft font-mono text-[0.6875rem] font-medium tracking-wide text-cyan-300 first:ml-0"
                >
                  {c}
                </li>
              ))}
            </ul>
            <p className="text-meta text-white/70">
              {hero.socialProof.before}
              <strong className="font-bold text-white">
                {hero.socialProof.count}
              </strong>
              {hero.socialProof.after}
            </p>
          </div>
        </div>

        {/* ---- The product ----
            A cut-out on transparency, so it stands on the hero ground rather
            than inside a masked panel. The glow behind it and the contact
            shadow under it are what the old render had baked in as a gradient
            and a floor reflection; drawn in CSS they adapt to the layout
            instead of dictating it.

            `priority` because this is the LCP element at every width, and
            next/image would otherwise lazy-load it. */}
        <div className="hero-product lg:col-span-5 xl:col-span-6">
          <span aria-hidden className="hero-product-glow" />
          <Image
            src={media.homeHero.src}
            alt={media.homeHero.alt}
            width={media.homeHero.width}
            height={media.homeHero.height}
            priority
            sizes="(min-width: 1280px) 32rem, (min-width: 1024px) 28rem, (min-width: 640px) 26rem, 22rem"
            className="hero-product-img"
          />
          </div>
        </div>
      </div>

      {/* Inside the hero, on its bottom edge: the credentials are part of the
          first screen rather than the first thing below it, and the ticker's
          own top border becomes the line that closes the band. */}
      <TrustMarquee />
    </section>
  );
}
