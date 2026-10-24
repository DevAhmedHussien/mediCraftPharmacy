/* ===========================================================================
   Imagery manifest — every image slot on the site, in one place.

   THE CURRENT SET IS THE 2026 BRAND PHOTOGRAPHY
   ---------------------------------------------
   Blue grounds and MediCraft-labelled vials, supplied October 2026. Only the
   login portrait is still Unsplash stock. Every file is pre-cropped to the
   shape of its slot and served as WebP:

     public/images/hero/        1920x1080 (16:9) page heroes and category-page heroes
     public/images/categories/  1080x1080 (1:1)  category cards
     public/images/cards/       1080x1080 (1:1)  delivery-method cards
                                1200x900  (4:3)  figures beside copy
     public/images/portrait/    1024x1536 (2:3)  the login aside

   One file per photo, served as-is: there is no image optimiser (see
   next.config.js), so a replacement must already be WebP at the slot's size.

   The source sheet's honesty rule applies to every alt text here: these are
   not MediCraft's facility or staff. Describe what is in the frame, never
   caption a frame as "our lab" or "our team", and never put one beside a
   person's name. When the Tampa facility is photographed, replace a file at
   the same name and size and nothing else needs to change.

   HOW TO PUT A NEW PHOTOGRAPH IN
   ------------------------------
   1. Convert to WebP at the slot's size.
   2. Add it to `media` below with its intrinsic size and real alt text.
   3. Point the slot at it — <Figure media={media.yourKey} />.
   ========================================================================= */

export type Media = {
  src: string;
  width: number;
  height: number;
  /**
   * Descriptive and specific — what is depicted, never the heading repeated,
   * never editorialised ("world-class facility").
   */
  alt: string;
};

/**
 * Bump when photographs are replaced at the same file name. Images are served
 * with a day of max-age and a week of stale-while-revalidate, so without a
 * new URL a returning visitor keeps seeing the old file — which is how the
 * owner saw last night's crop after this morning's rebuild.
 */
const V = "2026-10-24c";

const HERO = "/images/hero";
const CARD = "/images/cards";
const CATEGORY = "/images/categories";

/** 16:9 — every page hero, including each category's own page. */
const hero = (file: string, alt: string): Media => ({
  src: `${HERO}/${file}.webp?v=${V}`,
  width: 1920,
  height: 1080,
  alt,
});

/** 4:3 — figures that sit beside copy inside a section. */
const figure = (file: string, alt: string): Media => ({
  src: `${CARD}/${file}.webp?v=${V}`,
  width: 1200,
  height: 900,
  alt,
});

/*
 * The owner's asset folder ("Website Assets Final matching website
 * locations", 23 October 2026) names each photo for the slot it fills —
 * "6-Main Page Hero Image", "12-Quality is built" — and the numbers in the
 * comments below are those file numbers. Slots the folder does not name take
 * a numbered photo that has a full-resolution master (2752px); the "Other
 * Pictures" files exist only as upscaled 1920px JPEGs and showed pixelated.
 * /support still uses one of them (hd web-18) until a master is supplied.
 */
export const media = {
  /** Home hero. #6 */
  homeHero: hero("page-home-16x9", "A gloved hand holding a MediCraft vial up against a blue ground"),
  /** /products masthead. #5 */
  formulary: hero(
    "page-products-16x9",
    "Six blue-capped MediCraft vials on a white surface against a blue wall, one lying on its side"
  ),
  /** /quality masthead — "Quality Is Built Into Our DNA". #12 */
  lab: hero(
    "page-quality-16x9",
    "A gloved hand reaching into the glass draft shield of an analytical balance with a weight on the pan"
  ),
  /** /compounding masthead — "What Makes Compounded Medications Different". #15 */
  compoundingCover: hero(
    "page-compounding-16x9",
    "A technician in white gloves operating a manual capsule-filling machine on a steel bench"
  ),
  /** /about masthead — "Built Around the Patient". #7 */
  aboutCover: hero(
    "page-about-16x9",
    "Gloved hands measuring a syringe inside a laminar-flow hood beside IV bags and vials"
  ),
  /** /providers and /work-with-us mastheads. #16 */
  reception: hero(
    "page-providers-16x9",
    "Blue-capped vials moving along a curved filling and capping line"
  ),
  /** /licenses masthead — "Currently Serving Florida". #18 */
  licensesCover: hero(
    "page-licenses-16x9",
    "A gloved hand placing a MediCraft vial into another person's open palm"
  ),
  /** /contact masthead. #19 */
  contactCover: hero(
    "page-contact-16x9",
    "A navy MediCraft shipping box and a single vial on a white and blue surface"
  ),
  /** /careers masthead. */
  careersCover: hero(
    "page-careers-16x9",
    "Two scientists in lab coats working at analytical instruments in a blue and white laboratory"
  ),
  /** /support masthead. */
  supportCover: hero(
    "page-support-16x9",
    "A gloved hand setting a MediCraft vial on a glass tray beside a round flask and a mortar"
  ),

  /** About — the "Every Batch Tested Before It Ships" panel. #8 */
  facilityPanel: figure(
    "figure-batch-tested-4x3",
    "Two scientists in lab coats working at analytical instruments in a blue and white laboratory"
  ),
  /** Quality — chain of custody; also the navbar's pharmacy promo. */
  custody: figure(
    "figure-vial-handoff-4x3",
    "A gloved hand placing a MediCraft vial into another person's open palm"
  ),
  /** Quality — the SOP / testing figure. */
  sopPlate: figure(
    "figure-batch-tested-4x3",
    "Two scientists in lab coats working at analytical instruments in a blue and white laboratory"
  ),
  /** Quality — the sourcing figure. */
  microscope: figure(
    "figure-mortar-vial-4x3",
    "A gloved hand setting down a MediCraft vial beside a mortar and pestle and a measuring cylinder"
  ),
  /** Providers — the onboarding figure. */
  consult: figure(
    "figure-vial-handoff-4x3",
    "A gloved hand placing a MediCraft vial into another person's open palm"
  ),
  /** Licenses — "Always Growing Our Reach". #19 */
  shipping: figure(
    "figure-growing-reach-4x3",
    "A navy MediCraft shipping box and a single vial on a white and blue surface"
  ),
  /** Login — the tall aside, 2:3 portrait. */
  login: {
    src: "/images/portrait/login-lab-reports.webp",
    width: 1024,
    height: 1536,
    alt: "Gloved hands holding printed laboratory reports with charts, beside an analytical balance and rows of sample vials",
  },
} satisfies Record<string, Media>;

/**
 * Formulary category images.
 *
 * Each category has two crops of one photograph: the square `src` for its
 * card, and `hero` (16:9) for the masthead of its own /products/[category]
 * page. The keys cover both the ten Schedule A-1 slugs the formulary uses and
 * the legacy slugs the editorial catalogue in lib/data.ts still carries, so
 * every product resolves to a photograph whichever list it was filed under.
 *
 * File names carry their ratio (`-1x1`, `-16x9`). They are new names rather
 * than overwrites because images are cached for a day plus a week of
 * stale-while-revalidate, so a reused name keeps serving the old photo.
 */
export type CategoryMedia = Media & {
  /** Photographs fill the tile. Kept so a cut-out can be contained later. */
  fit: "cover" | "contain";
  /** The same photograph at 16:9, for the category page's hero. */
  hero: Media;
};

const category = (file: string, alt: string): CategoryMedia => ({
  src: `${CATEGORY}/category-${file}-1x1.webp?v=${V}`,
  width: 1080,
  height: 1080,
  alt,
  fit: "cover",
  hero: hero(`category-${file}-16x9`, alt),
});

const art = {
  /** #3 */
  weightManagement: category(
    "weight-management",
    "Bare feet on a white bathroom scale between two white dumbbells on a blue ground"
  ),
  /** #10 */
  hormoneTherapy: category(
    "hrt",
    "A woman in white resting in a blue armchair with a hand to her forehead, cooling herself with a fan"
  ),
  /** #4 */
  mensHealth: category(
    "trt",
    "A man with a muscular torso giving himself an injection at the waist with a syringe"
  ),
  /** #13 */
  sexualWellness: category(
    "sexual-health",
    "A smiling woman holding a banana beside a bed made up in blue and white"
  ),
  /** #9 */
  hairLoss: category(
    "hair-loss",
    "A woman holding a hairbrush in one hand and a clump of shed hair in the other palm"
  ),
  /** #14 */
  painManagement: category(
    "pain-management",
    "A man holding his lower back while a clinician points to a model of the spine on the desk"
  ),
  /** #2 */
  dermatology: category(
    "skin-care",
    "White pump bottles, a dropper bottle, a tube and a jar of cream on a stone plinth against a blue ground"
  ),
  /** #11 */
  vitality: category(
    "wellness-vitality",
    "An older couple dressed in white walking hand in hand along a sunny street"
  ),
  /** #1 */
  longevity: category(
    "wellness-longevity",
    "A woman doing a squat holding two blue dumbbells in a bright studio"
  ),
  /** #7 */
  ivTherapy: category(
    "iv-therapy",
    "Gloved hands measuring a syringe inside a laminar-flow hood beside IV bags and vials"
  ),
  /** #5 */
  supplies: category(
    "supplies",
    "A row of blue-capped MediCraft vials, one lying on its side, on a white surface"
  ),
  /** #17 */
  customFormulations: category(
    "compounding",
    "A gloved hand grinding white powder with a pestle in a mortar, beside a flask of clear liquid"
  ),
};

export const categoryMedia: Record<string, CategoryMedia> = {
  // Schedule A-1
  "weight-management": art.weightManagement,
  hrt: art.hormoneTherapy,
  trt: art.mensHealth,
  "sexual-health": art.sexualWellness,
  "hair-loss": art.hairLoss,
  "pain-management": art.painManagement,
  "skin-care": art.dermatology,
  "wellness-vitality": art.vitality,
  "wellness-longevity": art.longevity,
  supplies: art.supplies,
  // Legacy editorial slugs
  "hormone-therapy": art.hormoneTherapy,
  "mens-health": art.mensHealth,
  "sexual-wellness": art.sexualWellness,
  "womens-health": art.hairLoss,
  dermatology: art.dermatology,
  "vitality-longevity": art.vitality,
  "peptide-therapy": art.longevity,
  "iv-therapy": art.ivTherapy,
  "custom-formulations": art.customFormulations,
};

/** A category's image, or the custom-formulations one for a new category. */
export function categoryImage(slug: string): CategoryMedia {
  return categoryMedia[slug] ?? art.customFormulations;
}
