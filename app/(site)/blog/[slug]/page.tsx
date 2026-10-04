import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { renderMarkdown } from "@/lib/markdown";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import { getPublishedPost } from "@/lib/services/blog";
import { site } from "@/lib/site";

export const revalidate = 3600;

/** Prerender every published post; new ones are rendered on first request. */
/* Rendered per request.
 *
 * This route used to read its paths from Postgres at build time, and
 * lib/static-params.ts degrades to zero paths when no database is reachable
 * — which is exactly what happens inside `docker build`, by design. Next
 * then treats the route as static with no prerendered paths and renders it
 * on demand in a STATIC context, where the (site) layout's `auth()` call
 * throws DYNAMIC_SERVER_USAGE and the request 500s.
 *
 * Locally the database is up, every path is prerendered to a file, and no
 * page ever re-renders — so the build is green, the local site is perfect,
 * and every one of these pages is a 500 in production. This is the line
 * that makes the two environments agree.
 *
 * `generateStaticParams` is GONE rather than kept. Next 14 prioritises it
 * over this directive — with both present the route is still prerendered
 * and the 500 comes back — so the two cannot coexist. Nothing is lost: the
 * layout's session read makes every page here dynamic anyway, so the
 * prerendering only ever took effect in a local build and never in the
 * image that actually serves production.
 */
export const dynamic = "force-dynamic";

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

          {/* The cover, between the header and the body rather than above
              the title: the headline is what a reader came for, and a
              full-bleed photograph before it pushes the thing they are
              looking for below the fold on a phone. */}
          {post.cover && (
            <figure className="relative mt-10 aspect-[16/9] overflow-hidden rounded-tile border border-line bg-sand">
              <Image
                src={`/api/uploads/${post.cover.key}`}
                alt={post.cover.alt ?? ""}
                fill
                priority
                sizes="(min-width: 1024px) 50rem, 94vw"
                className="object-cover"
              />
            </figure>
          )}

          {/* eslint-disable-next-line react/no-danger */}
          <div className="prose-body mt-10 prose-article" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </article>
    </>
  );
}
