import Link from "next/link";
import type { FormularyProduct } from "@/lib/catalogue";

/**
 * Formulary tile, text only — no packshot.
 *
 * Strength and form sit at the top, in the mono register reserved for
 * pharmaceutical data, so they line up across a row of tiles. The category
 * keeps its own line above them for /products/[category] and the related
 * shelf, where there is no category heading.
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
