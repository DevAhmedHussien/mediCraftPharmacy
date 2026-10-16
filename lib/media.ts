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
    "card-01-sterile-testing",
    "A gowned technician using a touchscreen instrument at a cleanroom bench of testing equipment"
  ),
  /** Quality — the sourcing figure. */
  microscope: card(
    "card-05-lab-equipment",
    "A gloved hand placing a sample on a laboratory instrument with a digital display"
  ),
  /** Providers — the onboarding figure. */
  consult: card(
    "card-03-clinical-consult",
    "A pharmacist in a white coat explaining a prescription bottle to a patient at a pharmacy counter"
  ),
  /** Licenses — the shipping figure. */
  shipping: card(
    "card-08-pharmacy-shelves",
    "A pharmacist in a white coat checking a package between rows of pharmacy shelving"
  ),
  /** Login — the tall aside. */
  login: hero(
    "hero-04-about",
    "A cleanroom seen through an observation window, with a gowned technician working at a bench in the next room"
  ),
} satisfies Record<string, Media>;

/**
 * Formulary category images.
 *
 * The files are named for the therapeutic areas they were shot for. The keys
 * cover both the ten Schedule A-1 slugs the formulary uses and the legacy
 * slugs the editorial catalogue in lib/data.ts still carries, so every
 * product resolves to a photograph whichever list it was filed under.
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
  weightManagement: category("weight-management", "Rows of sealed sample vials in a white laboratory rack"),
  hormoneTherapy: category("hormone-therapy", "A clear jar of blue and white capsules on a pale grey surface"),
  mensHealth: category("mens-health", "White tablets scattered across a blue surface"),
  sexualWellness: category("sexual-wellness", "White capsules in a round dish between two green leaves"),
  womensHealth: category("womens-health", "Two overlapping discs of clear and golden serum on a blush surface"),
  painManagement: category("pain-management", "A white bottle standing in folds of brown linen"),
  dermatology: category("dermatology", "A swatch of white cream on a peach surface"),
  vitalityLongevity: category("vitality-longevity", "Discs of oil, serum and cream beside green leaves on a blush surface"),
  peptideTherapy: category("peptide-therapy", "A white molecular model against a pale grey ground"),
  ivTherapy: category("iv-therapy", "An IV bag and drip chamber hanging from a stand"),
  customFormulations: category("custom-formulations", "A pipette tip above a rack of clear sample tubes"),
};

export const categoryMedia: Record<string, CategoryMedia> = {
  // Schedule A-1
  "weight-management": art.weightManagement,
  hrt: art.hormoneTherapy,
  trt: art.mensHealth,
  "sexual-health": art.sexualWellness,
  "hair-loss": art.womensHealth,
  "pain-management": art.painManagement,
  "skin-care": art.dermatology,
  "wellness-vitality": art.vitalityLongevity,
  "wellness-longevity": art.peptideTherapy,
  supplies: art.customFormulations,
  // Legacy editorial slugs
  "hormone-therapy": art.hormoneTherapy,
  "mens-health": art.mensHealth,
  "sexual-wellness": art.sexualWellness,
  "womens-health": art.womensHealth,
  dermatology: art.dermatology,
  "vitality-longevity": art.vitalityLongevity,
  "peptide-therapy": art.peptideTherapy,
  "iv-therapy": art.ivTherapy,
  "custom-formulations": art.customFormulations,
};

/** A category's image, or the custom-formulations one for a new category. */
export function categoryImage(slug: string): CategoryMedia {
  return categoryMedia[slug] ?? art.customFormulations;
}

/** Delivery-method cards on /compounding, keyed by title. 4:3. */
export const deliveryMedia: Record<string, Media> = {
  Injectables: card("card-04-vials", "Glass vials, ampoules and an infusion bottle lit against a dark ground"),
  "Topical Creams & Gels": art.dermatology,
  "Oral Capsules & Tablets": art.hormoneTherapy,
  "Nasal Sprays": card("card-02-lab-glassware", "Shelves of clear laboratory glassware and reagent bottles"),
  "Troches & Sublingual": art.sexualWellness,
  "IV Solutions": art.ivTherapy,
};

/** Facility & automation cards on /quality, keyed by title. 4:3. */
export const automationMedia: Record<string, Media> = {
  "Automated Cleanroom Cleaning Systems": card(
    "card-07-cleanroom-passthrough",
    "A gowned technician passing an instrument through a stainless cleanroom cabinet"
  ),
  "Automated Vial Crimping Machines": card(
    "card-04-vials",
    "Glass vials, ampoules and an infusion bottle lit against a dark ground"
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
