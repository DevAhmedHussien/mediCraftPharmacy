"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { Carousel } from "@/components/sections/Carousel";
import { ProductCard } from "@/components/ProductCard";
import type { Category, Product } from "@/lib/data";

/**
 * Client-side product browser: the category selector filters the carousel in
 * place (no route change). On mobile it's a horizontal tab row; on desktop it's
 * a sticky vertical sidebar. The default category is server-rendered (SSR).
 */
export function ProductBrowser({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  const [active, setActive] = useState(categories[0]?.slug ?? "");
  const activeCategory =
    categories.find((c) => c.slug === active) ?? categories[0];
  const items = products.filter((p) => p.categorySlug === active);

  return (
    <div>
      {/* Section header */}
      <div className="max-w-2xl">
        <span className="eyebrow">Our Products</span>
        <h2 className="section-title mt-5">
          Compounded therapies, built around the patient
        </h2>
        <p className="mt-4 text-base text-ink-soft sm:text-lg">
          Every preparation is made to order in our lab and dosed to your
          provider&rsquo;s exact specification. Choose a therapeutic area to
          explore the catalog.
        </p>
      </div>

      {/* Mobile / tablet: horizontal category tabs */}
      <div className="-mx-6 mt-8 px-6 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => {
            const isActive = c.slug === active;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => setActive(c.slug)}
                aria-current={isActive ? "true" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-brand-200 bg-white text-brand-800 hover:border-brand-400"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:mt-12 lg:grid-cols-[260px_1fr] lg:gap-14">
        {/* Desktop: sticky vertical sidebar */}
        <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
          <nav
            aria-label="Product categories"
            className="flex flex-col border-y border-brand-100"
          >
            {categories.map((c) => {
              const isActive = c.slug === active;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setActive(c.slug)}
                  aria-current={isActive ? "true" : undefined}
                  className={`group flex items-center justify-between border-b border-brand-100 py-3 text-left text-sm font-medium transition-colors last:border-b-0 ${
                    isActive ? "text-brand-700" : "text-ink-soft hover:text-brand-700"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        isActive ? "bg-brand-600" : "bg-transparent"
                      }`}
                    />
                    {c.name}
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      isActive
                        ? "translate-x-1 text-brand-600"
                        : "text-brand-300 group-hover:translate-x-1 group-hover:text-brand-600"
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          <Link href="/products" className="btn-primary mt-8 w-full">
            View full catalog
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </aside>

        {/* Catalog for the active category — title, then carousel */}
        <div className="min-w-0">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                {activeCategory?.name}
              </h3>
              <p className="mt-2 max-w-xl text-ink-soft">
                {activeCategory?.blurb}
              </p>
            </div>
            <span className="hidden shrink-0 pb-1 text-sm text-ink-muted sm:block">
              {items.length} {items.length === 1 ? "product" : "products"}
            </span>
          </div>

          <Carousel key={active}>
            {items.map((p) => (
              <div
                key={p.name}
                className="min-w-0 flex-[0_0_82%] sm:flex-[0_0_48%] lg:flex-[0_0_47%] xl:flex-[0_0_31.5%]"
              >
                <ProductCard product={p} />
              </div>
            ))}
          </Carousel>

          <Link href="/products" className="btn-ghost mt-8 w-full lg:hidden">
            View full catalog
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
