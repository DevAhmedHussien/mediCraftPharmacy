/* ===========================================================================
   Imagery manifest — every image slot on the site, in one place.

   THE CURRENT SET IS LICENSED STOCK
   ---------------------------------
   The renders and brand stills that used to fill these slots have been
   removed. Every photograph below is from Unsplash (free for commercial use,
   no attribution required), pre-cropped to one of three sizes and served as
   WebP:

     public/images/hero/        1920x1080 (16:9) page heroes
     public/images/cards/       1200x900  (4:3) cards and section figures
     public/images/categories/  1200x900  (4:3) one per formulary category
     public/images/portrait/    1024x1536 (2:3) the login aside
     public/videos/             the home hero loop, WebM + MP4

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
    "hero-01-home",
    "Two technicians in cleanroom gowns, masks and goggles reviewing a tablet beside a bench of culture plates"
  ),
  /** /products masthead. */
  formulary: hero(
    "hero-10-blog",
    "A gloved hand placing a sample on a laboratory instrument with a digital display"
  ),
  /** /quality masthead. */
  lab: hero(
    "hero-02-quality",
    "A gowned technician holding a tablet beside a stainless pass-through cabinet in a cleanroom"
  ),
  /** /compounding masthead. */
  compoundingCover: hero(
    "hero-03-compounding",
    "A gloved hand pipetting into one of a tray of amber glass vials"
  ),
  /** /about masthead. */
  aboutCover: hero(
    "hero-04-about",
    "A cleanroom seen through an observation window, with a gowned technician working at a bench in the next room"
  ),
  /** /providers and /work-with-us mastheads. */
  reception: hero(
    "hero-05-providers",
    "A pharmacist in a white coat taking a box from a stocked pharmacy shelf"
  ),
  /** /licenses masthead. */
  licensesCover: hero(
    "hero-06-state-coverage",
    "A gowned technician opening the door of a stainless pass-through cabinet in a cleanroom"
  ),
  /** /contact masthead. */
  contactCover: hero(
    "hero-07-contact",
    "A gowned technician handling culture plates at a cleanroom bench beside a blue door"
  ),
  /** /careers masthead. */
  careersCover: hero(
    "hero-08-careers",
    "Two scientists in lab coats and blue gloves working at computer workstations in a laboratory"
  ),
  /** /support masthead. */
  supportCover: hero(
    "hero-09-refill",
    "A pharmacist in a white coat reaching for a box on a pharmacy shelf"
  ),

  /** About — the facility panel. */
  facilityPanel: card(
    "card-09-team-cleanroom",
    "Two technicians in cleanroom gowns reviewing a tablet together beside a bench of culture plates"
  ),
  /** Quality — chain of custody; also the navbar's pharmacy promo. */
  custody: card(
    "card-08-pharmacy-shelves",
    "A pharmacist in a white coat checking a package between rows of pharmacy shelving"
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
    "card-03-clinical-consult",
    "A pharmacist in a white coat explaining a prescription bottle to a patient at a pharmacy counter"
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
 * The home hero loop: a scientist at a microscope (Pexels 4121322, free for
 * commercial use — stock, so never captioned as MediCraft's lab).
 *
 * 11 s at 1280x720, no audio, the last second crossfaded into the first so
 * the loop has no seam. VP9 WebM first (442 KB), H.264 MP4 for Safari before
 * 16 (586 KB, faststart). The source was a 24 s, 4.6 MB 1080p file.
 */
export const heroVideo = {
  webm: "/videos/hero-lab-microscope-720.webm",
  mp4: "/videos/hero-lab-microscope-720.mp4",
} as const;

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
 * have kept serving the old photo to returning visitors. Skin care and IV
 * therapy have no brand shot yet and still use the stock files.
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
  dermatology: category("dermatology", "A swatch of white cream on a peach surface"),
  vitalityLongevity: category(
    "wellness-vitality",
    "A woman doing a squat holding two blue dumbbells in a bright studio"
  ),
  longevity: category(
    "wellness-longevity",
    "An older couple dressed in white walking hand in hand along a sunny street"
  ),
  ivTherapy: category("iv-therapy", "An IV bag and drip chamber hanging from a stand"),
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
  "Environmental Monitoring Technology": card(
    "card-10-environment-monitoring",
    "A gowned technician logging culture plates on a touchscreen at a cleanroom bench"
  ),
  "Video-Verified Fulfillment": card(
    "card-11-pharmacist-review",
    "A pharmacist in a white coat reviewing a box taken from a pharmacy shelf"
  ),
};
