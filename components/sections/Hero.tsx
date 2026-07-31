"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { site } from "@/lib/site";

/**
 * Overlay hero, the way Apple opens a product page: the video is the frame and
 * the type sits centred on top of it.
 *
 * Layout — the video stays in normal flow inside a `relative` wrapper, so the
 * video itself establishes the hero's height; the copy is `absolute inset-0`
 * and centred against that same box. Nothing is hard-coded to a pixel height,
 * so the two can never drift apart.
 *
 * Robustness — each animated element carries `data-reveal`, the hook the
 * layout's <noscript> stylesheet and the reduced-motion rule use to force
 * content visible. Without it a JS failure would leave the whole hero, video
 * included, stuck at opacity 0.
 *
 * Legibility — footage brightness varies frame to frame, so the type sits on a
 * fixed gradient scrim rather than trusting the video. The scrim is set at
 * 65-75% so that even against a pure-white frame the headline clears 5.2:1 and
 * the description 4.6:1. On that dark ground the accent steps up from
 * brand-500 to brand-300. Note that is one stop further than the palette's
 * brand-400 rule for solid dark: 400 clears 6.9:1 on flat #1d1d1f, but only
 * 2.2:1 through a 65% scrim over a bright frame, so it is not safe here.
 */
export function Hero() {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
  };
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section id="top" className="pt-16 md:pt-20">
      <div className="container-x">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          data-reveal=""
          className="relative overflow-hidden rounded-panel bg-ink"
        >
          {/*
           * The video drives the box. The aspect ratio opens up as the viewport
           * narrows — a 16/9 frame on a phone is only ~200px tall, nowhere near
           * enough for a headline, paragraph and two actions.
           */}
          <video
            className="aspect-[4/5] max-h-[860px] min-h-[540px] w-full object-cover sm:aspect-[16/10] lg:aspect-[16/9]"
            autoPlay
            muted
            loop
            playsInline
            poster="/images/site/hero-poster.webp"
            aria-label="Medicraft Pharmacy compounding lab"
          >
            <source src="/video/hero.mp4" type="video/mp4" />
          </video>

          {/* Scrim. Weighted to the centre, where the type sits. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-ink/65 via-ink/75 to-ink/75"
          />

          {/* Copy — centred on the video, not beneath it. */}
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="max-w-3xl text-center"
            >
              <motion.p
                data-reveal=""
                variants={item}
                className="text-intro font-semibold text-brand-300"
              >
                {site.since} · PCAB accredited
              </motion.p>

              <motion.h1
                data-reveal=""
                variants={item}
                className="mt-2 text-display-md font-semibold text-white sm:text-display-lg md:text-display-2xl"
              >
                Wellness is crafted,
                <br className="hidden sm:block" /> not manufactured.
              </motion.h1>

              <motion.p
                data-reveal=""
                variants={item}
                className="mx-auto mt-5 max-w-xl text-body text-white/90 sm:text-intro"
              >
                A specialty compounding pharmacy pairing precision science with genuine
                care — custom medications built around every patient, delivered fast and
                backed by real clinical support.
              </motion.p>

              <motion.div
                data-reveal=""
                variants={item}
                className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4"
              >
                <Link href="/providers" className="btn-primary">
                  Become a provider
                </Link>
                <Link
                  href="/products"
                  /* brand-200 rather than 300: this link is 17px, so it is not
                     "large text" and needs 4.5:1, which 300 misses at 4.33. */
                  className="inline-flex items-center gap-1 text-body text-brand-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  Explore products <span aria-hidden>›</span>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
