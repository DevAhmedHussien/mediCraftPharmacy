import Link from "next/link";
import type { FormularyProduct } from "@/lib/catalogue";

/**
 * Formulary tile, text only — used in the related shelf on /product/[slug].
 *
 * Strength and form sit at the top, in the mono register reserved for
 * pharmaceutical data, so they line up across a row of tiles. The category
 * keeps its own line above them because the related shelf has no category
 * heading of its own.
 */
export function ProductCard({
  product: p,
  headingLevel = 3,
}: {
  /* The narrow shape, not the full catalogue entry. A full
     `CatalogueProduct` still satisfies it structurally, so server-rendered
     callers pass theirs unchanged — but the client boundary now carries
     seven fields instead of the whole record. */
  product: FormularyProduct;
  /**
   * Where this card sits in the page's outline.
   *
   * On /products each card lives under a category `h2`, so `h3` is right.
   * On /products/[category] the grid IS the page's content, directly under
   * the h1 — leaving it at `h3` took the outline from level 1 to level 3 and
   * a screen reader heard a subsection of something never announced.
   */
  headingLevel?: 2 | 3;
}) {
  const Heading = (headingLevel === 2 ? "h2" : "h3") as "h2" | "h3";

  /* No packshot. Per the 3 November brief the formulary reads as a list:
     most preparations have no render of their own, and a category
     photograph repeated down a column of tiles said nothing the category
     heading had not already said. */
  return (
    <article className="group h-full">
      <Link
        href={`/product/${p.slug}`}
        className="flex h-full flex-col gap-1.5 rounded-card border border-hair-soft bg-white/70 px-5 py-4 transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 motion-reduce:transition-none"
      >
        <p className="font-mono text-[0.6875rem] uppercase tracking-eyebrow text-brand-500">
          {p.category}
        </p>

        <p className="font-mono text-[0.6875rem] tracking-[0.06em] text-ink-muted">
          {p.doses} · {p.form}
        </p>

        {/* `break-words` and no `text-balance`.
            The formulary is full of names like "B-Complex
            Niacinamide/Pyridoxine/Thiamine/Dexpanthenol/Riboflavin" — one
            unbroken 46-character token as far as the layout is concerned,
            which overflowed the card and printed across its neighbour.
            Balancing made it worse by preferring fewer, longer lines. */}
        <Heading className="break-words text-[1.0625rem] font-medium leading-[1.3] text-navy">
          {p.name}
        </Heading>

        <p className="text-[0.875rem] leading-[1.5] text-ink-soft text-pretty">
          {p.blurb}
        </p>
      </Link>
    </article>
  );
}

/**
 * The formulary as a list: one row per preparation, no image. Used on
 * /products under each category heading and on /products/[category].
 */
export function ProductList({
  products,
  headingLevel = 3,
}: {
  products: FormularyProduct[];
  headingLevel?: 2 | 3;
}) {
  const Heading = (headingLevel === 2 ? "h2" : "h3") as "h2" | "h3";

  return (
    <ul className="divide-y divide-hair border-y border-hair">
      {products.map((p) => (
        <li key={p.slug}>
          <Link
            href={`/product/${p.slug}`}
            className="group flex flex-col gap-x-6 gap-y-1 py-4 transition-colors hover:bg-white/60 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 motion-reduce:transition-none sm:flex-row sm:items-baseline sm:px-3"
          >
            <div className="min-w-0 flex-1">
              <Heading className="break-words text-[1.0625rem] font-medium leading-[1.3] text-navy group-hover:text-brand-600">
                {p.name}
              </Heading>
              <p className="mt-1 text-[0.875rem] leading-[1.5] text-ink-soft text-pretty">
                {p.blurb}
              </p>
            </div>

            <p className="shrink-0 font-mono text-[0.6875rem] tracking-[0.06em] text-ink-muted sm:text-right">
              {p.doses} · {p.form}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
