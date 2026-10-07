import Image from "next/image";
import Link from "next/link";
import type { FormularyProduct } from "@/lib/catalogue";

/**
 * Formulary tile.
 *
 * Built to the reference's product card: a 24px card at 70% white on the page
 * ground, holding a 16px stone plate with the packshot `contain`ed inside it
 * at 88%.
 *
 * THE PLATE IS A SURFACE, NOT A FRAME. It was `object-cover` on a 9.6px
 * radius, which crops a 1257×1600 portrait packshot to a square — the vial's
 * cap and base were being cut off on every tile in the grid. `contain` with
 * padding shows the whole preparation, which on a formulary is the thing the
 * tile is for.
 *
 * STRENGTH AND FORM MOVED TO THE TOP, in the mono register reserved for
 * pharmaceutical data. They were pinned to the foot with `mt-auto`, so in a
 * grid of cards with blurbs of different lengths they landed at a different
 * height in every tile and could not be compared down a column — which is the
 * entire reason they are set in mono. At the top they all start at the same
 * y and the same x.
 *
 * The category keeps its own line above them, as the reference's product page
 * does with its brand-blue mono eyebrow. It is redundant inside a formulary
 * section that is already headed by the category, and load-bearing on
 * /products/[category] and in the related shelf, where there is no such
 * heading.
 *
 * The packshot is served through next/image, so each tile gets a responsive
 * srcset and AVIF/WebP conversion rather than the full 1257×1600 render.
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
        className="flex h-full flex-col gap-3.5 rounded-card border border-hair-soft bg-white/70 p-3 transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 motion-reduce:transition-none"
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone">
          <Image
            src={p.image}
            alt={`${p.name} — ${p.form}, ${p.doses}`}
            fill
            sizes="(min-width: 1120px) 16rem, (min-width: 640px) 45vw, 90vw"
            className="object-contain p-[6%] transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2">
          <p className="font-mono text-[0.6875rem] uppercase tracking-eyebrow text-brand-500">
            {p.category}
          </p>

          <p className="font-mono text-[0.6875rem] tracking-[0.06em] text-ink-muted">
            {p.doses} · {p.form}
          </p>

          <Heading className="text-[1.0625rem] font-medium leading-[1.3] text-navy text-balance">
            {p.name}
          </Heading>

          <p className="text-[0.875rem] leading-[1.5] text-ink-soft text-pretty">
            {p.blurb}
          </p>
        </div>
      </Link>
    </article>
  );
}
