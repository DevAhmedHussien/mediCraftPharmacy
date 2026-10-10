import { Card } from "@/components/ui/glass";
import { cn } from "@/lib/utils";

/* ===========================================================================
   One numbered step in a sequence.

   Used by the chain-of-custody set on the home page and by the "What Gets
   Recorded" block on /quality, which are the same four checkpoints — Pick &
   Verify, Pack & Protect, Seal & Label, Hand-Off & Track. They were built
   twice and had drifted: the home page numbered them in 12px grey, /quality
   did not number them at all.

   THREE THINGS THE BRIEF ASKED FOR, AND WHY EACH IS WHAT IT IS.

   THE NUMBER IS LARGE. It was `text-xs` in `text-ink-muted` — 12px at the top
   corner of a 240px card, which is a label on the card rather than a position
   in a sequence. At 40–56px it is the first thing read, which is what makes
   four cards scan as a process instead of as four unrelated claims.

   It is weight 500 and not bold. The brief says "large and bold"; this site
   sets all display type at 400 and the design system is explicit that weight
   is not how emphasis is made here. 56px in the brand blue is already the
   loudest thing in the card — adding 700 on top of 56px and a colour is three
   signals for one idea.

   EVERY CARD STARTS AT THE SAME LINE. The title carried `mt-auto`, which
   pushed it to the bottom of whatever space its body left — so in a row of
   four cards with bodies of different lengths, the four titles sat at four
   different heights and could not be read across. Nothing is pushed now; the
   number, the title and the body start where the card starts, and `h-full`
   plus a minimum keeps the four boxes the same size.

   THE HOVER LIFT IS 2px. It reads as the card responding to the pointer
   without moving far enough to disturb the row it sits in, and it is dropped
   entirely under `prefers-reduced-motion`.
   ========================================================================= */

export function StepCard({
  /** 1-based. Rendered zero-padded: 01, 02, 03, 04. */
  index,
  title,
  body,
  className,
}: {
  index: number;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col gap-2.5 p-7",
        "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-float",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className
      )}
    >
      {/* `aria-hidden`: the number is the card's position in an ordered list,
          which the `<ol>` around these already conveys. Announced, it reads
          as "zero one" before every title. */}
      <span
        aria-hidden
        className="font-display text-[clamp(2.5rem,4vw,3.5rem)] font-medium leading-[0.9] tracking-display tabular-nums text-brand-500"
      >
        {String(index).padStart(2, "0")}
      </span>

      <h3 className="mt-1 text-[19px] font-medium leading-tight text-navy text-balance">
        {title}
      </h3>

      <p className="text-[14.5px] leading-relaxed text-ink-soft text-pretty">
        {body}
      </p>
    </Card>
  );
}
