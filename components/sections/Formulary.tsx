"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/set";
import { ProductCard } from "@/components/ProductCard";
import { formulary } from "@/lib/content";
import type { Category, Product } from "@/lib/data";
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
  groups: { category: Category; items: Product[] }[];
}) {
  const [active, setActive] = useState("all");

  const visible =
    active === "all" ? groups : groups.filter((g) => g.category.slug === active);

  return (
    <>
      {/* ---- Category pills ---- */}
      <div className="sticky top-[var(--chrome-h-condensed)] z-30 border-b border-line bg-white/92 backdrop-blur">
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
                <Icon name={g.category.icon} className="h-4 w-4" />
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
              <header className="flex flex-wrap items-center gap-4 border-b-2 border-line pb-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.7rem] bg-brand-500/10 text-brand-600">
                  <Icon name={g.category.icon} className="h-[1.3rem] w-[1.3rem]" />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="text-[1.25rem] font-black text-ink">
                    <Link
                      href={`/products/${g.category.slug}`}
                      className="transition-colors hover:text-brand-600"
                    >
                      {g.category.name}
                    </Link>
                  </h2>
                  <p className="mt-0.5 text-meta text-ink-muted text-pretty">
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
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {g.items.map((p) => (
                    <ProductCard key={p.slug} product={p} />
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-tile border-2 border-dashed border-line bg-sand px-6 py-14 text-center">
                  <p className="text-[1.0625rem] font-bold text-ink">
                    {formulary.comingSoon.title}
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-meta text-ink-soft text-pretty">
                    {formulary.comingSoon.body}
                  </p>
                  <Link
                    href={formulary.comingSoon.cta.href}
                    className="btn-primary mt-6 inline-flex"
                  >
                    {formulary.comingSoon.cta.label} <span aria-hidden>→</span>
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
        <aside className="mt-16 flex items-start gap-4 rounded-tile border border-line bg-sand px-6 py-5">
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
