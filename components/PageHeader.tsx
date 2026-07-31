import type { ReactNode } from "react";
import Image from "next/image";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Cover photo for this page, e.g. "/images/site/cover-about.jpg". */
  cover: string;
  /**
   * Only set this when the photo carries information the heading does not. The
   * cover is decoration behind the masthead, so an empty alt is correct by
   * default — a screen reader announcing "beakers on a bench" before the H1
   * adds noise, not meaning.
   */
  coverAlt?: string;
  children?: ReactNode;
};

/**
 * Page masthead: a short cover photo with the type laid over it.
 *
 * Structure mirrors the home hero — a `relative` panel holds the photo, and the
 * copy is `absolute inset-0` and centred against that same box, so the type is
 * never merely stacked under the image. The difference is height: the hero owns
 * the viewport, while these are deliberately short bands (304px at desktop)
 * that introduce a page without pushing its content below the fold.
 *
 * Height is set explicitly rather than by aspect ratio. Every masthead on the
 * site is then exactly the same height at a given breakpoint regardless of its
 * photo's proportions, which is what makes the pages feel like one set; and
 * because the box cannot be shorter than the copy needs, a long title can't
 * spill out of it the way an aspect-driven box would allow. The band grows as
 * the viewport narrows because the same headline wraps to more lines there.
 *
 * Legibility — stock photography varies wildly in brightness, so the type sits
 * on a fixed scrim rather than trusting the image. At 60-75% over the darkest
 * plausible frame the headline clears AA comfortably, and the eyebrow steps up
 * to brand-300 (the palette's rule for type over a dark scrim, per Hero).
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  cover,
  coverAlt = "",
  children,
}: PageHeaderProps) {
  return (
    <section className="pt-12 md:pt-14">
      <div className="container-x">
        {/*
         * Heights are sized to the longest masthead on the site — the providers
         * page, whose title wraps to three lines on a phone — with headroom to
         * spare, because the copy is absolutely positioned and `overflow-hidden`
         * would silently clip anything that did not fit. The band gets shorter
         * as the viewport widens: the same title needs fewer lines there.
         */}
        <div className="relative h-[28rem] overflow-hidden rounded-panel bg-ink sm:h-[25rem] lg:h-[24rem]">
          <Image
            src={cover}
            alt={coverAlt}
            fill
            /* Above the fold on every page it appears on. */
            priority
            sizes="(min-width: 1440px) 1360px, 100vw"
            className="object-cover"
          />

          {/* Scrim. Weighted to the centre, where the type sits. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/75 to-ink/70"
          />

          <div className="absolute inset-0 flex items-center justify-center px-6 py-10">
            <div className="mx-auto max-w-3xl text-center">
              {eyebrow && (
                <p className="text-intro font-semibold text-brand-300">{eyebrow}</p>
              )}
              <h1 className="mt-2 text-display-sm font-semibold text-white sm:text-display-md md:text-display-lg">
                {title}
              </h1>
              {subtitle && (
                <p className="mx-auto mt-4 max-w-2xl text-body text-white/90 sm:text-intro">
                  {subtitle}
                </p>
              )}
              {children && (
                <div className="mt-6 flex flex-wrap justify-center gap-4">{children}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
