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

export function pageMetadata({
  title,
  description,
  path,
  /** Omit to inherit the site-wide card from app/opengraph-image.tsx. */
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

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url,
      siteName: site.name,
      title: ogTitle,
      description,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
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
