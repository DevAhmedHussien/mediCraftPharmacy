import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ===========================================================================
   The interior page masthead, built from the Pages A/B references.

   STACKED, NOT SPLIT. This was a 7/5 grid with the image beside the copy,
   which is the old masthead's shape wearing new colours. Every interior
   screen in the references does the same thing the home page does: a
   left-aligned text block at the full 1120px measure, and then — as its own
   section — an image running the whole width with a glass plate inside it.
   Putting the image alongside halves the measure of both.

   The H1 is `clamp(40px, 5.6vw, 72px)`, under the home hero's 88px cap. An
   interior page is read rather than landed on, and a hero-sized heading above
   a page of regulatory prose competes with the thing it titles.

   `plate` is the same specification treatment as the home hero, sitting at
   the BOTTOM of the image here rather than the top — which is what the
   references do on every interior screen that has one.
   ========================================================================= */

export type HeaderPlateField = { field: string; value: string; note?: string };

export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-5 pt-24", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="max-w-[920px] font-display text-[clamp(2.5rem,5.6vw,4.5rem)] font-normal leading-[1.04] tracking-display text-navy text-balance">
        {title}
      </h1>
      {lead && (
        <p className="max-w-[720px] text-[18px] leading-[1.65] text-ink-soft text-pretty">{lead}</p>
      )}
      {children}
    </section>
  );
}

/**
 * The full-width image that follows a PageHeader.
 *
 * Its own component rather than a prop, because the references make it its
 * own `<section>` with its own top padding — and several pages have a header
 * and no image at all.
 */
export function PageHeaderImage({
  src,
  alt,
  plate,
  priority = true,
  className,
}: {
  src: string;
  /** Empty only when the image is decorative and the header says everything. */
  alt: string;
  /** The glass specification plate, at the foot of the image. */
  plate?: HeaderPlateField[];
  priority?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-[1120px] px-5 pt-14", className)}>
      <div className="relative h-[clamp(18.75rem,42vw,32.5rem)] overflow-hidden rounded-hero bg-stone">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(min-width: 1120px) 1080px, 100vw"
          className="object-cover"
        />
        {plate && plate.length > 0 && (
          <dl className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-white/90 bg-white/60 shadow-float backdrop-blur-xl backdrop-saturate-150 lg:grid-cols-4">
            {plate.map((f) => (
              <div key={f.field} className="flex flex-col gap-1 bg-white/40 px-4 py-3.5">
                <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-brand-500">
                  {f.field}
                </dt>
                <dd className="text-[18px] font-medium leading-tight tracking-[-0.02em] text-navy">
                  {f.value}
                </dd>
                {f.note && <dd className="text-[12.5px] text-ink-soft">{f.note}</dd>}
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
