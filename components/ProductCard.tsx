import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";

/**
 * Formulary tile.
 *
 * Bordered and shadowed to match the rest of the card system — on a clinical
 * site a product needs to read as a discrete record, not as an editorial
 * lifestyle image. The strength and dosage form are set in the mono reserved
 * for pharmaceutical data, so a prescriber scanning a grid can compare
 * strengths down a column.
 *
 * The packshot is served through next/image, so each tile gets a responsive
 * srcset and AVIF/WebP conversion rather than the full 1257×1600 render.
 */
export function ProductCard({ product: p }: { product: Product }) {
  return (
    <article className="group h-full">
      <Link
        href={`/product/${p.slug}`}
        className="card card-hover flex h-full flex-col p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <div className="relative aspect-square overflow-hidden rounded-[0.6rem] bg-sand">
          <Image
            src={p.image}
            alt={`${p.name} — ${p.form}, ${p.doses}`}
            fill
            sizes="(min-width: 1280px) 260px, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </div>

        <div className="flex flex-1 flex-col px-2 pb-1 pt-4">
          <p className="text-label font-medium uppercase text-cyan-700">
            {p.category}
          </p>

          <h3 className="mt-2 text-[1.0625rem] font-bold leading-snug text-ink transition-colors duration-200 group-hover:text-brand-600 text-balance">
            {p.name}
          </h3>

          <p className="mt-2 text-meta text-ink-soft text-pretty">{p.blurb}</p>

          <p className="mt-auto pt-4 font-mono text-caption text-ink-muted">
            {p.doses} · {p.form}
          </p>
        </div>
      </Link>
    </article>
  );
}
