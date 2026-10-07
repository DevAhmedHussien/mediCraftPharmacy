/**
 * The route list every spec shares.
 *
 * One place, so adding a page to the site adds it to the SEO, a11y and motion
 * gates at the same time rather than to none of them. The audit's scorecard
 * covered 22 public routes; anything new should join them by default.
 */

/** Dynamic routes need a real slug. These come from the seeded catalogue. */
export const SAMPLE = {
  product: "/product/semaglutide-double-strength-flex-dose-3-ml-injectable-5-mg-ml",
  category: "/products/weight-management",
  post: "/blog/what-usp-797-actually-requires",
} as const;

/** Indexable pages. Every one is crawled, so every one carries SEO weight. */
export const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/accessibility",
  "/blog",
  "/careers",
  "/compounding",
  "/contact",
  "/licenses",
  "/notice-of-privacy-practices",
  "/privacy",
  "/products",
  "/providers",
  "/quality",
  "/refill",
  "/shipping-and-returns",
  "/support",
  "/terms",
  "/work-with-us",
  SAMPLE.product,
  SAMPLE.category,
  SAMPLE.post,
] as const;

/** Reachable without a session, but deliberately not indexed. */
export const UNAUTHENTICATED_ROUTES = ["/login"] as const;

/** Every page an anonymous visitor can load. */
export const ALL_ANON_ROUTES = [...PUBLIC_ROUTES, ...UNAUTHENTICATED_ROUTES];

/**
 * Pages with a form a human fills in.
 *
 * Carved out of the motion spec: a field that animates while someone is
 * typing in it is worse than one that does not move at all, so the brief
 * excluded forms from motion entirely and this is the list that enforces it.
 */
export const FORM_ROUTES = ["/refill", "/contact", "/work-with-us", "/careers"] as const;
