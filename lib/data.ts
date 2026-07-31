import {
  FlaskConical,
  Stethoscope,
  ShieldCheck,
  Sparkles,
  Layers,
  Cpu,
  type LucideIcon,
} from "lucide-react";
import { SpeedGaugeIcon, UserIcon } from "@/components/icons";

export const highlights = [
  {
    icon: FlaskConical,
    title: "Custom Compounding",
    body: "Formulations tailored to each patient's dose, allergies, and delivery preference — made in-house by licensed pharmacists.",
  },
  {
    icon: SpeedGaugeIcon,
    title: "Fast Turnaround",
    body: "Most prescriptions compounded and shipped within 24–48 hours, with real-time status updates end to end.",
  },
  {
    icon: UserIcon,
    title: "Human Support",
    body: "A dedicated care team that answers on the first ring — no phone trees, no waiting on hold.",
  },
  {
    icon: Stethoscope,
    title: "Clinical Backing",
    body: "Board-certified consultants partner with your provider to fine-tune therapy and monitor outcomes.",
  },
];

/* ---------------------------------------------------------------------------
 * Product catalog
 * Categories mirror the Hallandale therapeutic areas. Each product carries a
 * `categorySlug` so the catalog and per-category pages can filter cleanly.
 * ------------------------------------------------------------------------- */

export type Category = {
  slug: string;
  name: string;
  blurb: string;
};

/** Spec-sheet fields rendered on a product detail page. */
export type ProductDetail = {
  productId: string;
  brand: string;
  size: string;
  appearance: string;
  packaging: string;
  schedule: string;
  route: string;
  activeIngredients: string[];
  inactiveIngredients: string[];
  description: string;
  directions: string;
};

export type Product = {
  /** URL segment for /product/[slug] — derived from name + form + strength. */
  slug: string;
  name: string;
  categorySlug: string;
  category: string;
  doses: string;
  form: string;
  blurb: string;
  image: string;
  detail: ProductDetail;
};

/** Catalog entry before slug/detail derivation. */
type RawProduct = Omit<Product, "slug" | "detail">;

export const categories: Category[] = [
  {
    slug: "weight-management",
    name: "Weight Management",
    blurb: "GLP-1 and dual-agonist therapies compounded to titration-friendly strengths.",
  },
  {
    slug: "hormone-replacement",
    name: "Hormone Replacement",
    blurb: "Bio-identical hormone support dialed to lab-guided targets.",
  },
  {
    slug: "womens-health",
    name: "Women's Health",
    blurb: "Custom therapies for hormonal balance, wellness, and vitality.",
  },
  {
    slug: "mens-health",
    name: "Men's Health",
    blurb: "Testosterone, performance, and preventative formulations for men.",
  },
  {
    slug: "sexual-wellness",
    name: "Sexual Wellness",
    blurb: "Discreet, effective compounded options for intimacy and confidence.",
  },
  {
    slug: "dermatology",
    name: "Dermatology",
    blurb: "Combination topicals for acne, pigmentation, and hair restoration.",
  },
  {
    slug: "peptide-therapy",
    name: "Peptide Therapy",
    blurb: "Research-informed peptides for recovery, longevity, and repair.",
  },
  {
    slug: "iv-therapy",
    name: "IV Therapy & Supplements",
    blurb: "Nutrient infusions and injectables to restore and replenish.",
  },
  {
    slug: "fertility",
    name: "Fertility",
    blurb: "Precision hormone support across every stage of the fertility journey.",
  },
  {
    slug: "vitality",
    name: "Vitality",
    blurb: "Energy, focus, and longevity protocols built around the individual.",
  },
  {
    slug: "ophthalmology",
    name: "Ophthalmology",
    blurb: "Sterile ophthalmic preparations compounded to exacting standards.",
  },
  {
    slug: "nausea",
    name: "Nausea",
    blurb: "Fast-acting anti-nausea formulations in patient-friendly forms.",
  },
  {
    slug: "custom-compound",
    name: "Custom Compound",
    blurb: "Anything not on the shelf — built to your provider's exact script.",
  },
];

/**
 * Product photography.
 *
 * The MediCraft vial render replaces the stock photos that used to stand in
 * here. Every dosage form currently points at the same file, so the whole
 * catalog shows real branded packaging instead of mismatched stock imagery.
 *
 * Note the render carries a specific label — "Semaglutide Injection DS,
 * Flex-Dose, Double Strength, 5 mg/mL, 3 mL multi-dose vial" — so products
 * other than that one display packaging that does not match their own contents.
 * To correct that, drop a render per form into
 * `public/images/products/` and repoint the keys below; nothing else needs to
 * change, because each catalog entry already references these keys by form.
 */
export const PRODUCT_IMAGE = {
  src: "/images/products/semaglutide-double-strength-flex-dose-3ml.webp",
  /** Intrinsic size of the render — required by next/image to reserve space. */
  width: 1257,
  height: 1600,
} as const;

const img = {
  vial: PRODUCT_IMAGE.src,
  syringe: PRODUCT_IMAGE.src,
  cream: PRODUCT_IMAGE.src,
  topical: PRODUCT_IMAGE.src,
  capsule: PRODUCT_IMAGE.src,
  drip: PRODUCT_IMAGE.src,
};

const rawProducts: RawProduct[] = [
  // Weight Management — flex-dose GLP-1 / dual-agonist line-up
  {
    name: "Semaglutide Double-Strength Flex-Dose 3 mL",
    categorySlug: "weight-management",
    category: "Weight Management",
    doses: "5 mg/mL",
    form: "Injectable",
    blurb: "Double-strength GLP-1 in a flexible 3 mL flex-dose vial.",
    image: img.vial,
  },
  {
    name: "Semaglutide Flex-Dose 4 mL",
    categorySlug: "weight-management",
    category: "Weight Management",
    doses: "2.5 mg/mL",
    form: "Injectable",
    blurb: "GLP-1 therapy in a 4 mL titration-friendly flex-dose vial.",
    image: img.vial,
  },
  {
    name: "Semaglutide Flex-Dose 3 mL",
    categorySlug: "weight-management",
    category: "Weight Management",
    doses: "2.5 mg/mL",
    form: "Injectable",
    blurb: "GLP-1 therapy in a 3 mL titration-friendly flex-dose vial.",
    image: img.vial,
  },
  {
    name: "Semaglutide Flex-Dose 2 mL",
    categorySlug: "weight-management",
    category: "Weight Management",
    doses: "2.5 mg/mL",
    form: "Injectable",
    blurb: "GLP-1 therapy in a 2 mL titration-friendly flex-dose vial.",
    image: img.vial,
  },
  {
    name: "Tirzepatide Forte Flex-Dose 4 mL",
    categorySlug: "weight-management",
    category: "Weight Management",
    doses: "15 mg/mL",
    form: "Injectable",
    blurb: "High-strength dual-agonist in a 4 mL flex-dose vial.",
    image: img.syringe,
  },
  {
    name: "Tirzepatide Flex-Dose 4 mL",
    categorySlug: "weight-management",
    category: "Weight Management",
    doses: "10 mg/mL",
    form: "Injectable",
    blurb: "Dual-agonist therapy in a 4 mL flex-dose vial.",
    image: img.syringe,
  },
  {
    name: "Tirzepatide Flex-Dose 3 mL",
    categorySlug: "weight-management",
    category: "Weight Management",
    doses: "10 mg/mL",
    form: "Injectable",
    blurb: "Dual-agonist therapy in a 3 mL flex-dose vial.",
    image: img.syringe,
  },
  {
    name: "Tirzepatide Flex-Dose 2 mL",
    categorySlug: "weight-management",
    category: "Weight Management",
    doses: "10 mg/mL",
    form: "Injectable",
    blurb: "Dual-agonist therapy in a 2 mL flex-dose vial.",
    image: img.syringe,
  },
  {
    name: "Tirzepatide Flex-Dose 1 mL",
    categorySlug: "weight-management",
    category: "Weight Management",
    doses: "10 mg/mL",
    form: "Injectable",
    blurb: "Dual-agonist therapy in a 1 mL flex-dose vial.",
    image: img.syringe,
  },
  // Hormone Replacement
  {
    name: "Estradiol / Progesterone",
    categorySlug: "hormone-replacement",
    category: "Hormone Replacement",
    doses: "Patient-specific",
    form: "Cream, capsule, troche",
    blurb: "Bio-identical hormone support, dialed to lab-guided targets.",
    image: img.cream,
  },
  {
    name: "Testosterone Cypionate",
    categorySlug: "hormone-replacement",
    category: "Hormone Replacement",
    doses: "50 – 200 mg/mL",
    form: "Intramuscular injection",
    blurb: "Consistent, precision-dosed testosterone replacement.",
    image: img.vial,
  },
  {
    name: "DHEA",
    categorySlug: "hormone-replacement",
    category: "Hormone Replacement",
    doses: "Custom",
    form: "Capsule",
    blurb: "Adrenal hormone support tuned to individual lab work.",
    image: img.capsule,
  },
  // Women's Health
  {
    name: "Compounded Progesterone",
    categorySlug: "womens-health",
    category: "Women's Health",
    doses: "Custom",
    form: "Troche, capsule",
    blurb: "Balanced hormonal support for cycle and menopausal care.",
    image: img.capsule,
  },
  {
    name: "Vaginal Estriol Cream",
    categorySlug: "womens-health",
    category: "Women's Health",
    doses: "Custom",
    form: "Topical cream",
    blurb: "Localized estrogen therapy for comfort and tissue health.",
    image: img.cream,
  },
  // Men's Health
  {
    name: "Enclomiphene",
    categorySlug: "mens-health",
    category: "Men's Health",
    doses: "12.5 – 25 mg",
    form: "Capsule",
    blurb: "Supports natural testosterone production and fertility.",
    image: img.capsule,
  },
  {
    name: "Tadalafil / Oxytocin Troche",
    categorySlug: "mens-health",
    category: "Men's Health",
    doses: "Custom",
    form: "Troche",
    blurb: "Combination therapy for performance and confidence.",
    image: img.capsule,
  },
  // Sexual Wellness
  {
    name: "PT-141 (Bremelanotide)",
    categorySlug: "sexual-wellness",
    category: "Sexual Wellness",
    doses: "Custom",
    form: "Subcutaneous injection",
    blurb: "Peptide therapy supporting libido for men and women.",
    image: img.syringe,
  },
  {
    name: "Scream Cream",
    categorySlug: "sexual-wellness",
    category: "Sexual Wellness",
    doses: "Custom",
    form: "Topical cream",
    blurb: "Multi-agent topical formulated for enhanced sensation.",
    image: img.cream,
  },
  // Dermatology
  {
    name: "Tretinoin Combination",
    categorySlug: "dermatology",
    category: "Dermatology",
    doses: "Custom",
    form: "Topical",
    blurb: "Combination topicals for acne, pigmentation, and texture.",
    image: img.topical,
  },
  {
    name: "Hair Restoration Blend",
    categorySlug: "dermatology",
    category: "Dermatology",
    doses: "Custom",
    form: "Topical / oral",
    blurb: "Minoxidil, finasteride, and biotin combinations for regrowth.",
    image: img.topical,
  },
  // Peptide Therapy
  {
    name: "BPC-157",
    categorySlug: "peptide-therapy",
    category: "Peptide Therapy",
    doses: "Custom",
    form: "Subcutaneous injection",
    blurb: "Peptide supporting tissue repair and recovery.",
    image: img.syringe,
  },
  {
    name: "Sermorelin",
    categorySlug: "peptide-therapy",
    category: "Peptide Therapy",
    doses: "Custom",
    form: "Subcutaneous injection",
    blurb: "Growth-hormone-releasing peptide for vitality and sleep.",
    image: img.syringe,
  },
  // IV Therapy & Supplements
  {
    name: "Glutathione Injection",
    categorySlug: "iv-therapy",
    category: "IV Therapy & Supplements",
    doses: "200 mg/mL",
    form: "IV / IM injection",
    blurb: "Master antioxidant infusion for detox and skin health.",
    image: img.drip,
  },
  {
    name: "Myers' Cocktail",
    categorySlug: "iv-therapy",
    category: "IV Therapy & Supplements",
    doses: "Custom",
    form: "IV infusion",
    blurb: "Classic vitamin and mineral blend for energy and recovery.",
    image: img.drip,
  },
  // Fertility
  {
    name: "HCG",
    categorySlug: "fertility",
    category: "Fertility",
    doses: "Custom",
    form: "Subcutaneous injection",
    blurb: "Hormone support across fertility and hormone protocols.",
    image: img.vial,
  },
  // Vitality
  {
    name: "NAD+ Injection",
    categorySlug: "vitality",
    category: "Vitality",
    doses: "Custom",
    form: "Subcutaneous / IV",
    blurb: "Cellular-energy coenzyme for longevity and focus.",
    image: img.drip,
  },
  // Ophthalmology
  {
    name: "Compounded Eye Drops",
    categorySlug: "ophthalmology",
    category: "Ophthalmology",
    doses: "Custom",
    form: "Sterile ophthalmic",
    blurb: "Preservative-free sterile drops compounded to spec.",
    image: img.vial,
  },
  // Nausea
  {
    name: "Ondansetron Troche",
    categorySlug: "nausea",
    category: "Nausea",
    doses: "4 – 8 mg",
    form: "Troche",
    blurb: "Fast-dissolving anti-nausea therapy, easy to take.",
    image: img.capsule,
  },
  // Custom Compound
  {
    name: "Custom Formulation",
    categorySlug: "custom-compound",
    category: "Custom Compound",
    doses: "Per prescription",
    form: "Any",
    blurb: "Built exactly to your provider's script — dose, base, and form.",
    image: img.topical,
  },
];

/* ---------------------------------------------------------------------------
 * Product detail derivation
 * Each catalog entry above stays lean; the detail page's spec sheet is built
 * from form-based defaults, with per-product copy layered on top via
 * `detailOverrides`. Everything is computed at module load so product pages
 * stay fully static (no client-side data fetching).
 * ------------------------------------------------------------------------- */

/** URL-safe slug: "Semaglutide Flex-Dose 4 mL" + "Injectable" + "2.5 mg/mL"
 *  -> "semaglutide-flex-dose-4-ml-injectable-2-5-mg-ml" */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formKind(form: string) {
  const f = form.toLowerCase();
  return {
    isInjectable: /inject|iv|im\b/.test(f),
    isCream: /cream/.test(f),
    isCapsule: /capsule/.test(f),
    isTroche: /troche/.test(f),
    isTopical: /topical/.test(f),
    isOphthalmic: /ophthalmic/.test(f),
  };
}

function deriveSize(name: string): string {
  const mL = name.match(/(\d+(?:\.\d+)?)\s*mL/i);
  if (mL) return `${mL[1]} mL`;
  return "Patient-specific";
}

function deriveRoute(form: string): string {
  const f = form.toLowerCase();
  if (/intramuscular/.test(f)) return "Intramuscular";
  if (/subcutaneous/.test(f)) return "Subcutaneous";
  if (/\biv\b|infusion/.test(f)) return "Intravenous";
  if (/inject/.test(f)) return "Subcutaneous";
  if (/troche/.test(f)) return "Buccal / sublingual";
  if (/capsule/.test(f)) return "Oral";
  if (/cream|topical/.test(f)) return "Topical";
  if (/ophthalmic/.test(f)) return "Ophthalmic";
  return "As directed";
}

function deriveAppearance(form: string): string {
  const k = formKind(form);
  if (k.isOphthalmic) return "Clear sterile solution";
  if (k.isInjectable) return "Clear solution";
  if (k.isCream) return "Smooth white cream";
  if (k.isCapsule) return "Opaque capsule";
  if (k.isTroche) return "Compressed troche";
  if (k.isTopical) return "Uniform topical base";
  return "Compounded preparation";
}

function derivePackaging(form: string): string {
  const k = formKind(form);
  if (k.isOphthalmic) return "Sterile dropper bottle";
  if (k.isInjectable) return "Clear glass vial";
  if (k.isCream || k.isTopical) return "Airless pump dispenser";
  if (k.isCapsule) return "Amber prescription bottle";
  if (k.isTroche) return "Sealed blister pack";
  return "Dispensed per prescription";
}

function deriveInactives(form: string): string[] {
  const k = formKind(form);
  if (k.isOphthalmic) return ["Sodium chloride", "Sterile water for injection"];
  if (k.isInjectable)
    return ["Benzyl alcohol", "Sodium phosphate", "Sterile water for injection"];
  if (k.isCream || k.isTopical)
    return ["Purified water", "Cetyl alcohol", "Glycerin", "Phenoxyethanol"];
  if (k.isCapsule)
    return ["Microcrystalline cellulose", "Magnesium stearate", "Hypromellose shell"];
  if (k.isTroche) return ["Polyethylene glycol", "Stevia", "Natural flavor"];
  return ["Compounding base selected per prescription"];
}

const DEFAULT_DIRECTIONS =
  "Rx Only. Dose, frequency, and duration are determined by the prescribing provider. " +
  "Dispense in the original container and store as directed on the label.";

const FLEX_DOSE_DIRECTIONS =
  "Rx Only. Flex-dose vials are labeled so the prescribed dose can be drawn in units on a " +
  "U-100 syringe, allowing titration without changing concentration. Confirm the " +
  "unit-to-milligram conversion on the label before each administration.";

/** Per-product detail copy, keyed by product name. Omitted fields are derived. */
const detailOverrides: Record<string, Partial<ProductDetail>> = {
  "Semaglutide Double-Strength Flex-Dose 3 mL": {
    activeIngredients: ["Semaglutide"],
    description:
      "A double-strength GLP-1 receptor agonist supplied in a 3 mL flex-dose vial, so higher maintenance doses can be delivered in a smaller injection volume. The same vial covers a full titration range without a concentration change.",
    directions: FLEX_DOSE_DIRECTIONS,
  },
  "Semaglutide Flex-Dose 4 mL": {
    activeIngredients: ["Semaglutide"],
    description:
      "A GLP-1 receptor agonist compounded at 2.5 mg/mL in a 4 mL flex-dose vial — the longest-running supply in the flex-dose line. Dosing is drawn in units, so providers can titrate across the full range from a single vial.",
    directions: FLEX_DOSE_DIRECTIONS,
  },
  "Semaglutide Flex-Dose 3 mL": {
    activeIngredients: ["Semaglutide"],
    description:
      "A GLP-1 receptor agonist compounded at 2.5 mg/mL in a 3 mL flex-dose vial. Sized for patients midway through titration who need more than a starter supply but less than a full 4 mL vial.",
    directions: FLEX_DOSE_DIRECTIONS,
  },
  "Semaglutide Flex-Dose 2 mL": {
    activeIngredients: ["Semaglutide"],
    description:
      "A GLP-1 receptor agonist compounded at 2.5 mg/mL in a 2 mL flex-dose vial — the usual starting size for patients beginning therapy. Unit-based dosing keeps early titration steps simple.",
    directions: FLEX_DOSE_DIRECTIONS,
  },
  "Tirzepatide Forte Flex-Dose 4 mL": {
    activeIngredients: ["Tirzepatide"],
    description:
      "A high-strength dual GIP/GLP-1 receptor agonist at 15 mg/mL in a 4 mL flex-dose vial. Formulated for maintenance dosing where the standard concentration would require an impractical injection volume.",
    directions: FLEX_DOSE_DIRECTIONS,
  },
  "Tirzepatide Flex-Dose 4 mL": {
    activeIngredients: ["Tirzepatide"],
    description:
      "A dual GIP/GLP-1 receptor agonist at 10 mg/mL in a 4 mL flex-dose vial, providing the longest supply at the standard concentration. Doses are drawn in units for straightforward titration.",
    directions: FLEX_DOSE_DIRECTIONS,
  },
  "Tirzepatide Flex-Dose 3 mL": {
    activeIngredients: ["Tirzepatide"],
    description:
      "A dual GIP/GLP-1 receptor agonist at 10 mg/mL in a 3 mL flex-dose vial. A mid-size supply for patients established on therapy and stepping toward maintenance.",
    directions: FLEX_DOSE_DIRECTIONS,
  },
  "Tirzepatide Flex-Dose 2 mL": {
    activeIngredients: ["Tirzepatide"],
    description:
      "A dual GIP/GLP-1 receptor agonist at 10 mg/mL in a 2 mL flex-dose vial. Commonly prescribed for the first months of therapy while the dose is being established.",
    directions: FLEX_DOSE_DIRECTIONS,
  },
  "Tirzepatide Flex-Dose 1 mL": {
    activeIngredients: ["Tirzepatide"],
    description:
      "A dual GIP/GLP-1 receptor agonist at 10 mg/mL in a 1 mL flex-dose vial — the smallest supply in the line, suited to initiation and trial dosing.",
    directions: FLEX_DOSE_DIRECTIONS,
  },
  "Estradiol / Progesterone": {
    activeIngredients: ["Estradiol", "Progesterone"],
    description:
      "Bio-identical estradiol and progesterone combined in a single preparation and dosed to the patient's lab-guided targets. Available as a cream, capsule, or troche depending on absorption preference.",
  },
  "Testosterone Cypionate": {
    activeIngredients: ["Testosterone cypionate"],
    description:
      "A long-acting testosterone ester compounded across a 50–200 mg/mL range so the injection volume can be matched to the prescribed dose. Supplied in a sealed multi-dose vial.",
  },
  DHEA: {
    activeIngredients: ["Dehydroepiandrosterone (DHEA)"],
    description:
      "An adrenal precursor hormone compounded to strengths that standard commercial products do not cover. Typically dosed alongside periodic lab monitoring.",
  },
  "Compounded Progesterone": {
    activeIngredients: ["Progesterone"],
    description:
      "Micronized progesterone compounded as a troche or capsule for cycle support and menopausal symptom management. Strength and schedule are set by the prescriber.",
  },
  "Vaginal Estriol Cream": {
    activeIngredients: ["Estriol"],
    description:
      "A localized estrogen preparation formulated for vaginal tissue comfort and elasticity. Delivered in a low-irritation base with minimal systemic absorption.",
  },
  Enclomiphene: {
    activeIngredients: ["Enclomiphene citrate"],
    description:
      "A selective estrogen receptor modulator that supports the body's own testosterone production rather than replacing it, preserving fertility. Compounded at 12.5 mg and 25 mg.",
  },
  "Tadalafil / Oxytocin Troche": {
    activeIngredients: ["Tadalafil", "Oxytocin"],
    description:
      "A combination troche pairing a long-acting PDE5 inhibitor with oxytocin, dissolved buccally for faster onset than an oral tablet. Strengths are set per prescription.",
  },
  "PT-141 (Bremelanotide)": {
    activeIngredients: ["Bremelanotide"],
    description:
      "A melanocortin receptor agonist peptide used to support libido in both men and women, acting centrally rather than on blood flow. Supplied as a subcutaneous injection.",
  },
  "Scream Cream": {
    activeIngredients: ["Sildenafil", "L-arginine", "Pentoxifylline"],
    description:
      "A multi-agent topical formulated to increase local blood flow and sensitivity at the point of application. Compounded in a rapidly absorbed base.",
  },
  "Tretinoin Combination": {
    activeIngredients: ["Tretinoin", "Niacinamide", "Hydroquinone"],
    description:
      "A combination retinoid topical targeting acne, pigmentation, and texture in a single nightly application. Concentrations are adjusted to the patient's tolerance.",
  },
  "Hair Restoration Blend": {
    activeIngredients: ["Minoxidil", "Finasteride", "Biotin"],
    description:
      "A combined topical and oral regimen addressing androgenic hair loss through several mechanisms at once. Strengths are tailored to scalp sensitivity and response.",
  },
  "BPC-157": {
    activeIngredients: ["BPC-157"],
    description:
      "A synthetic pentadecapeptide studied for soft-tissue and gastrointestinal repair. Compounded as a subcutaneous injection for provider-directed protocols.",
  },
  Sermorelin: {
    activeIngredients: ["Sermorelin acetate"],
    description:
      "A growth-hormone-releasing hormone analog that stimulates the pituitary's own secretion rather than supplying growth hormone directly. Commonly dosed at night.",
  },
  "Glutathione Injection": {
    activeIngredients: ["Glutathione"],
    description:
      "The body's principal endogenous antioxidant, compounded at 200 mg/mL for IV or intramuscular administration. Frequently paired with vitamin infusion protocols.",
  },
  "Myers' Cocktail": {
    activeIngredients: [
      "Ascorbic acid",
      "Magnesium chloride",
      "Calcium gluconate",
      "B-complex vitamins",
      "Cyanocobalamin",
    ],
    description:
      "The classic intravenous vitamin and mineral blend used for energy, hydration, and recovery support. Compounded to order and adjusted per protocol.",
  },
  HCG: {
    activeIngredients: ["Human chorionic gonadotropin"],
    description:
      "A gonadotropin used across fertility and hormone protocols to support gonadal function. Reconstituted and dosed according to the prescriber's plan.",
  },
  "NAD+ Injection": {
    activeIngredients: ["Nicotinamide adenine dinucleotide"],
    description:
      "A cellular coenzyme central to mitochondrial energy production, compounded for subcutaneous or intravenous use. Typically dosed in a tapering series.",
  },
  "Compounded Eye Drops": {
    activeIngredients: ["Per prescription"],
    description:
      "Preservative-free sterile ophthalmic drops compounded under USP 797 conditions for strengths and combinations that are not commercially available. Each batch is prepared to the submitted script.",
  },
  "Ondansetron Troche": {
    activeIngredients: ["Ondansetron"],
    description:
      "A 5-HT3 antagonist in a fast-dissolving troche, useful when nausea makes swallowing a tablet difficult. Compounded at 4 mg and 8 mg.",
  },
  "Custom Formulation": {
    activeIngredients: ["Per prescription"],
    description:
      "For therapies that do not exist commercially — a discontinued strength, an allergen-free base, or a combination that reduces the number of doses a patient has to take. Send the script and our pharmacists will confirm feasibility, base, and turnaround before compounding.",
    directions:
      "Rx Only. Compounded strictly to the submitted prescription. Our pharmacy team confirms strength, base, and dosage form with the prescriber before release.",
  },
};

function buildProduct(raw: RawProduct, index: number): Product {
  const override = detailOverrides[raw.name] ?? {};

  return {
    ...raw,
    slug: slugify(`${raw.name} ${raw.form} ${raw.doses}`),
    detail: {
      // Deterministic catalog number — no randomness, so builds stay reproducible.
      productId: String(8510900 + index * 13),
      brand: "Medicraft Pharmacy",
      size: deriveSize(raw.name),
      appearance: deriveAppearance(raw.form),
      packaging: derivePackaging(raw.form),
      schedule: "Rx Only",
      route: deriveRoute(raw.form),
      activeIngredients: [raw.name],
      inactiveIngredients: deriveInactives(raw.form),
      description: raw.blurb,
      directions: DEFAULT_DIRECTIONS,
      ...override,
    },
  };
}

export const products: Product[] = rawProducts.map(buildProduct);

export function productsByCategory(slug: string): Product[] {
  return products.filter((p) => p.categorySlug === slug);
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

/** Spec-sheet rows for the product detail page, in reference-site order. */
export function productSpecs(p: Product): { label: string; value: string }[] {
  return [
    { label: "Product ID", value: p.detail.productId },
    { label: "Brand", value: p.detail.brand },
    { label: "Form", value: p.form },
    { label: "Size", value: p.detail.size },
    { label: "Concentration", value: p.doses },
    { label: "Description", value: p.detail.appearance },
    { label: "Package", value: p.detail.packaging },
    { label: "Schedule", value: p.detail.schedule },
    { label: "Route of Administration", value: p.detail.route },
  ];
}

/** Same-category products first, topped up from the wider catalog if sparse. */
export function relatedProducts(p: Product, limit = 8): Product[] {
  const sameCategory = products.filter(
    (x) => x.categorySlug === p.categorySlug && x.slug !== p.slug
  );
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);

  const filler = products.filter(
    (x) => x.categorySlug !== p.categorySlug && x.slug !== p.slug
  );
  return [...sameCategory, ...filler].slice(0, limit);
}

/** Products featured on the home page (the flex-dose weight-management line). */
export const featuredProducts: Product[] = productsByCategory("weight-management");

/** Catalog grouped by category — used by the home-page product browser. */
export const productsGrouped: { category: Category; items: Product[] }[] =
  categories
    .map((category) => ({
      category,
      items: productsByCategory(category.slug),
    }))
    .filter((g) => g.items.length > 0);

export const pillars = [
  {
    icon: ShieldCheck,
    title: "Expertise",
    body: "Pharmacists with decades of sterile and non-sterile compounding experience.",
  },
  {
    icon: Sparkles,
    title: "Customization",
    body: "Every formula built around the individual — never one-size-fits-all.",
  },
  {
    icon: Layers,
    title: "Innovation",
    body: "Continuously refined protocols informed by the latest clinical evidence.",
  },
  {
    icon: Cpu,
    title: "Technology",
    body: "Precision equipment and digital tracking on every batch we produce.",
  },
];

export const stats = [
  { value: "500k+", label: "Prescriptions compounded" },
  { value: "24–48h", label: "Average turnaround" },
  { value: "1,200+", label: "Partner providers" },
  { value: "99.7%", label: "Quality pass rate" },
];

export const testimonials = [
  {
    quote:
      "Medicraft has become an extension of my practice. The consistency and communication are unmatched — my patients notice the difference.",
    name: "Dr. Alana Reyes",
    role: "Integrative Medicine, Tampa",
  },
  {
    quote:
      "Turnaround times I can actually plan around, and a clinical team that picks up the phone. It changed how I prescribe.",
    name: "Dr. Marcus Bell",
    role: "Family Medicine, Orlando",
  },
];

/* ---------------------------------------------------------------------------
 * Content for the standalone pages
 * ------------------------------------------------------------------------- */

export const qualityStandards: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "PCAB Accredited",
    body: "Independently accredited by the Pharmacy Compounding Accreditation Board for sterile and non-sterile compounding.",
  },
  {
    icon: FlaskConical,
    title: "USP 795 & 797 Compliant",
    body: "Every preparation follows United States Pharmacopeia standards for compounding quality and sterility.",
  },
  {
    icon: Layers,
    title: "Third-Party Potency Testing",
    body: "Independent labs verify potency and sterility on representative batches before release.",
  },
  {
    icon: Cpu,
    title: "End-to-End Batch Tracking",
    body: "Digital records trace every ingredient, lot, and step from intake to shipment.",
  },
];

export const licenses = [
  { state: "Florida", type: "Resident Pharmacy Permit", number: "PH-000000" },
  { state: "Texas", type: "Non-Resident Pharmacy", number: "TX-000000" },
  { state: "California", type: "Non-Resident Pharmacy", number: "CA-000000" },
  { state: "New York", type: "Non-Resident Establishment", number: "NY-000000" },
  { state: "Georgia", type: "Non-Resident Pharmacy", number: "GA-000000" },
  { state: "Illinois", type: "Non-Resident Pharmacy", number: "IL-000000" },
];

export const faqs = [
  {
    q: "How do I get set up as a new provider?",
    a: "Complete the New Provider enrollment form and our onboarding team will verify your credentials and activate your account, usually within one to two business days.",
  },
  {
    q: "How do patients request a refill?",
    a: "Patients use the Patient Refill form with the details from their prescription label. Refills route straight to our fulfillment queue.",
  },
  {
    q: "What are your typical turnaround times?",
    a: "Most compounded prescriptions ship within 24–48 hours. Sterile preparations may take slightly longer depending on required testing.",
  },
  {
    q: "Which states do you ship to?",
    a: "We are licensed in a growing list of states — see the Licenses page for current coverage. Contact us if you don't see yours.",
  },
];

export const careerBenefits = [
  {
    title: "Health, Vision & Dental",
    body: "Comprehensive coverage that keeps you and your family well.",
  },
  {
    title: "Paid Time Off",
    body: "Generous PTO so you can rest, recharge, and come back sharp.",
  },
  {
    title: "Training & Certifications",
    body: "We fund the certifications that advance your professional expertise.",
  },
  {
    title: "Growth Opportunity",
    body: "Clear paths to keep learning and grow your career with us.",
  },
  {
    title: "Free Medications",
    body: "Complimentary compounded medications for our team's wellbeing.",
  },
  {
    title: "Stress-Free Massage Days",
    body: "On-site massage days to help the whole team decompress.",
  },
];

export type Job = {
  title: string;
  dept: string;
  shift: string;
  location: string;
  blurb: string;
};

export const careers: Job[] = [
  {
    title: "Compounding Pharmacist",
    dept: "Pharmacy",
    shift: "Third Shift",
    location: "Tampa, FL",
    blurb: "Lead sterile and non-sterile compounding with a meticulous, patient-first team.",
  },
  {
    title: "Pharmacy Technician",
    dept: "Pharmacy",
    shift: "Third Shift",
    location: "Tampa, FL",
    blurb: "Support formulation, packaging, and quality checks in a fast-moving lab.",
  },
  {
    title: "Customer Service Representative",
    dept: "Customer Service",
    shift: "Second Shift",
    location: "Tampa, FL",
    blurb: "Be the friendly, knowledgeable first point of contact for patients and providers.",
  },
  {
    title: "Forklift Operator",
    dept: "Logistics",
    shift: "Second Shift",
    location: "Tampa, FL",
    blurb: "Keep our fulfillment and inventory moving safely and on schedule.",
  },
  {
    title: "Marketing Director",
    dept: "Marketing",
    shift: "First Shift",
    location: "Tampa, FL",
    blurb: "Own brand, growth, and provider marketing across every channel.",
  },
  {
    title: "Packaging & Labeling Inspector",
    dept: "Lab",
    shift: "Second Shift",
    location: "Tampa, FL",
    blurb: "Verify every label and package meets our exacting quality standards.",
  },
  {
    title: "Pharmacy Technician – Fulfillment",
    dept: "Pharmacy",
    shift: "First Shift",
    location: "Tampa, FL",
    blurb: "Pick, pack, and dispatch prescriptions with speed and accuracy.",
  },
  {
    title: "Pharmacy Technician – Data Entry",
    dept: "Pharmacy",
    shift: "Second Shift",
    location: "Tampa, FL",
    blurb: "Enter and verify prescription data with a sharp eye for detail.",
  },
  {
    title: "Pharmacy Technician – Sterile Compounding",
    dept: "Lab",
    shift: "Third Shift",
    location: "Tampa, FL",
    blurb: "Compound sterile preparations under USP 797 cleanroom conditions.",
  },
];
