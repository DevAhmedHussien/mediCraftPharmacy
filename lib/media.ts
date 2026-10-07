/* ===========================================================================
   Imagery manifest — the art-direction brief, encoded.


   UPDATE — RENDERED BRAND IMAGERY IS NOW IN THE SLOTS
   ---------------------------------------------------
   The `media` map below carries 3D renderings built from MediCraft's own
   assets: the vector lockup in components/brand/Logo.tsx, the label system
   from the Window Perspective deck, and the catalog in lib/data.ts. They are
   not photographs and not stock. Products carry labels generated from their
   own catalog entries; the facility scenes are brand illustrations of how a
   MediCraft space is designed to look, not a record of 4190 Corporate Ct.
   Section 6's concern still applies to the facility scenes — when the Phase 2
   shoot lands, replace `lab`, `labPlate`, `storefront`, `storefrontFront` and
   `storefrontEntrance` with the real frames (same ratios, same keys) so nothing
   a prescriber tours contradicts the site. The storefront set is path-traced
   and photographic in finish, which makes that swap more important, not less;
   until then every alt text says "Rendering".
   The shot list below remains the brief for that shoot.

   This file is the bridge between the photography brief ("MediCraft Pharmacy —
   Website Imagery & Art Direction Brief", v1.0, August 2026) and the build. It
   lists every image slot on the site with its ratio, delivered size, priority
   and the exact frame the brief specifies, so whoever runs the shoot can work
   from the codebase and dropping a finished asset in is a one-line change.

   WHY THERE ARE NO PHOTOGRAPHS ON THE SITE RIGHT NOW
   --------------------------------------------------
   Brief §6, verbatim: "Until Phase 2 is shot, do not fill hero and facility
   slots with stock cleanroom photography. A prescriber who tours the facility
   and finds it doesn't match the website has been given a reason to distrust
   everything else on it — including the compliance claims." Its ranked
   substitutes put "gradient + typography compositions in brand colors" first,
   and it closes: "An honest gradient beats a dishonest photograph."

   So the stock library that was here has been retired from the pages. Several
   of those files also broke the brief's own §1.5 "Never" list outright:

     cover-support.jpg    staff on headsets facing camera — the "stock team in a
                          bright office" register the brief rules out
     cover-refill.jpg     tablets spilled on saturated green — "pills spilling
                          out of a bottle", and the green fights the palette
     compounding-lab.webp a clinician with a stethoscope — stethoscopes are on
                          the Never list, and it is not a lab at all
     cover-licenses.jpg   a stock US map — §4.14 bans this explicitly and
                          requires a component instead (now components/sections/
                          CoverageMap.tsx)
     cover-providers.jpg  dispensary shelving that reads retail-pharmacy
     careers-team.jpg     same

   THOSE FILES ARE NOW DELETED — 1.2 MB of stock nothing referenced, that the
   brief forbids using, shipping in every image and slowing every build. Git
   history has them if a decision is reversed; this list stays because it
   records WHY each was rejected, which is the part worth keeping.

   HOW TO PUT A REAL PHOTOGRAPH IN
   -------------------------------
   1. Deliver to the naming convention in §3.1:
        mc-[section]-[subject]-[ratio]-[1x|2x].webp
   2. Add it to `media` below with its intrinsic size and real alt text.
   3. Swap the slot's <GradientPlate> for <Figure media={media.yourKey} />.
      The ratios already match the brief's §3.2 table, so nothing reflows.

   The <AmbientVideo> component and its `heroVideo` config were removed: the
   hero now carries a rendering, the config pointed at an empty src, and a
   component nothing renders is a component nobody maintains. The hero's scrim
   and safe-area geometry still suit moving footage if it is ever shot.
   ========================================================================= */

export type Media = {
  src: string;
  width: number;
  height: number;
  /**
   * Brief §3.1: "Supplied by designer for every image, descriptive and specific
   * — not 'pharmacy'." Describe what is depicted, never repeat the heading, and
   * never editorialise ("world-class facility").
   */
  alt: string;
};

/* The shot list that used to live here as an exported `shotList` array is now
   the header comment above and nothing else. It was 110 lines of data that no
   component ever read — a brief for a photographer, shipped to every visitor's
   browser as a runtime value. The brief belongs in the repo; it does not
   belong in a bundle. Recover it from git history when the Phase 2 shoot is
   commissioned. */

/**
 * Rendered imagery, keyed for use in components. Sizes are intrinsic pixels;
 * files follow the §3.1 naming convention and live in public/images/site/.
 */
const R = "/images/site";

export const media = {
  /**
   * Home hero — the injectable line, cut out on transparency.
   *
   * The original render baked a navy gradient and a floor reflection into the
   * frame, so the hero had to mask the image into its own background to hide
   * the seam. That is what made the product read as a faded panel off to one
   * side rather than part of the page. This is the same render with the
   * background removed, so it sits directly on the hero ground and the layout
   * can place it instead of hiding its edges.
   */
  homeHero: {
    src: `${R}/mc-home-hero-vials-cutout.webp`,
    width: 1112,
    height: 884,
    alt: "Rendering of MediCraft Pharmacy injectable vials — semaglutide, tirzepatide, NAD+ and glutathione — in labelled multiple-dose vials",
  },
  /** Formulary / category heroes — one of each dosage form. */
  formulary: {
    src: `${R}/mc-hero-formulary.webp`,
    width: 1600,
    height: 900,
    alt: "Test tubes and conical flasks holding coloured solutions on a laboratory bench, beside an open notebook",
  },
  /** Sterile compounding room — about / quality / careers heroes. */
  lab: {
    src: `${R}/mc-hero-quality.webp`,
    width: 1600,
    height: 900,
    alt: "A rack of sealed vials on a laboratory bench beside a monitor showing batch data",
  },
  /** A laboratory bench run, 3:2, for the home page's "Who we are" column. */
  labPlate: {
    src: `${R}/mc-hero-labplate.webp`,
    width: 1600,
    height: 900,
    alt: "A laboratory bench run with conical flasks, reagent bottles and shelving under daylight",
  },
  /** Storefront at blue hour, three-quarter — about hero. Path-traced; subject in the right half. */
  storefront: {
    src: `${R}/mc-contact-storefront-16x9-2x.webp`,
    width: 2560,
    height: 1440,
    alt: "Rendering of a MediCraft Pharmacy storefront at blue hour: an illuminated MediCraft channel-letter sign and blade sign above cyan-framed glazing onto a lit pharmacy interior, with rain-wet pavement in front",
  },
  /** Storefront straight-on at blue hour — contact / licenses heroes (brief: "straight-on or slight three-quarter"). */
  storefrontFront: {
    src: `${R}/mc-contact-storefront-front-16x9-2x.webp`,
    width: 2560,
    height: 1440,
    alt: "Rendering of a MediCraft Pharmacy storefront seen straight-on at blue hour: the illuminated MediCraft sign above a cyan-framed glass entrance and a lit pharmacy interior",
  },
  /** Entrance detail at blue hour — 4:3 panel, available for a Figure. */
  storefrontEntrance: {
    src: `${R}/mc-about-storefront-entrance-4x3-2x.webp`,
    width: 1600,
    height: 1200,
    alt: "Rendering of a MediCraft Pharmacy entrance at blue hour: the blade sign with the MediCraft mark, channel letters above a lit canopy, and the cyan portal frame around the glazing",
  },
  /** Reception — providers / support heroes. */
  reception: {
    src: `${R}/mc-hero-providers.webp`,
    width: 1171,
    height: 659,
    alt: "A pharmacist in a white coat counting capsules into their hand at a dispensing bench",
  },
  /** Inside the hood — compounding hero. */
  hood: {
    src: `${R}/mc-hero-hood.webp`,
    width: 841,
    height: 473,
    alt: "A pipette releasing a droplet above laboratory vials, over printed chemical structures",
  },
  /**
   * Chain of custody — the pack station with the overhead camera visibly in
   * frame. Brief §4.10 is blunt about why that detail decides the shot: "the
   * entire claim is 'we filmed it'. If the viewer cannot see the camera, the
   * claim is just text." The recording monitor carries the prescription
   * number, which is the other half of what makes footage evidential.
   */
  custody: {
    src: `${R}/mc-hero-custody.webp`,
    width: 1291,
    height: 726,
    alt: "Gloved hands lifting a tray of sealed samples from cold storage",
  },
  /** Quality — the documentary frame the brief asks for (§4, P2). */
  sopPlate: {
    src: `${R}/mc-quality-sop-binder-4x3-2x.webp`,
    width: 736,
    height: 552,
    alt: "A laboratory bench with a bound laboratory notebook open beside a pipette rack, reagent bottles and a vortex mixer",
  },
  /** Bench microscope and slide reader — a 4:3 panel for a quality Figure. */
  microscope: {
    src: `${R}/mc-quality-microscope-4x3-2x.webp`,
    width: 897,
    height: 673,
    alt: "A bench microscope beside a monitor displaying a stained slide at 100 micrometre scale, with prepared slides on the bench",
  },
  /** Glassware bench — a 4:3 panel for a compounding Figure. */
  bench: {
    src: `${R}/mc-compounding-bench-4x3-2x.webp`,
    width: 736,
    height: 552,
    alt: "A compounding bench with a volumetric flask, a burette on a stand, a rack of test tubes and an evaporating dish under a task lamp",
  },
  /** Who we are — the /about masthead. */
  aboutCover: {
    src: `${R}/mc-hero-about.webp`,
    width: 1600,
    height: 900,
    alt: "Three scientists in white coats and safety glasses working at a laboratory bench beside data displays",
  },
  /** The act of compounding — the /compounding masthead. */
  compoundingCover: {
    src: `${R}/mc-hero-compounding.webp`,
    width: 1600,
    height: 900,
    alt: "A distillation apparatus on a stand beside conical flasks of solution on a laboratory bench",
  },
  /** Reaching us — the /contact masthead. */
  contactCover: {
    src: `${R}/mc-hero-contact.webp`,
    width: 862,
    height: 485,
    alt: "Conical flasks, volumetric flasks and pipettes arranged on a clean laboratory bench",
  },
  /**
   * State coverage — the /licenses masthead.
   *
   * Its own slot rather than the storefront one it used to share: /contact
   * still wants the building, because that page is about where to find it.
   */
  licensesCover: {
    src: `${R}/mc-hero-licenses.webp`,
    width: 1488,
    height: 837,
    alt: "A tray of sealed glass vials with a syringe on a stainless laboratory bench",
  },
  /** People at work — careers. */
  team: {
    src: `${R}/mc-careers-team-4x3-2x.webp`,
    width: 736,
    height: 552,
    alt: "A pharmacist in a white coat at a laboratory bench lined with wash bottles and glassware",
  },
} satisfies Record<string, Media>;

const card = (file: string, alt: string, width = 1200, height = 900): Media => ({
  src: `${R}/${file}`,
  width,
  height,
  alt,
});

/** Therapeutic-area cards, keyed by the card's href. 4:3. */
export const areaMedia: Record<string, Media> = {
  "/products/weight-management": card("mc-area-weight-management-4x3-2x.webp", "MediCraft semaglutide and tirzepatide flex-dose vials"),
  "/products/hormone-therapy": card("mc-area-hormone-therapy-4x3-2x.webp", "MediCraft testosterone cypionate and HCG vials beside an estradiol / progesterone cream pump"),
  "/products/peptide-therapy": card("mc-area-peptide-therapy-4x3-2x.webp", "MediCraft BPC-157, sermorelin and PT-141 vials"),
  "/products/dermatology": card("mc-area-dermatology-4x3-2x.webp", "MediCraft tretinoin combination and hair restoration airless pumps"),
  "/products/pain-management": card("mc-area-pain-management-4x3-2x.webp", "A MediCraft custom-formulation pump and vial, compounded to prescription"),
  "/products/vitality-longevity": card("mc-area-vitality-longevity-4x3-2x.webp", "MediCraft glutathione, Myers' Cocktail and NAD+ vials"),
};

/** Delivery-method cards on /compounding, keyed by title. 4:3. */
export const deliveryMedia: Record<string, Media> = {
  Injectables: card("mc-delivery-injectables-4x3-2x.webp", "A MediCraft injectable vial with an insulin syringe"),
  "Topical Creams & Gels": card("mc-delivery-topicals-4x3-2x.webp", "Two MediCraft airless cream pumps"),
  "Oral Capsules & Tablets": card("mc-delivery-oral-4x3-2x.webp", "A MediCraft amber Rx bottle with loose capsules"),
  "Nasal Sprays": card("mc-delivery-nasal-4x3-2x.webp", "A MediCraft metered-dose nasal spray bottle"),
  "Troches & Sublingual": card("mc-delivery-troches-4x3-2x.webp", "A MediCraft troche blister card with loose troches"),
  "IV Solutions": card("mc-delivery-iv-4x3-2x.webp", "A MediCraft IV admixture bag beside a 30 mL glutathione vial"),
};

/** Facility & automation cards on /quality, keyed by title. 16:10. */
export const automationMedia: Record<string, Media> = {
  "Automated Cleanroom Cleaning Systems": card("mc-quality-auto-cleaning-16x10-2x.webp", "Rendering of a cleanroom floor-cleaning robot with a cyan status ring", 1200, 750),
  "Automated Vial Crimping Machines": card("mc-quality-auto-crimping-16x10-2x.webp", "Rendering of an automated vial crimper sealing a MediCraft vial, with crimped vials on a tray", 1200, 750),
  "Environmental Monitoring Technology": card("mc-quality-auto-monitoring-16x10-2x.webp", "Rendering of an environmental monitoring display showing particle count, temperature, humidity and pressure differential beside a particle counter", 1200, 750),
  "Video-Verified Fulfillment": card("mc-quality-auto-fulfillment-16x10-2x.webp", "Rendering of a pack station with an overhead camera filming a cold-chain shipper of MediCraft vials", 1200, 750),
};

/**
 * A square thumbnail for a product category, for the Products menu.
 *
 * Six categories have their own therapeutic-area artwork; the other five that
 * carry products do not. Rather than show a thumbnail on some rows and a gap on
 * the rest, those fall back to the packshot of their first product — which is
 * the right image anyway: it is that category's own container wearing its own
 * label, not a stand-in.
 *
 * Returns null only when a category has neither, which is a category with no
 * products in it. The menu renders those without a thumbnail.
 */
export type CategoryThumb = {
  src: string;
  alt: string;
  /**
   * How to seat the image in its tile. The area artwork is a full photograph
   * and fills the tile; the packshots are cut out on transparency, so they are
   * contained on the tile's own ground instead of being cropped into it.
   */
  fit: "cover" | "contain";
};

export function categoryThumb(
  slug: string,
  firstProductSlug: string | undefined,
  firstProductName: string | undefined
): CategoryThumb | null {
  const area = areaMedia[`/products/${slug}`];
  if (area) return { src: area.src, alt: area.alt, fit: "cover" };
  if (firstProductSlug) {
    return {
      src: `/images/products/${firstProductSlug}.webp`,
      alt: firstProductName ?? "",
      fit: "contain",
    };
  }
  return null;
}
