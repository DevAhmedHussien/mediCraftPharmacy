/* ===========================================================================
   Imagery manifest — the art-direction brief, encoded.

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

   The files are still on disk; nothing references them. Delete them once the
   real shoot lands, or keep them out of the build as they are.

   HOW TO PUT A REAL PHOTOGRAPH IN
   -------------------------------
   1. Deliver to the naming convention in §3.1:
        mc-[section]-[subject]-[ratio]-[1x|2x].webp
   2. Add it to `media` below with its intrinsic size and real alt text.
   3. Swap the slot's <GradientPlate> for <Figure media={media.yourKey} />.
      The ratios already match the brief's §3.2 table, so nothing reflows.

   The <AmbientVideo> component and `heroVideo` below are kept wired for the
   same reason — the hero's scrim and safe-area geometry are already built for
   moving footage.
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

/** Shoot phase. §6 splits the work around cleanroom certification. */
type Phase = 1 | 2;

/** §4 priority key: P1 required for launch, P2 strongly recommended, P3 nice to have. */
type Priority = "P1" | "P2" | "P3";

export type Slot = {
  /** Where it appears. */
  where: string;
  ratio: string;
  /** Delivered size at @2x, from §3.2. */
  size: string;
  priority: Priority;
  phase: Phase;
  /** The frame, condensed from §4. */
  shot: string;
  /** Anything in §2 that bites specifically here. */
  compliance?: string;
};

/**
 * The shot list. Ordered by priority, then by page.
 *
 * Every entry currently renders as a <GradientPlate> or a drawn component. None
 * is a stock photograph.
 */
export const shotList: Slot[] = [
  {
    where: "Home hero — full-bleed background",
    ratio: "16:9 cropping to 21:9",
    size: "3840 × 2160",
    priority: "P1",
    phase: 2,
    shot: "A gowned compounder's gloved hands working under the laminar airflow hood, mid-action, drawing into a syringe. Three-quarter rear/side angle so focused posture reads without the face dominating. f/5.6 so hands and hood architecture both read.",
    compliance:
      "Full aseptic garb, no exposed wrist, no first-air obstruction staged for composition (§2.3, §2.4). Subject must sit in the right third — the left 60% carries the headline. Must survive a navy gradient at 70–85%.",
  },
  {
    where: "About — 'Who We Are' two-column",
    ratio: "4:3",
    size: "1600 × 1200",
    priority: "P1",
    phase: 2,
    shot: "Cleanroom environmental wide: anteroom or buffer-room doorway looking through into the classified space, one gowned figure small in frame, architecture dominant. 24–35mm at f/8–f/11, camera dead level.",
    compliance:
      "Look for the credibility objects an inspector-literate viewer reads instantly: stainless, epoxy floor coving, HEPA ceiling grid, pass-through chambers, pressure-differential gauge.",
  },
  {
    where: "Quality — leadership team portraits (6)",
    ratio: "1:1",
    size: "800 × 800",
    priority: "P1",
    phase: 1,
    shot: "Chest-up square crop, eyes on the upper third, body turned ~15°, face to camera, composed and not smiling. Facility behind at f/2.8 bokeh — not a seamless studio backdrop. One matched grade across all six.",
    compliance:
      "Signed model release from every identifiable person (§2.7). If someone declines, use a matched-style silhouette — never mix a photograph with an icon in the same row.",
  },
  {
    where: "Quality — chain of custody panel",
    ratio: "4:3",
    size: "1600 × 1200",
    priority: "P1",
    phase: 2,
    shot: "Packing station from a slightly elevated three-quarter angle WITH THE OVERHEAD CAMERA VISIBLY IN FRAME, its mount and lens catching light. A gowned tech's hands in the packing tray below.",
    compliance:
      "The camera is the point: 'if the viewer cannot see the camera, the claim is just text.' No readable label data, no PHI on any monitor, check reflections in glass and stainless (§2.1, §2.2).",
  },
  {
    where: "Providers — partnership two-column",
    ratio: "4:3",
    size: "1600 × 1200",
    priority: "P1",
    phase: 1,
    shot: "A pharmacist and a clinician mid-discussion over a formulation document or tablet, neither looking at camera. The one place a genuine two-person image is necessary.",
    compliance: "Must read as a working conversation. Not a handshake.",
  },
  {
    where: "State coverage — licensure map",
    ratio: "n/a — component",
    size: "vector",
    priority: "P1",
    phase: 1,
    shot: "Not photography. A data-driven SVG the team can update without a designer. Built: components/sections/CoverageMap.tsx, driven by lib/coverage.ts.",
    compliance: "No stock US map (§4.14).",
  },
  {
    where: "Quality — 'Quality Is Built Into Our DNA' banner",
    ratio: "1:1 or 4:5",
    size: "1400 × 1400",
    priority: "P2",
    phase: 1,
    shot: "Macro of a gloved hand initialing a batch record, or a bound SOP volume open on stainless with a pen resting on it. 85–100mm at f/2.8, top-down or steep three-quarter. Quality in compounding is documentary — paper, signatures, timestamps. Not beakers.",
    compliance: "Document text must be illegible or a purpose-made dummy form.",
  },
  {
    where: "Quality — automation cards (4)",
    ratio: "16:10",
    size: "1200 × 750",
    priority: "P2",
    phase: 1,
    shot: "One frame per card, matched lens/angle/grade so the four read as a set: cleaning equipment mid-cycle low along the floor; macro on the crimping head closing a seal (the most photogenic equipment in the building); an EM display with LED readouts in focus, aqua LEDs as the accent; the packing camera.",
  },
  {
    where: "Quality — API & raw material sourcing",
    ratio: "4:3",
    size: "1600 × 1200",
    priority: "P2",
    phase: 1,
    shot: "Sealed API containers on a quarantine shelf with QC status labels, or a gloved hand comparing a Certificate of Analysis against a container label.",
    compliance: "Dummy label text only. No branded manufacturer cartons (§2.5).",
  },
  {
    where: "State coverage — shipping two-column",
    ratio: "4:3",
    size: "1600 × 1200",
    priority: "P2",
    phase: 1,
    shot: "A validated cold-chain shipper, open mid-pack: gel packs, insulated liner, temperature indicator strip in frame, shot slightly overhead. Show the engineering — cold chain is the prescriber's biggest anxiety.",
    compliance: "Avoid delivery trucks, generic cardboard, maps with dotted flight paths.",
  },
  {
    where: "Providers / Home — therapeutic area cards (6)",
    ratio: "1:1",
    size: "600 × 600",
    priority: "P2",
    phase: 1,
    shot: "Abstract macro over literal: six matched plates of formulation states — a viscous gel drawing a peak, a solution's meniscus, a cream's surface texture, a lyophilised powder, a suspension mid-swirl. 100mm macro, single hard raking light, f/8, focus-stacked.",
    compliance:
      "Do not photograph body parts or patient stand-ins. Literal category imagery drops the site from clinical to consumer-wellness and creates model-release and implied-claim problems.",
  },
  {
    where: "Compounding — delivery method cards (6)",
    ratio: "1:1",
    size: "600 × 600",
    priority: "P2",
    phase: 1,
    shot: "Six dosage-form shots in one session, one setup: 85mm, f/8, three-quarter elevated, cool-grey or navy seamless surface, soft top light, one narrow specular per object. Consistency across the six matters more than any single frame.",
    compliance: "All containers unlabelled or dummy-labelled (§2.5).",
  },
  {
    where: "Contact — facility exterior",
    ratio: "16:9",
    size: "2400 × 1350",
    priority: "P2",
    phase: 2,
    shot: "4190 Corporate Ct at blue hour, interior lights on, straight-on or slight three-quarter. Blue hour reads brand-navy for free.",
    compliance:
      "Property release from the landlord (Two Red Roses Foundation) if the exterior is featured (§2.8). Never shoot at midday.",
  },
];

/**
 * Delivered photography, keyed for use in components.
 *
 * Empty by design — see the header. Add entries as the shoot lands:
 *
 *   hoodHands: {
 *     src: "/images/site/mc-hero-hood-16x9-2x.webp",
 *     width: 3840, height: 2160,
 *     alt: "Gowned compounder drawing a solution into a syringe inside a laminar airflow hood",
 *   },
 */
export const media = {} satisfies Record<string, Media>;

/**
 * The hero's ambient clip, once shot.
 *
 * The <AmbientVideo> component stays in the tree unused: it already handles
 * autoplay policy (muted, inline, metadata preload) and swaps to a poster still
 * for anyone who has asked for reduced motion. Point `src` and `poster` at the
 * Phase 2 footage and restore the layer in components/sections/Hero.tsx.
 *
 * Compression targets from §3.1: hero ≤ 250KB, panel ≤ 150KB, card ≤ 80KB,
 * portrait ≤ 60KB. WebP primary, JPEG fallback, @1x and @2x for every slot.
 */
export const heroVideo = {
  src: "",
  poster: "",
  width: 1280,
  height: 720,
  description:
    "Gowned compounder's gloved hands working under the laminar airflow hood",
};
