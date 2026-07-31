/** The canonical production domain — the last resort if nothing else is set. */
const CANONICAL_ORIGIN = "https://medicraftpharmacy.com";

/**
 * Resolves the origin that metadata, canonicals, the sitemap and — critically —
 * social preview image URLs are built from.
 *
 * Open Graph requires *absolute* URLs, so this cannot be a relative path: if
 * the origin is wrong, the crawler fetches a URL that does not exist and the
 * link renders with no image. The chain below means a shared link previews
 * correctly from a preview deployment as well as from production:
 *
 *   1. NEXT_PUBLIC_SITE_URL      — set this on the real deployment
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the project's production domain
 *   3. VERCEL_URL                — the current preview deployment
 *   4. CANONICAL_ORIGIN          — fallback
 */
function resolveOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ].filter(Boolean) as string[];

  const raw = candidates[0];
  if (!raw) return CANONICAL_ORIGIN;

  const withProtocol = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

export const site = {
  name: "Medicraft Pharmacy",
  shortName: "Medicraft",
  tagline: "Precision compounding, crafted for every patient",
  description:
    "Medicraft Pharmacy is a Florida-based specialty compounding pharmacy delivering physician-grade custom medications — GLP-1 weight management, hormone therapy, peptides and more — with fast turnaround and dedicated clinical support for providers and patients nationwide.",
  url: resolveOrigin(),

  // Primary NAP (name / address / phone) — used across the UI and structured data
  phone: "(813) 555-0142",
  tollFree: "(888) 555-0142",
  fax: "(813) 555-0143",
  email: "care@medicraftpharmacy.com",
  address: "3201 W Kennedy Blvd, Suite 200, Tampa, FL 33609",
  addressParts: {
    street: "3201 W Kennedy Blvd, Suite 200",
    city: "Tampa",
    state: "FL",
    zip: "33609",
    country: "US",
  },
  geo: { lat: 27.9466, lng: -82.4732 },
  hours: "Mon–Fri: 9:30 AM – 6:30 PM  •  Sat: 9:00 AM – 1:00 PM",
  since: "Since 2011",
  priceRange: "$$",

  // Florida locations (example data — swap for your real sites)
  locations: [
    {
      name: "Tampa — Main Compounding Lab",
      street: "3201 W Kennedy Blvd, Suite 200",
      city: "Tampa",
      state: "FL",
      zip: "33609",
      phone: "(813) 555-0142",
    },
    {
      name: "Doral — Miami Fulfillment Center",
      street: "8400 NW 25th St, Suite 110",
      city: "Doral",
      state: "FL",
      zip: "33122",
      phone: "(305) 555-0188",
    },
    {
      name: "Orlando — Provider Office",
      street: "1900 Summit Tower Blvd, Suite 400",
      city: "Orlando",
      state: "FL",
      zip: "32810",
      phone: "(407) 555-0164",
    },
  ],

  // External portal links (mirrors the Hallandale structure — swap for real URLs)
  loginUrl: "https://portal.medicraftpharmacy.com/login",
  social: {
    instagram: "https://instagram.com/medicraftpharmacy",
    facebook: "https://facebook.com/medicraftpharmacy",
    linkedin: "https://linkedin.com/company/medicraftpharmacy",
  },
};

/** Primary header navigation — real routes. */
export const nav = [
  { label: "Products", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Quality", href: "/quality" },
  { label: "Licenses", href: "/licenses" },
  { label: "Support", href: "/support" },
  { label: "Careers", href: "/careers" },
];

/** Call-to-action links shown at the right edge of the navbar. */
export const navCtas = [
  { label: "Patient Refill", href: "/refill", style: "ghost" as const },
  { label: "New Provider", href: "/providers", style: "primary" as const },
  { label: "Login", href: site.loginUrl, style: "text" as const, external: true },
];

/** Footer column of quick links. */
export const footerLinks = [
  { label: "Products", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Quality", href: "/quality" },
  { label: "Licenses", href: "/licenses" },
  { label: "Support", href: "/support" },
  { label: "Careers", href: "/careers" },
  { label: "New Provider", href: "/providers" },
  { label: "Patient Refill", href: "/refill" },
];
