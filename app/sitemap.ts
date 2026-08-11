import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { categories, products } from "@/lib/data";

/**
 * Full sitemap: marketing pages, every product category, and every product
 * detail page. Generated from the same catalog the pages render from, so new
 * products appear here automatically. Served at /sitemap.xml and referenced
 * from robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticPaths = [
    "",
    "/products",
    "/about",
    "/quality",
    "/licenses",
    "/compounding",
    "/providers",
    "/support",
    "/contact",
    "/careers",
    "/refill",
    "/privacy",
    "/terms",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${site.url}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${site.url}/products/${c.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${site.url}/product/${p.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
