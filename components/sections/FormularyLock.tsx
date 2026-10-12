import Image from "next/image";
import Link from "next/link";

import { Icon } from "@/components/icons/set";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ===========================================================================
   What stands where the product grid stands for everybody else.

   The count is the point. A visitor who cannot see the preparations should
   still be able to see that there are 116 of them — that figure is the
   pharmacy's answer to "how deep is your formulary", and it is the one piece
   of the catalogue the 12 October brief keeps public.

   A SHIELD, NOT A PADLOCK. The icon set has no padlock, and `shield` is
   `ShieldCheck` — which says "verified" rather than "forbidden". That is the
   more accurate sentence here: the formulary is not a secret, it is for
   partners the pharmacy has checked.

   SERVER COMPONENT. Two links and a paragraph; nothing here needs state, and
   this renders on `/products` inside a client boundary already paying for a
   filter.
   ========================================================================= */

export function FormularyLock({
  /** How many preparations sit behind the gate. Named, not implied. */
  count,
  /** The category this stands in for, or absent on the formulary index. */
  categoryName,
  /** Where to return the visitor after they sign in. */
  returnTo,
  /**
   * 2 on a category page, where this panel is the first thing under the h1
   * and an h3 would skip a level; 3 on the index, where the category list
   * above it already supplies the h2s. Same prop, same reason, as
   * `ProductCard` — the panel stands in for the grid, so it inherits the
   * grid's heading problem.
   */
  headingLevel = 3,
  className,
}: {
  count: number;
  categoryName?: string;
  returnTo: string;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = (headingLevel === 2 ? "h2" : "h3") as "h2" | "h3";
  const noun = count === 1 ? "formulation" : "formulations";
  const where = categoryName ? `in ${categoryName}` : "across the formulary";

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-card border border-hair-soft bg-white/70 px-6 py-12 text-center",
        className
      )}
    >
      {/* The pale-blue callout plate, which is what `tint` is for — a panel
          that interrupts a page without alarming anyone. */}
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tint">
        <Icon name="shield" className="h-6 w-6 text-brand-600" aria-hidden />
      </span>

      <div className="flex max-w-[440px] flex-col gap-2">
        <Heading className="text-[19px] font-medium text-navy">
          Formulary access is for verified partners
        </Heading>
        <p className="text-[15px] leading-relaxed text-ink-soft text-pretty">
          {/* `tabular-nums` so the figure reads as data, and mono because the
              design system reserves that register for exactly this. */}
          <span className="font-mono tabular-nums">{count}</span> {noun} {where}{" "}
          {count === 1 ? "is" : "are"} available to prescribers with a verified
          MediCraft account. Sign in to browse them, or open an account and a
          pharmacy liaison will respond within one business day.
        </p>
      </div>

      <div className="mt-1 flex flex-wrap justify-center gap-3">
        <Button asChild>
          {/* `next` is the same contract `requirePartnerPage` uses, so a
              partner lands back on the category they were looking at rather
              than on the portal dashboard. */}
          <Link href={`/login?next=${encodeURIComponent(returnTo)}`}>Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/work-with-us">Open an Account</Link>
        </Button>
      </div>
    </div>
  );
}

/* ===========================================================================
   The formulary index, for a visitor who may not browse it.

   Deliberately the same row as the open page's section header — thumbnail,
   name, blurb, count — minus the grid under it. A gated page that invents its
   own layout reads as a different site; this one reads as the same page with
   the cards not yet loaded, which is the honest description of it.

   A SERVER COMPONENT, AND THAT IS THE POINT. `Formulary` is a client
   component so its category filter needs no round trip, which means every
   product handed to it is serialised into the HTML as flight data. A gate
   that ships the names it is hiding is not a gate. The locked branch never
   constructs that list at all — see app/(site)/products/page.tsx, which skips
   the product queries outright.
   ========================================================================= */

export function FormularyCategoryList({
  categories,
}: {
  categories: {
    slug: string;
    name: string;
    blurb: string;
    count: number;
    image: { src: string; fit: "cover" | "contain" };
  }[];
}) {
  return (
    <ul className="divide-y divide-hair border-y border-hair">
      {categories.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/products/${c.slug}`}
            className="flex flex-wrap items-center gap-x-5 gap-y-3 py-5 transition-colors hover:bg-white/60 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 motion-reduce:transition-none"
          >
            <div
              className={cn(
                "relative hidden h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-hair-soft bg-stone sm:block",
                c.image.fit === "contain" && "p-2"
              )}
            >
              <Image
                src={c.image.src}
                alt=""
                fill
                sizes="64px"
                className={c.image.fit === "contain" ? "object-contain" : "object-cover"}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[1.25rem] font-normal tracking-title text-navy">
                {c.name}
              </h2>
              <p className="mt-1 text-[0.9375rem] text-ink-soft text-pretty">{c.blurb}</p>
            </div>

            <span className="shrink-0 font-mono text-caption font-medium uppercase tracking-wider text-ink-muted">
              {c.count} {c.count === 1 ? "product" : "products"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
