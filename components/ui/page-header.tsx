import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ===========================================================================
   The interior page masthead: eyebrow, H1, lead, optional image.

   Replaces the old dark masthead on thirteen pages. It sits on `paper` with
   no band and no bottom rule — the space below it is the separator, which is
   what the rest of the redesign does everywhere else.

   The H1 is smaller than the home page's: `clamp(2.4rem, 5.2vw, 4rem)`
   against the hero's 5.5rem cap. An interior page is read, not landed on,
   and an 88px heading above a page of regulatory prose is a title competing
   with the thing it titles.
   ========================================================================= */

export function PageHeader({
  eyebrow,
  title,
  lead,
  media,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  /** Shown beside the copy, never behind it. */
  media?: { src: string; alt: string; width: number; height: number };
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-[1120px] px-5", className)}>
      <div
        className={cn(
          "grid items-center gap-10 pb-4 pt-14 md:pt-20 lg:pt-24",
          media && "lg:grid-cols-12 lg:gap-12"
        )}
      >
        <div className={cn(media ? "lg:col-span-7" : "max-w-3xl")}>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="mt-4 font-display text-[clamp(2.4rem,5.2vw,4rem)] font-normal leading-[1.04] tracking-display text-navy text-balance">
            {title}
          </h1>
          {lead && (
            <p className="mt-5 max-w-2xl text-[17px] leading-[1.65] text-ink-soft text-pretty">
              {lead}
            </p>
          )}
          {children}
        </div>

        {media && (
          <div className="lg:col-span-5">
            <figure className="overflow-hidden rounded-card border border-hair-soft">
              <Image
                src={media.src}
                alt={media.alt}
                width={media.width}
                height={media.height}
                priority
                sizes="(min-width: 1024px) 34rem, 92vw"
                className="h-auto w-full"
              />
            </figure>
          </div>
        )}
      </div>
    </section>
  );
}
