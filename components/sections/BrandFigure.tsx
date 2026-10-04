import Image from "next/image";

import { cn } from "@/lib/utils";

/* ===========================================================================
   Brand photography, placed correctly for the shot it is.

   The identity's photography comes in two kinds and they cannot be used the
   same way:

     FREE — shot on a clean studio sweep that lifts to pure white.
            mark-glass, vial-blue-front, vial-clear-front, vial-clear-standing.
            These sit directly on the page with no frame; the sweep and the
            page are one surface and the object appears to stand on it.

     FRAMED — shot on a grey floor, a reflective surface, or a styled set:
            the stationery, the tilted vials, the ice, the glass of water.
            The grey is part of the photograph, so on a white page it reads as
            a stray box unless it is given an edge on purpose. Inside a
            rounded, clipped frame it reads as a photograph, which is what it
            is.

   Getting this wrong is the single most visible mistake available with these
   assets, which is why the choice is a prop rather than left to each page.
   ========================================================================= */

export type BrandFigureProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** `free` sits on the page; `framed` gets a clipped, rounded edge. */
  variant?: "free" | "framed";
  /** Matches the `sizes` the layout actually renders at. */
  sizes?: string;
  priority?: boolean;
  className?: string;
};

export function BrandFigure({
  src,
  alt,
  width,
  height,
  variant = "free",
  sizes = "(min-width: 1024px) 32rem, 88vw",
  priority = false,
  className,
}: BrandFigureProps) {
  const image = (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className="h-auto w-full"
    />
  );

  if (variant === "free") {
    return <div className={cn("mx-auto w-full", className)}>{image}</div>;
  }

  return (
    <figure
      className={cn(
        "mx-auto w-full overflow-hidden rounded-tile border border-line",
        className
      )}
    >
      {image}
    </figure>
  );
}
