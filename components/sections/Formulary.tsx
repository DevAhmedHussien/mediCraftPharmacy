"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FormularyProduct } from "@/lib/catalogue";
import { ProductCard } from "@/components/ProductCard";
import type { Category } from "@/lib/data";
import type { CategoryMedia } from "@/lib/media";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The formulary: category pills across the top, then one titled section per
 * category, each opening with its own image and its live product count.
 *
 * THE PILLS WRAP, AND BECOME A SELECT ON A PHONE. They used to sit in an
 * `overflow-x-auto` rail, which on desktop cut the list off mid-word at
 * "Pain Man…" and on mobile put a 1,709px row inside a 343px container with
 * no arrow and no scroll hint — seven of the eleven categories were
 * unreachable unless you guessed the rail could be dragged.
 *
 * Wrapping fixes the desktop case in one line. It does not fix the phone:
 * eleven pills wrap to six rows at 375px, and this rail is sticky, so that
 * is 300px of a 667px screen permanently occupied. Below `sm` the same state
 * drives a `<select>` instead — one row, every category, no sideways scroll.
 *
 * EACH SECTION SHOWS A SAMPLE, NOT THE WHOLE CATEGORY. Weight Management is
 * 116 products; rendering all ten categories in full is 692 cards and about a
 * megabyte of flight data for a page that exists to help someone choose a
 * category. The heading carries the real count and links to the category page,
 * which lists everything.
 */
export function Formulary({
  groups,
  totalCount,
}: {
  groups: {
    category: Category;
    items: FormularyProduct[];
    image: CategoryMedia;
  }[];
  /** The "All Categories" figure — every published product, not just the shown ones. */
  totalCount: number;
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
          {/* A select below `sm`, pills above it.
           *
           * Wrapping fixed the sideways scroll, but eleven pills wrap to six
           * rows on a 375px phone — roughly 300px of a 667px screen, stuck to
           * the top because this rail is sticky. The brief allows a drop-down
           * on mobile for exactly this reason. One control, one row, same
           * state. */}
          <label className="sm:hidden">
            <span className="sr-only">Filter the formulary by category</span>
            <select
              value={active}
              onChange={(event) => setActive(event.target.value)}
              className={fieldClass}
            >
              <option value="all">All Categories ({totalCount})</option>
              {groups.map((g) => (
                <option key={g.category.slug} value={g.category.slug}>
                  {g.category.name} ({g.category.count})
                </option>
              ))}
            </select>
          </label>

          <div className="hidden flex-wrap gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setActive("all")}
              aria-pressed={active === "all"}
              className={cn("chip", active === "all" && "chip-active")}
            >
              All Categories{" "}
              <span className="font-mono text-[0.8125em] tabular-nums opacity-70">
                {totalCount}
              </span>
            </button>
            {groups.map((g) => (
              <button
                key={g.category.slug}
                type="button"
                onClick={() => setActive(g.category.slug)}
                aria-pressed={active === g.category.slug}
                className={cn("chip", active === g.category.slug && "chip-active")}
              >
                {g.category.name}{" "}
                {/* Mono and tabular: the count is data sitting beside a name,
                    and ten pills whose figures do not share a column read as
                    noise. */}
                <span className="font-mono text-[0.8125em] tabular-nums opacity-70">
                  {g.category.count}
                </span>
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
              <header className="flex flex-wrap items-center gap-x-5 gap-y-4 border-b border-hair pb-5">
                {/* The category's own image, at the size of a thumbnail rather
                    than a banner: it identifies the section, it is not the
                    subject of it. */}
                <div
                  className={cn(
                    "relative hidden h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-hair-soft sm:block",
                    g.image.fit === "contain" ? "bg-stone p-2" : "bg-stone"
                  )}
                >
                  <Image
                    src={g.image.src}
                    alt=""
                    fill
                    sizes="80px"
                    className={g.image.fit === "contain" ? "object-contain" : "object-cover"}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[1.5rem] font-normal tracking-title text-navy sm:text-[1.75rem]">
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
                  {g.category.count} {g.category.count === 1 ? "product" : "products"}
                </span>
              </header>

              <div
                className="mt-8 grid gap-4"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 15.625rem), 1fr))",
                }}
              >
                {g.items.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>

              {/* Only when there is more than what is shown — otherwise the
                  link promises a page that adds nothing. */}
              {g.category.count > g.items.length && (
                <div className="mt-6">
                  <Link
                    href={`/products/${g.category.slug}`}
                    className="btn btn-ghost"
                  >
                    View all {g.category.count} in {g.category.name}
                  </Link>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
