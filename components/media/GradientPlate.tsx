import { Icon, type IconName } from "@/components/icons/set";
import { cn } from "@/lib/utils";

/* ===========================================================================
   Gradient plate — what stands in a photographic slot until it is shot.

   Brief §6 is explicit: until the Phase 2 shoot, facility and hero slots must
   not be filled with stock cleanroom photography, because a prescriber who
   tours the real facility and finds it does not match the site has been handed a
   reason to doubt the compliance claims as well. Its first-preference
   substitute is "gradient + typography compositions in brand colors, using the
   existing --navy → --blue gradient system", and its verdict is blunt: "an
   honest gradient beats a dishonest photograph."

   So this is not a grey placeholder box. It is a finished composition in its own
   right — the brand gradient, a HEPA-grid rule pattern drawn in CSS (§4.5 asks
   for that texture as a card ground), a mono slot label, and the subject the
   frame will eventually hold. It should look deliberate to a visitor and read as
   a spec to whoever runs the shoot.
   ========================================================================= */

export function GradientPlate({
  /** What this frame will depict once shot — shown as the plate's caption. */
  subject,
  /** The mono label, e.g. "Facility — Phase 2". */
  label,
  icon = "mortar",
  ratio = "4/3",
  className,
}: {
  subject: string;
  label: string;
  icon?: IconName;
  ratio?: "4/3" | "3/2" | "16/9" | "1/1" | "4/5";
  className?: string;
}) {
  const RATIO: Record<string, string> = {
    "4/3": "aspect-[4/3]",
    "3/2": "aspect-[3/2]",
    "16/9": "aspect-[16/9]",
    "1/1": "aspect-square",
    "4/5": "aspect-[4/5]",
  };

  return (
    <div
      className={cn(
        "gradient-plate flex flex-col justify-end",
        RATIO[ratio],
        className
      )}
    >
      {/* The HEPA ceiling grid, as a pure CSS texture. Sits at low contrast so
          it gives the plate a material identity without becoming a pattern. */}
      <span aria-hidden className="gradient-plate-grid" />

      <div className="relative z-10 p-7 md:p-8">
        <Icon name={icon} className="h-7 w-7 text-cyan-300" strokeWidth={1.7} />
        <p className="mt-5 font-mono text-label uppercase tracking-[0.14em] text-cyan-300">
          {label}
        </p>
        <p className="mt-2 max-w-sm text-meta font-medium leading-snug text-white/80 text-pretty">
          {subject}
        </p>
      </div>
    </div>
  );
}
