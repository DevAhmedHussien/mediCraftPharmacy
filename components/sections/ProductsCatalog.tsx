"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import type { Category, Product } from "@/lib/data";

const selectClass =
  "rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-ink outline-none transition-colors hover:border-brand-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

/**
 * Full catalog with a Category / Dosage-form filter bar — mirrors the layout of
 * the reference site's /products page (filters row above a responsive grid).
 * Filtering is client-side; the initial full grid is server-rendered.
 */
export function ProductsCatalog({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [cat, setCat] = useState("all");
  const [form, setForm] = useState("all");

  const forms = useMemo(
    () => Array.from(new Set(products.map((p) => p.form))).sort(),
    [products]
  );

  const filtered = products.filter(
    (p) =>
      (cat === "all" || p.categorySlug === cat) &&
      (form === "all" || p.form === form)
  );

  const hasFilters = cat !== "all" || form !== "all";
  const clear = () => {
    setCat("all");
    setForm("all");
  };

  return (
    <>
      {/* Filter bar */}
      <div className="sticky top-20 z-30 border-y border-brand-100 bg-sand/90 backdrop-blur">
        <div className="container-x flex flex-wrap items-center gap-3 py-4">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </span>

          <label className="sr-only" htmlFor="filter-category">
            Category
          </label>
          <select
            id="filter-category"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className={selectClass}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="filter-form">
            Dosage form
          </label>
          <select
            id="filter-form"
            value={form}
            onChange={(e) => setForm(e.target.value)}
            className={selectClass}
          >
            <option value="all">All dosage forms</option>
            {forms.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}

          <span className="ml-auto text-sm text-ink-muted">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
          </span>
        </div>
      </div>

      {/* Grid */}
      <section className="bg-white py-14 md:py-20">
        <div className="container-x">
          {filtered.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.name} product={p} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-ink-muted">No products match these filters.</p>
              <button
                type="button"
                onClick={clear}
                className="btn-ghost mt-4"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
