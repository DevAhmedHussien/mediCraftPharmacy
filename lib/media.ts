/* ===========================================================================
   Imagery manifest — every image slot on the site, in one place.

   THE CURRENT SET IS THE 2026 BRAND PHOTOGRAPHY
   ---------------------------------------------
   Blue grounds and MediCraft-labelled vials, supplied October 2026. Only the
   login portrait and the nasal-spray card are still Unsplash stock. Every
   file is pre-cropped to one of four sizes and served as WebP:

     public/images/hero/        1920x1080 (16:9) page heroes
     public/images/cards/       1200x900  (4:3) cards and section figures
     public/images/categories/  1200x900  (4:3) one per formulary category
     public/images/portrait/    1024x1536 (2:3) the login aside

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

const HERO = "/images/hero";
const CARD = "/images/cards";
const CATEGORY = "/images/categories";

const hero = (file: string, alt: string): Media => ({
  src: `${HERO}/${file}.webp`,
  width: 1920,
  height: 1080,
  alt,
});

const card = (file: string, alt: string): Media => ({
  src: `${CARD}/${file}.webp`,
  width: 1200,
  height: 900,
  alt,
});

export const media = {
  /** Home hero. */
  homeHero: hero(
    "hero-11-home-vials",
    "Six blue-capped MediCraft vials on a white surface against a blue wall, one lying on its side"
  ),
  /** /products masthead. */
  formulary: hero(
    "hero-12-formulary-vials",
    "Gloved hands arranging small MediCraft vials on a white bench beside a measuring cylinder"
  ),
  /** /quality masthead. */
  lab: hero(
    "hero-13-quality-lab",
    "Two scientists in lab coats working at analytical instruments in a blue and white laboratory"
  ),
  /** /compounding masthead. */
  compoundingCover: hero(
    "hero-14-compounding-mortar",
    "A gloved hand grinding white powder in a mortar beside a flask of clear liquid on a blue ground"
  ),
  /** /about masthead. */
  aboutCover: hero(
    "hero-15-about-vial-line",
    "Blue-capped vials moving along a curved filling and capping line"
  ),
  /** /providers and /work-with-us mastheads. */
  reception: hero(
    "hero-16-providers-handoff",
    "A gloved hand placing a MediCraft vial into another person's open palm"
  ),
  /** /licenses masthead. */
  licensesCover: hero(
    "hero-17-coverage-shipping",
    "A navy MediCraft shipping box and a single vial on a white and blue surface"
  ),
  /** /contact masthead. */
  contactCover: hero(
    "hero-18-contact-vial",
    "A gloved hand holding a MediCraft vial up against a blue ground"
  ),
  /** /careers masthead. */
  careersCover: hero(
    "hero-19-careers-capsule-filler",
    "A technician in white gloves operating a manual capsule-filling machine on a steel bench"
  ),
  /** /support masthead. */
  supportCover: hero(
    "hero-20-refill-vial-flask",
    "A gloved hand setting a MediCraft vial on a glass tray beside a round flask and a mortar"
  ),

  /** About — the facility panel. */
  facilityPanel: card(
    "card-15-analytical-lab",
    "Two scientists in lab coats working at analytical instruments in a blue and white laboratory"
  ),
  /** Quality — chain of custody; also the navbar's pharmacy promo. */
  custody: card(
    "card-21-vial-handoff",
    "A gloved hand placing a MediCraft vial into another person's open palm"
  ),
  /** Quality — the SOP / testing figure. */
  sopPlate: card(
    "card-15-analytical-lab",
    "Two scientists in lab coats working at analytical instruments in a blue and white laboratory"
  ),
  /** Quality — the sourcing figure. */
  microscope: card(
    "card-16-analytical-balance",
    "A gloved hand opening the glass draft shield of an analytical balance with a weight on the pan"
  ),
  /** Providers — the onboarding figure. */
  consult: card(
    "card-22-spine-consult",
    "A clinician pointing to a model of the spine while a patient beside him holds his lower back"
  ),
  /** Licenses — the shipping figure. */
  shipping: card(
    "card-20-shipping-box",
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
 * The files are named for the therapeutic areas they were shot for. The keys
 * cover both the ten Schedule A-1 slugs the formulary uses and the legacy
 * slugs the editorial catalogue in lib/data.ts still carries, so every
 * product resolves to a photograph whichever list it was filed under.
 *
 * The 2026 brand set (blue grounds, MediCraft-labelled vials) replaced the
 * Unsplash stills on 24 October 2026 under NEW file names: images are cached
 * for a day plus a week of stale-while-revalidate, so reusing a name would
 * have kept serving the old photo to returning visitors.
 */
export type CategoryMedia = Media & {
  /** Photographs fill the tile. Kept so a cut-out can be contained later. */
  fit: "cover" | "contain";
};

const category = (file: string, alt: string): CategoryMedia => ({
  src: `${CATEGORY}/category-${file}.webp`,
  width: 1200,
  height: 900,
  alt,
  fit: "cover",
});

const art = {
  weightManagement: category(
    "weight-management-2026",
    "Bare feet on a white bathroom scale between two white dumbbells on a blue ground"
  ),
  hormoneTherapy: category(
    "hrt",
    "A woman in white resting in a blue armchair with a hand to her forehead, cooling herself with a fan"
  ),
  mensHealth: category(
    "trt",
    "A man with a muscular torso giving himself an injection at the waist with a syringe"
  ),
  sexualWellness: category(
    "sexual-health",
    "A smiling woman holding a banana beside a bed made up in blue and white"
  ),
  hairLoss: category(
    "hair-loss",
    "A woman holding a hairbrush in one hand and a clump of shed hair in the other palm"
  ),
  painManagement: category(
    "pain-management-2026",
    "A man holding his lower back while a clinician points to a model of the spine on the desk"
  ),
  dermatology: category(
    "skin-care",
    "White pump bottles, a dropper bottle, a tube and a jar of cream on a stone plinth against a blue ground"
  ),
  vitalityLongevity: category(
    "wellness-vitality",
    "A woman doing a squat holding two blue dumbbells in a bright studio"
  ),
  longevity: category(
    "wellness-longevity",
    "An older couple dressed in white walking hand in hand along a sunny street"
  ),
  ivTherapy: category(
    "iv-therapy-2026",
    "Gloved hands measuring a syringe inside a laminar-flow hood beside IV bags and vials"
  ),
  supplies: category(
    "supplies",
    "A row of blue-capped MediCraft vials, one lying on its side, on a white surface"
  ),
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
  "wellness-vitality": art.vitalityLongevity,
  "wellness-longevity": art.longevity,
  supplies: art.supplies,
  // Legacy editorial slugs
  "hormone-therapy": art.hormoneTherapy,
  "mens-health": art.mensHealth,
  "sexual-wellness": art.sexualWellness,
  "womens-health": art.hairLoss,
  dermatology: art.dermatology,
  "vitality-longevity": art.vitalityLongevity,
  "peptide-therapy": art.longevity,
  "iv-therapy": art.ivTherapy,
  "custom-formulations": art.customFormulations,
};

/** A category's image, or the custom-formulations one for a new category. */
export function categoryImage(slug: string): CategoryMedia {
  return categoryMedia[slug] ?? art.customFormulations;
}

/** Delivery-method cards on /compounding, keyed by title. 4:3. */
export const deliveryMedia: Record<string, Media> = {
  Injectables: card(
    "card-17-vial-in-glove",
    "A gloved hand holding a small MediCraft vial up against a blue ground"
  ),
  "Topical Creams & Gels": art.dermatology,
  "Oral Capsules & Tablets": card(
    "card-18-capsule-filler",
    "A technician in white gloves operating a manual capsule-filling machine on a steel bench"
  ),
  "Nasal Sprays": card("card-02-lab-glassware", "Shelves of clear laboratory glassware and reagent bottles"),
  "Troches & Sublingual": card(
    "card-19-mortar-and-vial",
    "A gloved hand setting down a MediCraft vial beside a mortar and pestle and a measuring cylinder"
  ),
  "IV Solutions": art.ivTherapy,
};

/** Facility & automation cards on /quality, keyed by title. 4:3. */
export const automationMedia: Record<string, Media> = {
  "Automated Cleanroom Cleaning Systems": card(
    "card-13-cleanroom-cleaning",
    "A worker in a white protective suit and respirator wiping down a glass laboratory door"
  ),
  "Automated Vial Crimping Machines": card(
    "card-14-vial-line",
    "Blue-capped vials moving along a curved filling and capping line"
  ),
  "Environmental Monitoring Technology": art.ivTherapy,
  "Video-Verified Fulfillment": card(
    "card-20-shipping-box",
    "A navy MediCraft shipping box and a single vial on a white and blue surface"
  ),
};
