import { Icon, type IconName } from "@/components/icons/set";
import { trustBar } from "@/lib/content";

/* ===========================================================================
   What stands behind every preparation.

   THE PAGE'S ONE DARK BAND, AND WHY IT IS THIS ONE
   ------------------------------------------------
   Every other section alternates white and `sand`, which was a deliberate
   decision and stays: the product photography is shot on a white sweep, so
   the page and the pictures share a ground and nothing has to be cut out or
   masked. That reasoning covers every section that carries a photograph.

   This one carries none. It is nine credentials — type and marks — and it is
   the most load-bearing claim on the page: a prescriber is deciding whether
   to trust a compounder with their patients' prescriptions, and this is the
   answer. It spent its life as a ticker scrolling past the eye at 26px, then
   as a quiet grey row, and in both forms it was the easiest thing on the page
   to skip.

   On navy it is the one place the eye cannot slide over, the cyan finally
   does the accent work the identity reserves it for, and the page acquires
   some dynamic range — eight sections at an identical pitch is what makes a
   correct page read as a template.

   HONEST ABOUT WHAT IS NOT YET TRUE. "PCAB Accreditation In Progress" is
   marked as in progress rather than claimed, and it is not buried at the end
   — it sits in sequence with the rest. A credentials band that quietly rounds
   up is worth less than no credentials band.
   ========================================================================= */

export function TrustMarquee() {
  return (
    <section aria-labelledby="accreditations" className="band-navy section">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow">Standards</p>
          <h2 id="accreditations" className="section-title mt-4">
            What stands behind every preparation
          </h2>
        </div>

        {/* Hairline-separated, not carded. A grid of nine boxes on a dark
            ground is nine more edges; rules let the ground stay continuous
            and the type do the work. */}
        <ul className="mt-12 grid gap-px overflow-hidden rounded-tile bg-navy-soft sm:grid-cols-2 lg:grid-cols-3">
          {trustBar.map((item) => (
            <li
              key={item.label}
              className="flex items-start gap-4 bg-navy px-6 py-7"
            >
              <Icon
                name={item.icon as IconName}
                className="mt-0.5 h-6 w-6 shrink-0 text-cyan-300"
                strokeWidth={1.6}
                aria-hidden
              />
              <span className="text-[0.9375rem] font-bold leading-snug text-white text-balance">
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
