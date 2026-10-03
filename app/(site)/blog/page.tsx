import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/blocks";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import { listPublishedPosts } from "@/lib/services/blog";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Compounding Notes",
  description:
    "Practical writing from the MediCraft Pharmacy team on USP standards, formulation decisions, sourcing and quality — for prescribers and their staff.",
  path: "/blog",
});

/** Rebuilt at most hourly; a scheduled post goes live on the next pass. */
export const revalidate = 3600;

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();

  /* An ItemList tells a crawler — and an LLM reading the page — that this is a
     collection and what is in it, rather than leaving it to infer structure
     from markup. */
  const itemList = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${site.url}/blog#blog`,
    name: `${site.name} — Compounding Notes`,
    url: `${site.url}/blog`,
    publisher: { "@id": `${site.url}/#pharmacy` },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${site.url}/blog/${p.slug}`,
      datePublished: p.publishedAt?.toISOString(),
      description: p.excerpt ?? undefined,
    })),
  };

  return (
    <>
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "Compounding Notes", path: "/blog" }]))} />
      <script {...jsonLdProps(itemList)} />

      <PageHero
        eyebrow="Compounding Notes"
        title="Writing From the Bench"
        lead="What the standards actually require, why a formulation decision was made, and what to ask a compounding pharmacy before you send it a prescription."
      />

      <section className="section">
        <div className="container-x">
          {posts.length === 0 ? (
            <p className="text-meta text-ink-muted">No posts published yet.</p>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.slug}>
                  <article className="card card-hover group h-full p-6">
                    <Link href={`/blog/${post.slug}`} className="flex h-full flex-col">
                      {post.categories.length > 0 && (
                        <p className="text-label font-medium uppercase tracking-wide text-cyan-700">
                          {post.categories.map((c) => c.category.name).join(" · ")}
                        </p>
                      )}

                      <h2 className="mt-2.5 text-[1.125rem] font-bold leading-snug text-ink text-balance">
                        {post.title}
                      </h2>

                      {post.excerpt && (
                        <p className="mt-2.5 text-meta text-ink-soft text-pretty">{post.excerpt}</p>
                      )}

                      <p className="mt-auto pt-5 font-mono text-caption text-ink-muted">
                        <time dateTime={post.publishedAt?.toISOString()}>
                          {post.publishedAt?.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                        </time>
                        {" · "}
                        {post.readingMinutes} min read
                      </p>
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
