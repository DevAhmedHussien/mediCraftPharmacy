import { InfoCard } from "@/components/blocks";
import { providers } from "@/lib/content";
import type { Category } from "@/lib/data";
import { categoryImage } from "@/lib/media";

/**
 * The formulary categories as cards — photo, name, one-line description and
 * product count — each linking to its section of the formulary. The one
 * category card on the site: the home page and /providers both render this,
 * so they cannot drift apart.
 *
 * Names and counts come from the database through `getCategories()`; the
 * description is `providers.therapeuticAreas.descriptions`, falling back to
 * the category's own blurb for a category added later.
 */
export function CategoryTiles({
  categories,
}: {
  categories: Pick<Category, "slug" | "name" | "blurb" | "count">[];
}) {
  return (
    /* `.reveal-group` is CSS (`animation-timeline: view()`), not a motion
       component: the cards are in the server HTML at full opacity, and a
       reader who asked for reduced motion gets them already in place. */
    <ul className="reveal-group grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c) => (
        <li key={c.slug} className="h-full">
          <InfoCard
            title={c.name}
            body={providers.therapeuticAreas.descriptions[c.slug] ?? c.blurb}
            href={`/products/${c.slug}`}
            media={categoryImage(c.slug)}
            meta={`${c.count} ${c.count === 1 ? "product" : "products"}`}
            className="h-full"
          />
        </li>
      ))}
    </ul>
  );
}
