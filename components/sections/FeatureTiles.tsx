import { Icon, type IconName } from "@/components/icons/set";
import { cn } from "@/lib/utils";

/* ===========================================================================
   A row of short, icon-led claims.

   The opening move under a hero: four things the reader gets, each one line of
   label and two of substance. Deliberately not cards — no border, no shadow,
   no tinted box. On a white page four boxes in a row read as chrome; four
   columns of type with a small mark above each read as content.

   Data-driven so /providers, /quality and /compounding can use the same row
   with their own items rather than each growing a private copy of it.
   ========================================================================= */

export type FeatureTile = {
  icon: string;
  title: string;
  body: string;
};

export function FeatureTiles({
  items,
  className,
}: {
  items: readonly FeatureTile[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-10",
        className
      )}
    >
      {items.map((item) => (
        <li key={item.title}>
          {/* The mark sits in brand blue and never changes on hover. An icon
              that lights up under the cursor implies the tile is a link; these
              are statements, and nothing here is clickable. */}
          <Icon
            name={item.icon as IconName}
            className="h-7 w-7 text-brand-600"
            strokeWidth={1.6}
          />
          <h3 className="mt-5 text-[1.0625rem] font-bold leading-snug text-ink text-balance">
            {item.title}
          </h3>
          <p className="mt-2.5 text-meta leading-relaxed text-ink-soft text-pretty">
            {item.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
