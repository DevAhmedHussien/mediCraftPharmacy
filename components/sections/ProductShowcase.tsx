import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/* ===========================================================================
   Product cards.

   The one place on the marketing site where the catalogue is shown as
   product rather than as a table. Each card is the packshot, the name, the
   strength and the route — the four things a prescriber scans for — and
   nothing else. No price: pricing is per-practice and negotiated, so a number
   here would be wrong for every reader.

   WHY THE IMAGE SITS ON A TINT
   ----------------------------
   The packshots are cut out on transparency. On a white card they float with
   no ground and the card looks unfinished; on a faint blue tint they read as
   product on a surface. The tint is the same `sand` the alternating sections
   use, so the card belongs to the same system rather than introducing a
   fifth colour.

   `sizes` is declared tightly because this grid renders up to nine images
   above the fold on a laptop — the difference between a correct `sizes` and
   a missing one here is roughly a megabyte.
   ========================================================================= */

export type ShowcaseProduct = {
  slug: string;
  name: string;
  doses?: string;
  form?: string;
  image: string;
};

export function ProductShowcase({
  products,
  className,
}: {
  products: readonly ShowcaseProduct[];
  className?: string;
}) {
  return (
    /* `auto-fill` at a 250px floor, as the reference has it, instead of
       1 / 2 / 3 at named breakpoints. A fixed three-up left a 1120px grid
       with cards 347px wide — wider than the packshot inside them, so every
       tile was mostly empty plate. The floor lets a wide viewport fit four. */
    <ul
      className={cn("grid gap-4", className)}
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 15.625rem), 1fr))" }}
    >
      {products.map((product, index) => (
        <li key={product.slug}>
          <Link
            href={`/product/${product.slug}`}
            className="group flex h-full flex-col gap-3.5 rounded-card border border-hair-soft bg-white/70 p-3 transition-colors hover:bg-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {/* The plate is a surface the packshot sits ON, not a frame around
                it: 16px radius inside the card's 24px, stone rather than white,
                and the image held at 88% so the vial never touches an edge. */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone">
              <Image
                src={product.image}
                alt=""
                fill
                /* The first row is likely in view on a laptop; the rest are
                   not. Only those get `priority`, because marking all nine
                   would have them compete with each other and with the hero. */
                priority={index < 4}
                sizes="(min-width: 1120px) 16rem, (min-width: 640px) 45vw, 90vw"
                className="object-contain p-[6%] transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
              />
            </div>

            {/* Strength and form run ABOVE the name, in the mono register.
             *
             * They were a ruled dl underneath — two rows of label/value per
             * card, which is nine ruled tables on one page and reads as a
             * spreadsheet. Set as one mono line on top they still compare
             * cleanly down a column, because they all start at the same x and
             * all sit in the same typeface, and they cost one line instead of
             * five. This is what the reference does. */}
            <div className="flex flex-col gap-1.5 px-2 pb-2">
              {(product.doses || product.form) && (
                <p className="font-mono text-[0.6875rem] tracking-[0.06em] text-ink-muted">
                  {[product.doses, product.form].filter(Boolean).join(" · ")}
                </p>
              )}
              <h3 className="text-[1.0625rem] font-medium leading-[1.3] text-navy text-balance">
                {product.name}
              </h3>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
