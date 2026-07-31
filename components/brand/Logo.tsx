import { cn } from "@/lib/utils";

/**
 * The MediCraft mark — a medical cross built from three pills: a pale
 * horizontal bar laid behind two solid vertical bars whose rounded caps meet at
 * the centre, leaving a fine seam across the middle.
 *
 * Authored as inline SVG rather than embedding the supplied PNG so it stays
 * crisp at every size (the 48px navbar through to the app icon), costs no extra
 * request, and takes its colour from the active palette — switch
 * ACTIVE_PALETTE to green and the logo follows.
 *
 * Geometry is measured from the source artwork: a 7-unit bar weight on a
 * 28-unit square, centred at (16, 16), with a 1.2-unit gap where the two
 * vertical caps meet. That seam resolves to roughly a pixel at the sizes used
 * in the footer and drawer and disappears cleanly at navbar size, which is how
 * the original behaves too.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-6 w-6", className)}
      role="img"
      aria-label="MediCraft cross"
    >
      {/* Pale horizontal bar, behind. */}
      <rect x="2" y="12.5" width="28" height="7" rx="3.5" className="fill-brand-300" />
      {/* Solid vertical bars, in front, meeting at the centre. */}
      <rect x="12.5" y="2" width="7" height="13.4" rx="3.5" className="fill-brand-500" />
      <rect
        x="12.5"
        y="16.6"
        width="7"
        height="13.4"
        rx="3.5"
        className="fill-brand-500"
      />
    </svg>
  );
}

/**
 * Full lockup: mark plus a two-line wordmark — "MediCraft" with "PHARMACY" set
 * beneath it as a tracked-out descriptor. Stacking is what makes the lockup read
 * as an identity rather than a sentence: the coined name carries the weight and
 * the category sits under it as a quiet qualifier, the way most pharmacy and
 * clinical marks are built.
 *
 * Every measurement below is in `em`, so the whole lockup scales from a single
 * font size passed through `wordmarkClassName` — nothing needs re-tuning per
 * placement. The descriptor is 0.5625em with 0.38em of tracking, which lands its
 * optical width just under "MediCraft" above it; the negative right margin
 * cancels the trailing letter-space CSS adds after the final "Y" so the block
 * stays flush-left with the name rather than sitting a hair off-centre.
 *
 * The wordmark's "Craft" is set at 700 — heavier than the two weights the UI
 * type scale allows (400/600). That is deliberate: a brand lockup is artwork,
 * not interface type, and the contrast between "Medi" and "Craft" is the
 * identity's defining move.
 */
export function Logo({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />

      <span className={cn("flex flex-col justify-center", wordmarkClassName)}>
        <span className="whitespace-nowrap font-normal leading-none tracking-[-0.022em] text-ink">
          Medi<span className="font-bold">Craft</span>
        </span>

        <span className="-mr-[0.38em] mt-[0.32em] whitespace-nowrap text-[0.5625em] font-semibold uppercase leading-none tracking-[0.38em] text-ink-muted">
          Pharmacy
        </span>
      </span>
    </span>
  );
}
