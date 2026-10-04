import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { renderMarkdown } from "@/lib/markdown";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import { getPublishedPost, publishedPostSlugs } from "@/lib/services/blog";
import { site } from "@/lib/site";
import { prerenderFromDb } from "@/lib/static-params";

export const revalidate = 3600;

/** Prerender every published post; new ones are rendered on first request. */
export async function generateStaticParams() {
  return prerenderFromDb("/blog/[slug]", async () => {
    const posts = await publishedPostSlugs();
    return posts.map((p) => ({ slug: p.slug }));
  });
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPublishedPost(params.slug);
  if (!post) return { title: "Not found", robots: { index: false, follow: false } };

  return {
    ...pageMetadata({
      title: post.seoTitle ?? post.title,
      description: post.seoDescription ?? post.excerpt ?? "",
      path: `/blog/${post.slug}`,
    }),
    // An article is not a website, and the distinction is what gets a
    // published/modified date into the card and into a crawler's index.
    openGraph: {
      type: "article",
      url: `${site.url}/blog/${post.slug}`,
      siteName: site.name,
      title: post.seoTitle ?? post.title,
      description: post.seoDescription ?? post.excerpt ?? "",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPublishedPost(params.slug);
  if (!post) notFound();

  // Parsed and sanitised server-side — see lib/markdown.ts for why the
  // sanitiser is not optional even for a trusted author.
  const html = renderMarkdown(post.body);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${site.url}/blog/${post.slug}#article`,
    headline: post.title,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    inLanguage: "en-US",
    wordCount: post.body.trim().split(/\s+/).length,
    timeRequired: `PT${post.readingMinutes}M`,
    articleSection: post.categories.map((c) => c.category.name),
    author: { "@type": "Organization", name: site.name, url: site.url },
    publisher: { "@id": `${site.url}/#pharmacy` },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${site.url}/blog/${post.slug}` },
    isAccessibleForFree: true,
  };

  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([
        { name: "Compounding Notes", path: "/blog" },
        { name: post.title, path: `/blog/${post.slug}` },
      ]))} />
      <script {...jsonLdProps(articleJsonLd)} />

      <article className="section">
        <div className="container-narrow">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-meta text-ink-soft hover:text-brand-600">
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            Compounding Notes
          </Link>

          <header className="mt-8">
            {post.categories.length > 0 && (
              <p className="text-label font-medium uppercase tracking-wide text-cyan-700">
                {post.categories.map((c) => c.category.name).join(" · ")}
              </p>
            )}

            <h1 className="mt-3 text-display-md font-black leading-tight text-ink text-balance md:text-display-lg">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-5 text-intro text-ink-soft text-pretty">{post.excerpt}</p>
            )}

            <p className="mt-6 border-t border-line pt-4 font-mono text-caption text-ink-muted">
              <time dateTime={post.publishedAt?.toISOString()}>
                {post.publishedAt?.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </time>
              {" · "}
              {post.readingMinutes} min read
            </p>
          </header>

          {/* eslint-disable-next-line react/no-danger */}
          <div className="prose-body mt-10 prose-article" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </article>
    </>
  );
}
