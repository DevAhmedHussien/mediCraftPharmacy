import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/icons/set";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { RevealWords } from "@/components/motion/Motion";
import { hero } from "@/lib/content";

/**
 * The home hero.
 *
 * Three layers, back to front:
 *
 *   1. Ambient lab footage — a gloved hand pipetting into a well tray. It is
 *      the work the pharmacy actually does, at low opacity so it reads as
 *      atmosphere rather than as a video player. Silent, looped, and replaced
 *      by its own poster frame for anyone who asked for reduced motion.
 *   2. A navy scrim. This is what holds the headline at full contrast over
 *      moving footage — the type never depends on which frame is showing.
 *   3. The copy, and the specification plate.
 *
 * The headline is the owner's thesis, with "Crafted" carried in the pestle
 * cyan, and it arrives a word at a time — the one orchestrated type moment on
 * the site.
 *
 * Below it his four figures are set as a specification plate rather than the
 * usual row of big numbers with small labels. These are credentials a
 * prescriber verifies, not growth metrics, and this pharmacy's whole argument
 * is that it documents everything — so the facts are presented as the artifact
 * the business actually issues.
 */
export function Hero() {
  return (
    <section className="hero pb-16 pt-14 md:pb-20 md:pt-20">
      {/* Layer 1 — footage, at full opacity. Visibility is controlled entirely
          by the scrim above it rather than by dimming the video itself: that
          way the footage stays crisp where it shows and fully hidden where the
          type needs the contrast. */}
      <div data-layer className="absolute inset-0 -z-10 overflow-hidden">
        <AmbientVideo className="h-full w-full object-cover" />
      </div>

      {/* Layer 2 — a directional scrim. Opaque navy on the left, where the
          headline and lead sit, opening to 60% on the right so the lab is
          actually visible. The headline never depends on which frame shows. */}
      <div
        data-layer
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-navy from-25% via-navy/92 to-navy/60"
      />
      {/* A vertical pass as well, so the spec plate sits on a settled ground. */}
      <div
        data-layer
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/50 via-transparent to-navy/85"
      />

      <div className="container-x">
        <div className="max-w-3xl">
          <p className="panel-badge">
            <Icon name="flask" className="h-3.5 w-3.5" strokeWidth={1.9} />
            {hero.badge}
          </p>

          <h1 className="text-display-lg font-black text-white text-balance md:text-display-xl">
            <RevealWords text={hero.headline.before.trim()} />{" "}
            <em className="not-italic text-cyan-300">
              <RevealWords text={hero.headline.accent} />
            </em>
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
        </div>

        {/* ---- Specification plate ---- */}
        <div className="spec-plate mt-14 md:mt-16">
          <div className="spec-plate-head">
            <span className="spec-plate-head-label">{hero.spec.docLabel}</span>
            <span className="spec-plate-head-meta">{hero.spec.docMeta}</span>
          </div>

          {/* A description list, because that is what this is: four fields and
              their values. The note qualifies the value, so it sits inside the
              same <dd> rather than becoming a row of its own. */}
          <dl className="spec-plate-grid">
            {hero.spec.fields.map((f) => (
              <div key={f.field} className="spec-cell">
                <dt className="spec-cell-label">{f.field}</dt>
                <dd>
                  <span className="spec-cell-value">{f.value}</span>
                  <span className="spec-cell-note">{f.note}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
