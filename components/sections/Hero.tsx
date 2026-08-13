import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/icons/set";
import { RevealWords } from "@/components/motion/Motion";
import { hero } from "@/lib/content";

/**
 * The home hero.
 *
 * The ground is the brand gradient, not photography — and that is a decision,
 * not a gap. The art-direction brief (§6) forbids filling this slot with stock
 * cleanroom footage until the facility is certified and shot, because a
 * prescriber who tours the real building and finds it does not match the site
 * has been handed a reason to doubt the compliance claims as well. Its
 * first-preference substitute is exactly this: a gradient and typography
 * composition in brand colours. "An honest gradient beats a dishonest
 * photograph."
 *
 * The P1 frame that belongs here once shot: a gowned compounder's gloved hands
 * working under the laminar airflow hood, mid-action, three-quarter rear angle,
 * subject in the right third so the headline keeps the left 60%. Drop it into
 * `heroVideo` / `media` and restore the <AmbientVideo> layer — the scrim and
 * safe-area geometry below are already built for it.
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
      {/* The HEPA ceiling grid, drawn in CSS — the texture the brief asks for as
          a material ground (§4.5). It gives the gradient substance without
          pretending to be a photograph of a facility that is still in buildout.
          When the P1 hood shot lands, this is the layer it replaces. */}
      <span data-layer aria-hidden className="hero-grid" />

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
