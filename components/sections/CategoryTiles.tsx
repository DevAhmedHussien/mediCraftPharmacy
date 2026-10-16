import Image from "next/image";
import Link from "next/link";

import type { Category } from "@/lib/data";
import { categoryImage } from "@/lib/media";

/**
 * The formulary categories as photo tiles, one per category, each linking to
 * its section of the formulary. Shared by the home page and /providers, so
 * the two show the same cards.
 */
export function CategoryTiles({
  categories,
}: {
  categories: Pick<Category, "slug" | "name" | "count">[];
}) {
  /* Every category, not a selection: `categoryImage` names a file for each
     slug, so none renders without a picture. */
  return (
    <ul className="reveal-group grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {categories.map((c) => {
        const art = categoryImage(c.slug);
        return (
          <li key={c.slug}>
            {/* The photograph at its own 4:3, whole, with the name under
                it. These tiles used to be 3:4 with the name on glass over
                the image: a landscape photo cropped to a portrait frame
                lost nearly half its width, and a hover zoom then scaled
                what was left. A photo shown at its own shape and size is
                the one that looks sharp. */}
            <Link
              href={`/products/${c.slug}`}
              className="group flex flex-col gap-3 rounded-card focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
            >
              <span className="relative block aspect-[4/3] overflow-hidden rounded-card border border-hair-soft bg-stone">
                <Image
                  src={art.src}
                  alt=""
                  fill
                  sizes="(min-width: 1536px) 270px, (min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw"
                  className={art.fit === "contain" ? "object-contain p-3" : "object-cover"}
                />
              </span>
              <span className="flex items-baseline justify-between gap-2 px-1 text-[14.5px] font-medium text-navy transition-colors group-hover:text-brand-600 motion-reduce:transition-none">
                <span className="min-w-0 truncate">{c.name}</span>
                {/* The count is data beside a name, so mono and tabular —
                    ten tiles whose figures do not share a column read as
                    noise rather than as a set. */}
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-ink-muted">
                  {c.count}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
