"use client";

import { useState } from "react";
import type { FormularyProduct } from "@/lib/catalogue";
import Link from "next/link";
import { Icon } from "@/components/icons/set";
import { ProductCard } from "@/components/ProductCard";
import { formulary } from "@/lib/content";
import type { Category } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * The formulary, laid out as the owner's document lays it out: category pills
 * across the top, then one titled section per specialty.
 *
 * A category with nothing published yet is shown rather than hidden, with a
 * "Request Formulary" panel in place of a grid. That is deliberate — the
 * pharmacy compounds in these specialties today even where the public listing
 * isn't written, so hiding them would understate what it offers, and showing
 * an empty grid would look broken.
 *
 * Only the pill state is client-side; every section and product link is in the
 * server-rendered HTML, so the whole formulary is crawlable and works without
 * JavaScript.
 */
export function Formulary({
  groups,
}: {
  groups: { category: Category; items: FormularyProduct[] }[];
}) {
  const [active, setActive] = useState("all");

  const visible =
    active === "all" ? groups : groups.filter((g) => g.category.slug === active);

  return (
    <>
      {/* ---- Category pills ---- */}
      {/* 94% opaque, like the nav panel above it — at 92% on the new ground
          the product cards showed through the pill rail as they scrolled
          under it. */}
      <div className="sticky top-[var(--chrome-h-condensed)] z-30 border-b border-hair bg-paper/[0.94] backdrop-blur">
        <div className="container-x py-4">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            <button
              type="button"
              onClick={() => setActive("all")}
              aria-pressed={active === "all"}
              className={cn("chip shrink-0", active === "all" && "chip-active")}
            >
              All Categories
            </button>
            {groups.map((g) => (
              <button
                key={g.category.slug}
                type="button"
                onClick={() => setActive(g.category.slug)}
                aria-pressed={active === g.category.slug}
                className={cn(
                  "chip shrink-0",
                  active === g.category.slug && "chip-active"
                )}
              >
                {g.category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Category sections ---- */}
      <div className="container-x py-14 md:py-20">
        <div className="space-y-16">
          {visible.map((g) => (
            <section key={g.category.slug} id={g.category.slug} className="scroll-mt-44">
              {/* One hairline, not a 2px rule. The heavy rule was doing the
                  job of a heading weight; the reference gets the same
                  separation from a 28px Satoshi 400 above a single hairline,
                  which keeps the page quiet when eleven of these stack. */}
              <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-hair pb-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[1.75rem] font-normal tracking-title text-navy">
                    <Link
                      href={`/products/${g.category.slug}`}
                      className="transition-colors hover:text-brand-600"
                    >
                      {g.category.name}
                    </Link>
                  </h2>
                  <p className="mt-1 text-[0.9375rem] text-ink-soft text-pretty">
                    {g.category.blurb}
                  </p>
                </div>

                <span className="shrink-0 font-mono text-caption font-medium uppercase tracking-wider text-ink-muted">
                  {g.items.length > 0
                    ? `${g.items.length} ${g.items.length === 1 ? "product" : "products"}`
                    : formulary.comingSoon.badge}
                </span>
              </header>

              {g.items.length > 0 ? (
                <div
                  className="mt-8 grid gap-4"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 15.625rem), 1fr))" }}
                >
                  {g.items.map((p) => (
                    <ProductCard key={p.slug} product={p} />
                  ))}
                </div>
              ) : (
                /* Left-aligned, on the page ground, one dashed hairline.
                   Centred text in a filled 2px-dashed box read as an error
                   state; this category simply has nothing in it yet. */
                <div className="mt-8 flex flex-col items-start gap-2.5 rounded-card border border-dashed border-hair-strong px-7 py-10">
                  <p className="text-[1.25rem] font-medium text-navy">
                    {formulary.comingSoon.title}
                  </p>
                  <p className="max-w-[46ch] text-[0.9375rem] text-ink-soft text-pretty">
                    {formulary.comingSoon.body}
                  </p>
                  <Link href={formulary.comingSoon.cta.href} className="btn btn-primary mt-1.5">
                    {formulary.comingSoon.cta.label}
                  </Link>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* ---- Prescription notice ----
            Required in substance, not decoration: this states that nothing here
            can be bought directly and that every compound needs a patient-
            specific prescription. */}
        <aside className="mt-16 flex items-start gap-4 rounded-[1.25rem] border border-hair-soft bg-white px-6 py-5">
          <Icon name="rx" className="mt-0.5 h-5 w-5 text-cyan-700" />
          <p className="text-meta text-ink-soft text-pretty">
            <strong className="font-bold text-ink">
              {formulary.rxNotice.label}
            </strong>{" "}
            {formulary.rxNotice.body}
          </p>
        </aside>
      </div>
    </>
  );
}
