import "server-only";

import { db } from "@/lib/db";

/* Public blog reads. Separate from lib/services/posts.ts (the admin surface)
   so a published-only filter can never be forgotten: every function here
   applies it, and nothing here can return a draft. */

/**
 * `PUBLISHED` and not future-dated.
 *
 * The date check is what makes SCHEDULED work without a cron: a post flips
 * live the moment its timestamp passes, because the query asks about now
 * rather than about a flag someone has to flip.
 */
const publishedFilter = () => ({
  status: "PUBLISHED" as const,
  publishedAt: { lte: new Date() },
});

export async function listPublishedPosts(limit = 50) {
  return db.post.findMany({
    where: publishedFilter(),
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      publishedAt: true,
      readingMinutes: true,
      /* The cover, as the key the uploads route serves.
         The column has existed since the schema was written and nothing
         selected it, so every post rendered as a wall of text with an image
         sitting unused in storage. */
      cover: { select: { key: true, alt: true, width: true, height: true } },
      categories: { select: { category: { select: { name: true, slug: true } } } },
    },
  });
}

export async function getPublishedPost(slug: string) {
  return db.post.findFirst({
    where: { slug, ...publishedFilter() },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      body: true,
      publishedAt: true,
      updatedAt: true,
      readingMinutes: true,
      seoTitle: true,
      seoDescription: true,
      /* The cover, as the key the uploads route serves.
         The column has existed since the schema was written and nothing
         selected it, so every post rendered as a wall of text with an image
         sitting unused in storage. */
      cover: { select: { key: true, alt: true, width: true, height: true } },
      categories: { select: { category: { select: { name: true, slug: true } } } },
    },
  });
}

/** Slugs for the sitemap and for static params. */
export async function publishedPostSlugs() {
  return db.post.findMany({
    where: publishedFilter(),
    select: { slug: true, updatedAt: true },
  });
}
