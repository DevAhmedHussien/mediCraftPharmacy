import { cn } from "@/lib/utils";

/* ===========================================================================
   A numbered sequence: 01, 02, 03, 04.

   Numbered markers are usually a decorative tell — they appear on sites where
   the content is a list of unrelated claims and the numbers imply an order
   that is not there. Here the order is the whole point: onboarding happens in
   this sequence, and a provider reading it is asking "how many steps before I
   can prescribe". The numbers answer that.

   So this component is for sequences only. Anything unordered belongs in
   FeatureTiles.
   ========================================================================= */

export type Step = {
  title: string;
  body: string;
};

export function NumberedSteps({
  items,
  className,
}: {
  items: readonly Step[];
  className?: string;
}) {
  return (
    <ol className={cn("grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((step, index) => {
        const last = index === items.length - 1;

        return (
          <li key={step.title} className="relative">
            {/* The marker and the track it sits on.
             *
             * THE NUMBERS USED TO BE THE ONLY SIGNAL. Four columns of faint
             * `brand-100` numerals, no connection between them — which left
             * the component arguing in its own comment that "the order is the
             * whole point" while rendering something indistinguishable from an
             * unordered row of claims. A rule running from each marker to the
             * next is what makes four columns read as one sequence.
             *
             * The track is drawn only between markers, never after the last:
             * a line trailing off the right edge implies a fifth step. */}
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-white font-mono text-caption font-bold tabular-nums text-brand-600"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              {!last && (
                <span aria-hidden className="hidden h-px flex-1 bg-hair lg:block" />
              )}
            </div>

            <h3 className="mt-5 text-[1.0625rem] font-bold leading-snug text-ink text-balance">
              {step.title}
            </h3>
            <p className="mt-2.5 text-meta leading-relaxed text-ink-soft text-pretty">
              {step.body}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
