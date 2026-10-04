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
    <ul className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {products.map((product, index) => (
        <li key={product.slug}>
          <Link
            href={`/product/${product.slug}`}
            className="group block h-full overflow-hidden rounded-tile border border-line bg-white transition-colors hover:border-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <div className="relative aspect-[4/3] bg-sand">
              <Image
                src={product.image}
                alt=""
                fill
                /* The first row is likely in view on a laptop; the rest are
                   not. Only those get `priority`, because marking all nine
                   would have them compete with each other and with the hero. */
                priority={index < 3}
                sizes="(min-width: 1024px) 21rem, (min-width: 640px) 45vw, 90vw"
                className="object-contain p-6 transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>

            {/* The foot reads as a label, not a caption.
             *
             * It was the name over a dot-joined string — "2.5 mg/mL ·
             * Injectable" — which is the e-commerce default and throws away
             * the two facts a prescriber is actually scanning for. Strength
             * and form are what identify a preparation; set as a ruled pair
             * in the mono register they can be compared down a column of nine
             * cards at a glance, which a run-on caption cannot.
             *
             * `·` as a separator is also the thing every generated page
             * reaches for. Here the structure separates them instead. */}
            <div className="border-t border-line px-5 py-4">
              <h3 className="text-[1.0625rem] font-bold leading-snug text-ink text-balance">
                {product.name}
              </h3>

              {(product.doses || product.form) && (
                <dl className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {product.doses && (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="font-mono text-label uppercase tracking-[0.12em] text-ink-muted">
                        Strength
                      </dt>
                      <dd className="text-caption font-medium tabular-nums text-ink-soft">
                        {product.doses}
                      </dd>
                    </div>
                  )}
                  {product.form && (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="font-mono text-label uppercase tracking-[0.12em] text-ink-muted">
                        Form
                      </dt>
                      <dd className="text-caption font-medium text-ink-soft">
                        {product.form}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
