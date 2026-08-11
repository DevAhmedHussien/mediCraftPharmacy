import { Icon, type IconName } from "@/components/icons/set";
import { trustBar } from "@/lib/content";

/**
 * The accreditation ticker: six credentials set large and travelling left.
 *
 * Built as one track holding two identical copies of the list, translated by
 * -50%. When the first copy has fully exited, the second sits exactly where the
 * first began, so the loop is seamless with no JavaScript and no measurement.
 *
 * Details that matter:
 *   · the second copy is `aria-hidden`, so a screen reader hears the six
 *     credentials once rather than twice
 *   · the whole strip is a `<ul>` — this is a list of facts, not a decoration
 *   · hovering pauses it, so anyone who wants to read an item can stop it
 *   · reduced motion turns it into a static centred wrap (see globals.css);
 *     the duplicate is hidden there so nothing is repeated on screen either
 *   · it animates `transform` only, so it never triggers layout while running
 *
 * The first item says PCAB accreditation is *in progress*, which is the honest
 * form and the form the owner's document uses throughout.
 */
export function TrustMarquee() {
  return (
    <section
      aria-label="Accreditations and standards"
      className="marquee-band border-y border-navy-soft/60 bg-navy py-7 md:py-9"
    >
      <div className="marquee">
        <div className="marquee-track">
          <TickerList />
          <TickerList aria-hidden />
        </div>
      </div>
    </section>
  );
}

function TickerList({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) {
  return (
    <ul className="marquee-list" aria-hidden={ariaHidden}>
      {trustBar.map((item) => (
        <li key={item.label} className="marquee-item">
          <Icon
            name={item.icon as IconName}
            className="h-6 w-6 shrink-0 text-cyan-400 md:h-7 md:w-7"
            strokeWidth={1.7}
          />
          <span>{item.label}</span>
          {/* The mortar's mouth from the logo, as the separator. */}
          <span aria-hidden className="marquee-sep" />
        </li>
      ))}
    </ul>
  );
}
