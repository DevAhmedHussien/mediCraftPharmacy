/**
 * The route list every spec shares.
 *
 * One place, so adding a page to the site adds it to the SEO, a11y and motion
 * gates at the same time rather than to none of them. The audit's scorecard
 * covered 22 public routes; anything new should join them by default.
 */

/**
 * Dynamic routes, DISCOVERED rather than hardcoded.
 *
 * These were three literal slugs copied out of the seeded catalogue, which
 * made the suite fail for two reasons that are not regressions: a renamed or
 * delisted product, and a CI runner whose database has a schema but no rows.
 * A test that breaks when the content changes is testing the content, not
 * the template.
 *
 * Each helper reads an index page the suite already covers and takes the
 * first link it finds. Returns null when there is genuinely nothing to test,
 * so the caller can skip with a reason instead of failing on an empty
 * catalogue.
 */
export async function discoverSlug(
  baseURL: string,
  index: "/products" | "/blog",
  prefix: "/product/" | "/products/" | "/blog/"
): Promise<string | null> {
  const res = await fetch(baseURL + index);
  if (!res.ok) return null;
  const html = await res.text();

  /* Only `href` attributes.
  
     A bare path match also hits Next's own build artefacts — the preload
     paths for route chunks look exactly like routes, so the first "category"
     found was `/products/page-64aff713980c5b5a`, which 404s. Anchors are the
     links a crawler would follow, which is what these tests are about. */
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (!href.startsWith(prefix)) continue;
    const rest = href.slice(prefix.length);
    // One segment, no query, and not a hashed chunk name.
    if (!rest || rest.includes("/") || rest.includes("?")) continue;
    if (/^page-[a-f0-9]{8,}$/.test(rest)) continue;
    return href;
  }
  return null;
}

export const DISCOVER = {
  product: (base: string) => discoverSlug(base, "/products", "/product/"),
  category: (base: string) => discoverSlug(base, "/products", "/products/"),
  post: (base: string) => discoverSlug(base, "/blog", "/blog/"),
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
]  as const;

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
