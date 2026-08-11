/* ===========================================================================
   Photography and video, in one place.

   Every image is declared here with its intrinsic dimensions and real alt
   text, so `next/Image` can reserve exact space (no layout shift) and no page
   has to invent a description at the call site.

   Alt text rule: these photographs sit *beside* headings that already carry
   the meaning, so alt describes what is actually depicted and nothing more. It
   never repeats the heading and never editorialises ("world-class facility").

   One asset is deliberately unused: `cover-refill.jpg` is tablets shot on a
   saturated green background, which fights the blue identity everywhere it is
   placed. The refill page uses type and a form instead of a photograph.
   ========================================================================= */

export type Media = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export const media = {
  /** Beakers and glassware on a bench. */
  glassware: {
    src: "/images/site/cover-about.jpg",
    width: 1800,
    height: 1200,
    alt: "Laboratory glassware on a compounding bench",
  },
  /** A technician pipetting into a rack of sample tubes. */
  pipetting: {
    src: "/images/site/cover-quality.jpg",
    width: 1800,
    height: 1129,
    alt: "Technician in a lab coat and gloves pipetting into a rack of sample tubes",
  },
  /** A pharmacist selecting stock from shelving. */
  pharmacist: {
    src: "/images/site/cover-providers.jpg",
    width: 1800,
    height: 1200,
    alt: "Pharmacist selecting a labelled container from dispensary shelving",
  },
  /** Shelved stock bottles, shallow depth of field. */
  dispensary: {
    src: "/images/site/cover-products.jpg",
    width: 1800,
    height: 1200,
    alt: "Rows of labelled stock bottles on dispensary shelving",
  },
  /** A map of the United States with location pins. */
  map: {
    src: "/images/site/cover-licenses.jpg",
    width: 1800,
    height: 1200,
    alt: "Map of the United States marked with location pins",
  },
  /** A support team on headsets at workstations. */
  support: {
    src: "/images/site/cover-support.jpg",
    width: 1800,
    height: 1201,
    alt: "Support team members on headsets at their workstations",
  },
  /** A team working together at a lab bench. */
  team: {
    src: "/images/site/cover-careers.jpg",
    width: 1800,
    height: 1398,
    alt: "Team in lab coats and safety glasses working together at a bench",
  },
  /** A pharmacist checking stock — used on the careers page. */
  careersTeam: {
    src: "/images/site/careers-team.jpg",
    width: 1600,
    height: 1067,
    alt: "Pharmacist checking labelled stock on dispensary shelving",
  },
} satisfies Record<string, Media>;

/**
 * The hero's ambient clip: a gloved hand pipetting into a well tray.
 *
 * 1280x720, 14s, h264, ~1.2 MB, and silent — there is no audio track at all,
 * which is what makes it safe to autoplay. `poster` is the still browsers show
 * before the first frame decodes and the only thing served to anyone who has
 * asked for reduced motion.
 */
export const heroVideo = {
  src: "/video/hero.mp4",
  poster: "/images/site/hero-poster.webp",
  width: 1280,
  height: 720,
  /** Described for the page, though it is decorative and aria-hidden. */
  description: "Gloved hands pipetting a solution into a laboratory well tray",
};
