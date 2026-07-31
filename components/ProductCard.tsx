import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";

/**
 * Apple-style product tile. Deliberately has no card background or border —
 * a rounded image plate with the text set beneath it on the page surface,
 * which is how Apple's lineup grids read. That also makes the tile
 * background-agnostic, so it works unchanged on white sections and on grey
 * bands. Hover is restrained: the image inches in and the title turns blue;
 * Apple's tiles never lift or drop shadows.
 *
 * The packshot is served through next/image, so each tile gets a responsive
 * srcset and AVIF/WebP conversion rather than the full 1257x1600 render. The
 * plate is white to match the render's own background, so the two blend with no
 * visible seam on either page surface.
 */
export function ProductCard({ product: p }: { product: Product }) {
  return (
    <article className="group h-full">
      <Link
        href={`/product/${p.slug}`}
        className="flex h-full flex-col rounded-tile focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-4"
      >
        <div className="relative aspect-square overflow-hidden rounded-tile bg-white">
          <Image
            src={p.image}
            alt={`${p.name} — ${p.form}, ${p.doses}`}
            fill
            sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </div>

        <div className="flex flex-1 flex-col pt-5">
          <p className="text-caption font-semibold uppercase tracking-[0.06em] text-ink-muted">
            {p.category}
          </p>

          <h3 className="mt-1.5 text-[1.3125rem] font-semibold leading-snug tracking-[-0.021em] text-ink transition-colors duration-200 group-hover:text-brand-600">
            {p.name}
          </h3>

          <p className="mt-1.5 text-meta text-ink-soft">{p.blurb}</p>

          <p className="mt-3 text-caption text-ink-muted">
            {p.doses} · {p.form}
          </p>

          <span className="mt-4 text-meta text-brand-600 group-hover:underline">
            View details <span aria-hidden>›</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
