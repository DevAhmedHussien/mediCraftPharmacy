import type { MetadataRoute } from "next";

import { getCategories, getProducts } from "@/lib/catalogue";
import { publishedPostSlugs } from "@/lib/services/blog";
import { site } from "@/lib/site";

/**
 * Full sitemap: marketing pages, product categories, every product, and every
 * published post.
 *
 * Posts come from the database rather than from a hard-coded list, so
 * publishing one puts it in the sitemap without anyone remembering to. Their
 * `lastModified` is the post's real `updatedAt` — a sitemap where every entry
 * claims to have changed today is one a crawler learns to ignore.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const [categories, products] = await Promise.all([getCategories(), getProducts()]);

  const staticPaths: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["", 1, "weekly"],
    ["/products", 0.9, "weekly"],
    ["/compounding", 0.8, "monthly"],
    ["/quality", 0.8, "monthly"],
    ["/providers", 0.8, "monthly"],
    ["/work-with-us", 0.8, "monthly"],
    ["/blog", 0.7, "weekly"],
    ["/about", 0.7, "monthly"],
    ["/licenses", 0.6, "monthly"],
    ["/support", 0.6, "monthly"],
    ["/contact", 0.6, "monthly"],
    ["/careers", 0.5, "monthly"],
    ["/refill", 0.5, "monthly"],
    ["/privacy", 0.3, "yearly"],
    ["/notice-of-privacy-practices", 0.3, "yearly"],
    ["/terms", 0.3, "yearly"],
    ["/shipping-and-returns", 0.4, "yearly"],
    ["/accessibility", 0.3, "yearly"],
  ];

  const posts = await publishedPostSlugs().catch(() => []);

  return [
    ...staticPaths.map(([path, priority, changeFrequency]) => ({
      url: `${site.url}${path}`,
      lastModified,
      changeFrequency,
      priority,
    })),
    ...categories.map((c) => ({
      url: `${site.url}/products/${c.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${site.url}/product/${p.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...posts.map((p) => ({
      url: `${site.url}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
