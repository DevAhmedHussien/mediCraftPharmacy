/** The canonical production domain — the last resort if nothing else is set. */
/* www, not the apex.
 *
 * Caddy 301s the apex to www, so this is the host that actually serves. An
 * origin that redirects is wrong in two places at once: every canonical URL
 * and every schema.org @id points at a hop rather than a page, and the logo
 * in every email is fetched through a redirect — which a fair number of mail
 * clients refuse to follow for images, leaving a broken mark at the top of
 * the message. */
const CANONICAL_ORIGIN = "https://www.medicraftpharmacy.com";

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

/* ===========================================================================
   Name, address, phone and the rest of the brand's factual record.

   Every value here comes from the owner's own identity document
   ("medicraft-identity 5.html") rather than from placeholder data. Two things
   to be aware of before launch:

   · PHONE NUMBERS ARE STILL PLACEHOLDERS. The source document carries
     (800) 000-0000 in the topbar and (727) 000-0000 on the contact page.
     Both are stand-ins. Replace `phone` below with the real line.
   · The source document also gives two different opening times — 9:30–6:30 in
     the topbar, 8:00–6:00 in the contact block. The contact block wins here
     because it is the one that enumerates all seven days, but confirm it.
   ========================================================================= */
/**
 * The pharmacy's published line.
 *
 * Was a `(727) 000-0000` stand-in guarded by `hasRealPhone`, which made every
 * caller render a link to the contact page instead of a `tel:` that dials
 * nothing. The real number is now known, so the guard passes and the number
 * is dialled — the guard itself stays, because it is what stops a future
 * placeholder reaching production looking finished.
 */
const PLACEHOLDER_PHONE = "(727) 000-0000";
const PUBLISHED_PHONE = "(727) 309-6666";

export const site = {
  name: "MediCraft Pharmacy",
  shortName: "MediCraft",
  tagline: "Precision compounding, crafted for every patient",
  /** The owner's positioning line, used as the hero headline. */
  headline: "Wellness Is Crafted, Not Manufactured.",
  description:
    "MediCraft Pharmacy — 503A sterile and non-sterile precision compounding in Tampa, Florida. Provider-focused, quality-engineered, patient-specific formulations.",
  url: resolveOrigin(),

  // --- Primary NAP (name / address / phone) ---
  /**
   * The pharmacy's phone number.
   *
   * Sourced from SITE_PHONE so it can be set without a code change. Until it
   * is, `hasRealPhone` below is false and every caller renders a link to the
   * contact page instead of a `tel:` that dials nothing — a prescriber tapping
   * a dead number on a pharmacy site is worse than no number at all, and it is
   * the kind of placeholder that survives to launch precisely because it looks
   * finished.
   */
  phone: process.env.SITE_PHONE?.trim() || PUBLISHED_PHONE,
  email: "info@medicraftpharmacy.com",
  providerEmail: "providers@medicraftpharmacy.com",
  privacyEmail: "privacy@medicraftpharmacy.com",
  legalEmail: "legal@medicraftpharmacy.com",

  /** One line, for a footer or an email signature. */
  address: "12320 Race Track Rd, Tampa, FL 33626-3115",
  /** The same address short, where a street line would crowd the layout. */
  addressShort: "Tampa, Florida",
  addressParts: {
    street: "12320 Race Track Rd",
    city: "Tampa",
    state: "FL",
    postalCode: "33626-3115",
    country: "US",
  },
  /**
   * APPROXIMATE — the 33626 centroid, not a surveyed point for the unit.
   * Used only for the `LocalBusiness` schema. Worth replacing with the real
   * pin from Google Business Profile before launch, because this is the
   * coordinate a map app will route a courier to.
   */
  geo: { lat: 28.0725, lng: -82.6062 },

  hoursShort: "Mon–Fri 8 AM–6 PM ET  ·  Sat 9 AM–1 PM ET",
  hours: [
    { days: "Monday – Friday", time: "8:00 AM – 6:00 PM ET" },
    { days: "Saturday", time: "9:00 AM – 1:00 PM ET" },
    { days: "Sunday", time: "Closed", closed: true },
  ],
  afterHours:
    "For urgent prescription inquiries outside business hours, please leave a voicemail and we will respond first thing the next business day.",

  /** LLC established 2025; pharmacy opened to patients and providers in 2026. */
  established: "2026",
  llcEstablished: "2025",
  priceRange: "$$",

  /**
   * The portal now lives in this app. It used to point at an external
   * subdomain that was never stood up, so every "Provider Portal Login" on
   * the site was a dead link.
   */
  loginUrl: "/login",
  social: {
    linkedin: "https://linkedin.com/company/medicraftpharmacy",
    instagram: "https://instagram.com/medicraftpharmacy",
    facebook: "https://facebook.com/medicraftpharmacy",
  },
};

/** The utility strip above the header. */
export const topbar = {
  location: "Tampa, Florida",
  hours: "Mon–Fri 8 AM–6 PM  ·  Sat 9 AM–1 PM",
};

/**
 * Every primary route, in the section order of the owner's document: who we
 * are → how we prove it → where we can serve → who we serve → what we make.
 * Used by the mobile drawer and the sitemap, which have room for all of it.
 */
export const nav = [
  { label: "About MediCraft", href: "/about" },
  { label: "Quality Standards", href: "/quality" },
  { label: "State Coverage", href: "/licenses" },
  { label: "For Providers", href: "/providers" },
  { label: "Our Compounding", href: "/compounding" },
  { label: "Products", href: "/products" },
  { label: "Compounding Notes", href: "/blog" },
  { label: "Resources & FAQ", href: "/support" },
  { label: "Contact", href: "/contact" },
];

/**
 * The subset that fits the desktop header bar — the same five the owner's
 * document puts in its header, plus Products, which carries the category
 * dropdown. Resources and Contact are reachable from the topbar and footer
 * instead of crowding the bar to the point where labels start truncating.
 */
/**
 * The header.
 *
 * Nine top-level links did not fit: adding Work With Us and Contact pushed
 * "State Coverage" onto two lines and the bar started wrapping. Grouping the
 * four "who we are / how we work" pages under one item fixes that and makes
 * Compounding Notes reachable from the header, which it never was — it existed
 * only in the footer, so the blog was effectively invisible.
 */
export type HeaderNavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; blurb: string }[];
};

export const headerNav: HeaderNavItem[] = [
  {
    label: "The pharmacy",
    href: "/about",
    children: [
      {
        label: "About MediCraft",
        href: "/about",
        blurb: "Who compounds your prescriptions, and where.",
      },
      {
        label: "Quality standards",
        href: "/quality",
        blurb: "USP 795, 797 and 800, and how we meet them.",
      },
      {
        label: "Our compounding",
        href: "/compounding",
        blurb: "Sterile and non-sterile, and what each involves.",
      },
      {
        label: "State coverage",
        href: "/licenses",
        blurb: "Where we hold a permit and where one is pending.",
      },
    ],
  },
  { label: "For providers", href: "/providers" },
  { label: "Compounding notes", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

/** Call-to-action links at the right edge of the header. */
export const navCtas = [
  { label: "Patient Refill", href: "/refill", style: "outline" as const },
  { label: "Open an Account", href: "/work-with-us", style: "primary" as const },
];

/** Footer link columns, as grouped in the owner's document. */
export const footerColumns = [
  {
    heading: "Company",
    links: [
      { label: "About MediCraft", href: "/about" },
      { label: "Compounding Notes", href: "/blog" },
      { label: "Quality Standards", href: "/quality" },
      { label: "Our Team", href: "/quality#leadership" },
      { label: "Careers", href: "/careers" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    heading: "Providers",
    links: [
      { label: "Open an Account", href: "/work-with-us" },
      { label: "Provider Portal", href: "/login" },
      { label: "Formulary Guide", href: "/products" },
      { label: "Clinical Resources", href: "/support#resources" },
      { label: "State Coverage", href: "/licenses" },
    ],
  },
  {
    heading: "Patients",
    links: [
      { label: "Patient Refill", href: "/refill" },
      { label: "Shipping Info", href: "/licenses#shipping" },
      { label: "FAQs", href: "/support" },
      { label: "Safety Information", href: "/compounding" },
      { label: "Contact Support", href: "/contact" },
    ],
  },
];

/**
 * The accreditation pills in the footer.
 *
 * `inProgress` is load-bearing, not cosmetic: PCAB accreditation and
 * LegitScript certification have *not* been granted yet, and the owner's
 * document is careful to say so everywhere. The UI must never render these as
 * held credentials.
 */
export const footerBadges = [
  { label: "PCAB — In Progress", inProgress: true },
  { label: "503A Compounding", inProgress: false },
  { label: "USP 795 · 797 · 800 Compliant", inProgress: false },
  { label: "LegitScript — In Progress", inProgress: true },
];

/** Flat list kept for any consumer that just wants every route. */
export const footerLinks = footerColumns.flatMap((c) => c.links);

/**
 * Is the phone number real?
 *
 * Every `tel:` link on the site checks this. False means the UI offers the
 * contact page instead of a number that rings nowhere.
 */
export const hasRealPhone = site.phone !== PLACEHOLDER_PHONE;

/** A `tel:` href, or null when there is no number worth dialling. */
export function telHref(): string | null {
  return hasRealPhone ? `tel:${site.phone.replace(/[^\d+]/g, "")}` : null;
}
