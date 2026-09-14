import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ===========================================================================
   Badge — the pill vocabulary already in globals.css, given a typed contract.

   `progress` is the one that matters. This pharmacy holds neither PCAB
   accreditation nor LegitScript certification yet, and the identity document
   is careful to say "in progress" every time. Amber rather than cyan is what
   keeps that honest at a glance: a cyan pill next to four real credentials
   reads as a fifth credential held.

   Anything still being pursued uses `variant="progress"`, and the label must
   still say so in words — the colour is reinforcement, never the only signal,
   since colour alone carries nothing to a screen reader or a monochrome print.
   ========================================================================= */

const badgeVariants = cva("", {
  variants: {
    variant: {
      /* On navy — the footer's credential row. */
      onDark: "badge-pill",
      /* Accreditation not yet held. See globals.css:421. */
      progress: "badge-progress",
      /* On white — the neutral count/status pill used across the formulary. */
      neutral:
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-sand px-3 py-1 text-caption font-medium text-ink-muted",
      /* On white — a credential actually held. */
      accent:
        "inline-flex items-center gap-1.5 rounded-full border border-cyan-600/30 bg-cyan-50 px-3 py-1 text-caption font-semibold text-cyan-700",
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
