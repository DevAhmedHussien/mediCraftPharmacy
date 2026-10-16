import type { Metadata } from "next";
import { site } from "@/lib/site";

/* ===========================================================================
   Per-page SEO, in one place.

   Before this, only three of thirteen pages declared a canonical URL and none
   declared Open Graph. That is a real problem rather than a nicety: without a
   canonical, a page reachable at more than one URL (trailing slash, query
   string, preview domain) competes with itself in the index; without per-page
   Open Graph, every shared link falls back to the site-wide title and reads as
   the same page.

   `pageMetadata` produces both from one call, so a new page cannot forget.
   ========================================================================= */

/**
 * The card every page falls back to.
 *
 * WHY THIS EXISTS. `app/(site)/opengraph-image.tsx` renders a branded card,
 * and the comment here used to say interior pages inherited it. They did not.
 * Measured on a production build, 13 October 2026: every page except `/`
 * served `twitter:card=summary_large_image` with NO image — a page declaring
 * a large-image card and supplying no image is rendered by LinkedIn, Slack,
 * X and iMessage as a bare line of text. Setting `openGraph` in a child
 * segment's metadata is what drops the file-convention image, and every page
 * on this site goes through this function.
 *
 * It is a neutral laboratory photograph, not the vial render: that render
 * carries product labels, and the 13 October brief takes drug names off the
 * marketing surfaces. Versioned filename, per the rule in next.config.js.
 */
const DEFAULT_OG_IMAGE = {
  src: "/images/og/og-default-2026-10.jpg",
  width: 1200,
  height: 630,
  alt: "MediCraft Pharmacy — precision compounding, crafted for every patient",
} as const;

export function pageMetadata({
  title,
  description,
  path,
  /** Omit for the default card below. */
  image,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${site.url}${path}`;
  // The title template in the root layout appends the site name, so the Open
  // Graph title has to spell it out — social cards get no template. Titles that
  // already carry the brand (the home page) are left alone rather than ending up
  // as "MediCraft Pharmacy — … | MediCraft Pharmacy".
  const ogTitle = title.includes(site.name) ? title : `${title} | ${site.name}`;

  /* A title that already names the brand gets no template.
   *
   * The root layout appends " | MediCraft Pharmacy" to every title. For the
   * home page, whose title IS the brand plus the tagline, that produced
   * "MediCraft Pharmacy — … | MediCraft Pharmacy" at 90 characters — Google
   * truncates around 60, so the half that identified the page was the half
   * that got cut. `absolute` opts out of the template for exactly the pages
   * that do not need it. */
  const resolvedTitle = title.includes(site.name) ? { absolute: title } : title;

  return {
    title: resolvedTitle,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url,
      siteName: site.name,
      title: ogTitle,
      description,
      /* `/` is left alone: `app/(site)/opengraph-image.tsx` renders a branded
         card for that one route and Next attaches it automatically, but only
         where nothing else sets `images` — setting a fallback unconditionally
         replaced the branded card with this flat photograph. Every other page
         has no generated card of its own, which is the gap this fills. */
      ...(path === "/" && !image
        ? {}
        : {
            images: [
              {
                url: `${site.url}${image ?? DEFAULT_OG_IMAGE.src}`,
                width: DEFAULT_OG_IMAGE.width,
                height: DEFAULT_OG_IMAGE.height,
                alt: DEFAULT_OG_IMAGE.alt,
              },
            ],
          }),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      ...(path === "/" && !image
        ? {}
        : { images: [`${site.url}${image ?? DEFAULT_OG_IMAGE.src}`] }),
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * BreadcrumbList structured data.
 *
 * Google uses this to render the site hierarchy in place of a raw URL in the
 * result, so an interior page shows "MediCraft Pharmacy › Quality Standards"
 * rather than a path. Pass the trail without "Home" — it is prepended here so
 * every page's first crumb is identical.
 */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  const items = [{ name: "Home", path: "" }, ...trail];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${site.url}${item.path}`,
    })),
  };
}

/**
 * ItemList structured data for a set of products.
 *
 * Marks a category or the formulary as a list of named things in a defined
 * order, which is what lets a search engine understand the page as a listing
 * rather than as prose that happens to contain product names.
 */
export function itemListJsonLd({
  name,
  items,
}: {
  name: string;
  items: { name: string; path: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: `${site.url}${item.path}`,
    })),
  };
}

/** Renders a JSON-LD script tag. Kept here so pages don't repeat the boilerplate. */
export function jsonLdProps(data: unknown) {
  return {
    type: "application/ld+json" as const,
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  };
}
