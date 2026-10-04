import { IconCard } from "@/components/blocks";
import { Stagger, StaggerItem } from "@/components/motion/Motion";
import { Reveal } from "@/components/ui/Reveal";
import { BrandFigure } from "@/components/sections/BrandFigure";
import type { Media } from "@/lib/media";
import { cn } from "@/lib/utils";

/* ===========================================================================
   A column of cards with a picture beside it.

   The shape three sections on this site want: a set of related points, and one
   image that says what they are about.

   WHY THIS REPLACED THE PINNED STACK
   ----------------------------------
   These used to be `StickyStack` — each card pinning in turn as you scrolled,
   piling up over the one before. The argument for it was that the stack *was*
   the sequence: you could not reach card three without passing card two.

   In practice it cost a screenful of scroll per card, hijacked the page's
   scrolling to animate something the reader had already understood, and made
   the content impossible to skim — you could not see step four and step one at
   the same time to compare them. A column of cards shows all of them at once
   and is still in document order for anyone reading with a screen reader.

   THE PICTURE IS NOT CROPPED
   --------------------------
   `BrandFigure` renders at the asset's own ratio inside a rounded frame, so
   this works for a portrait studio vial and a landscape photograph of the pack
   station without either being letterboxed or decapitated. The earlier version
   forced everything into a 4:5 box and cut the cap off the vial.
   ========================================================================= */

export type CardItem = {
  title: string;
  body: string;
};

export function CardsBesideFigure({
  items,
  image,
  eyebrow,
  /** Which side the picture sits on at `lg` and up. */
  imageSide = "left",
  className,
}: {
  items: readonly CardItem[];
  image: Media;
  eyebrow?: string;
  imageSide?: "left" | "right";
  className?: string;
}) {
  const figure = (
    <Reveal className={cn(imageSide === "right" && "order-2 lg:order-2")}>
      {eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>}
      <BrandFigure
        variant="framed"
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes="(min-width: 1024px) 34rem, 90vw"
      />
    </Reveal>
  );

  const cards = (
    <Stagger className={cn("grid gap-5", imageSide === "right" && "order-1 lg:order-1")}>
      {items.map((item) => (
        <StaggerItem key={item.title}>
          <IconCard title={item.title} body={item.body} />
        </StaggerItem>
      ))}
    </Stagger>
  );

  return (
    <div className={cn("grid items-start gap-10 lg:grid-cols-2 lg:gap-14", className)}>
      {imageSide === "left" ? (
        <>
          {figure}
          {cards}
        </>
      ) : (
        <>
          {cards}
          {figure}
        </>
      )}
    </div>
  );
}
