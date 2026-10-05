import type { Metadata } from "next";
import Image from "next/image";
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
            /* TWO COLUMNS, NOT THREE.
               At three across, the cover was a 24rem strip and every one of
               these photographs is of a vial on a bench — detail that simply
               does not survive being shown that small. Two across roughly
               doubles the area the image gets, which is the difference
               between a thumbnail and a photograph. Four posts also happen to
               land as a clean 2x2 rather than a row of three and an orphan. */
            <ul className="grid gap-x-7 gap-y-10 md:grid-cols-2">
              {posts.map((post) => (
                <li key={post.slug}>
                  <article className="card card-hover group h-full overflow-hidden p-0">
                    <Link href={`/blog/${post.slug}`} className="flex h-full flex-col">
                      {/* The cover, bled to the card's top edge.
                          Served through /api/uploads rather than a public S3
                          URL: the bucket is private and every read goes
                          through the app, which is what keeps an uploaded
                          licence and a blog cover under the same rule. */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-sand">
                        {post.cover ? (
                          <Image
                            src={`/api/uploads/${post.cover.key}`}
                            alt={post.cover.alt ?? ""}
                            fill
                            /* Matches the two-column layout. These were still
                               describing the old three-column grid, so the
                               browser was handed a candidate about half the
                               width it needed and upscaled it. */
                            sizes="(min-width: 768px) 46vw, 92vw"
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          />
                        ) : (
                          /* A post with no cover used to render no image
                             element at all, so one coverless post in a grid
                             of covered ones collapsed to half the height of
                             its neighbours and broke the row. The tile holds
                             the shape. */
                          <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-sand to-white" />
                        )}
                      </div>

                      {/* `flex-1`, not `h-full`. On a flex child `h-full`
                          resolves against the container rather than the space
                          left over, so the text block claimed the card's full
                          height next to an image that was already using part
                          of it. */}
                      <div className="flex flex-1 flex-col p-7">
                        {post.categories.length > 0 && (
                          <p className="text-label font-semibold uppercase tracking-[0.12em] text-brand-700">
                            {post.categories.map((c) => c.category.name).join(" · ")}
                          </p>
                        )}

                        <h2 className="mt-3 text-[1.3125rem] font-bold leading-[1.25] text-ink text-balance">
                          {post.title}
                        </h2>

                        {post.excerpt && (
                          <p className="mt-3 text-meta leading-relaxed text-ink-soft text-pretty">
                            {post.excerpt}
                          </p>
                        )}

                        <p className="mt-auto flex items-center gap-2 pt-6 text-caption text-ink-muted">
                          <time dateTime={post.publishedAt?.toISOString()}>
                            {post.publishedAt?.toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                              timeZone: "UTC",
                            })}
                          </time>
                          <span aria-hidden className="h-3 w-px bg-line" />
                          {post.readingMinutes} min read
                        </p>
                      </div>
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
