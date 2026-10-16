/**
 * Icon set supplied for the Medicraft build, converted from the original SVGs
 * into inline components. Three things changed in conversion:
 *
 * 1. Hard-coded colours (white, #101828, #666) became `currentColor`, so each
 *    icon takes the surrounding text colour and follows the palette toggle.
 * 2. The Gaussian-blur filters baked into the hormone and runner icons were
 *    removed — they were authored as a glow for a dark hero and read as a
 *    rendering artifact beside crisp icons at UI sizes.
 * 3. Internal ids were namespaced per icon so two icons on one page cannot
 *    collide on a clip-path reference.
 *
 * Generated from public/icons/*.svg — the originals are kept there unmodified.
 */
import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/** Same shape as a lucide icon, so these are drop-in replacements. */
type IconProps = SVGProps<SVGSVGElement>;

/** shopping bag */
export function BagIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props} className={cn("h-6 w-6", className)}>
      <path d="M9 6L9 7C9 8.65685 10.3431 10 12 10C13.6569 10 15 8.65685 15 7V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M15.6116 3H8.3886C6.43325 3 4.76449 4.41365 4.44303 6.3424L2.77636 16.3424C2.37001 18.7805 4.25018 21 6.72194 21H17.2783C19.75 21 21.6302 18.7805 21.2238 16.3424L19.5572 6.3424C19.2357 4.41365 17.5669 3 15.6116 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

