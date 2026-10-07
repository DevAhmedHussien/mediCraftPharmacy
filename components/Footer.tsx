import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { BadgePill } from "@/components/ui/glass";
import { footerBadges, footerColumns, site, hasRealPhone, telHref } from "@/lib/site";

/* ===========================================================================
   The footer, rebuilt to the handoff.

   WHAT IT WAS: a sand-coloured band with a top rule, a brand blurb, three
   link columns, a row of pill badges with an hourglass icon, three social
   squares, a copyright line, five legal links and a regulatory paragraph —
   nine blocks, on a ground the redesign no longer has.

   WHAT THE REFERENCE ASKS FOR: four columns on `paper` (logo + address, then
   Company / Providers / Patients), a row of outlined mono badges, and one
   regulatory paragraph above a hairline. That is it.

   WHAT WAS KEPT ANYWAY, and why the two do not quite match:

     · The five legal links. The reference has none, because its placeholder
       footer had three columns of three. A 503A pharmacy is asked for the
       HIPAA notice, the privacy policy, the terms, the shipping policy and
       the accessibility statement during diligence; dropping them to match a
       mock would remove the thing the footer is legally for.
     · The social links. Same reason in reverse — they are in `site.social`
       and the business uses them.

   Both sit in the bottom row with the copyright, below the badges, so the
   four-column grid and the badge row read exactly as drawn.

   THE DASHED BORDER IS THE HONESTY RULE. PCAB and LegitScript are being
   pursued and not held, so their pills are dashed AND still say "In
   Progress" in words — a border style carries nothing to a screen reader.
   ========================================================================= */

/** The accounts, with the wordmark each is actually listed under. */
const SOCIALS = [
  { label: "in", name: "LinkedIn", href: site.social.linkedin },
  { label: "ig", name: "Instagram", href: site.social.instagram },
  { label: "f", name: "Facebook", href: site.social.facebook },
];

const LEGAL = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "HIPAA Notice", href: "/notice-of-privacy-practices" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Shipping & Returns", href: "/shipping-and-returns" },
  { label: "Accessibility", href: "/accessibility" },
];

export function Footer() {
  const year = new Date().getFullYear();
  const tel = telHref();

  return (
    <footer className="mx-auto flex w-full max-w-[1120px] flex-col gap-9 px-5 pb-12 pt-24">
      {/* ---- Four columns ---- */}
      {/* `.reveal-group` — the four columns arrive in order with no
          JavaScript. The footer is on all twenty-four pages, so anything
          that costs bytes here costs them everywhere. */}
      <div className="reveal-group grid gap-8 text-[14px] sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <Logo className="h-7 w-auto self-start" />
          <address className="not-italic leading-relaxed text-ink-soft">
            {site.addressParts.street}
            <br />
            {site.addressParts.city}, {site.addressParts.state} {site.addressParts.postalCode}
          </address>
          {hasRealPhone && tel && (
            <a href={tel} className="font-mono text-[13px] text-ink-soft transition-colors hover:text-navy">
              {site.phone}
            </a>
          )}
        </div>

        {footerColumns.map((col) => (
          <nav key={col.heading} aria-label={col.heading} className="flex flex-col gap-2.5">
            <p className="font-medium text-navy">{col.heading}</p>
            {col.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-ink-soft transition-colors hover:text-navy"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>

      {/* ---- Accreditations ---- */}
      <ul className="flex flex-wrap gap-2">
        {footerBadges.map((badge) => (
          <li key={badge.label}>
            <BadgePill pending={badge.inProgress}>{badge.label}</BadgePill>
          </li>
        ))}
      </ul>

      {/* ---- Regulatory, then everything legal ---- */}
      <div className="flex flex-col gap-5 border-t border-hair pt-6">
        <p className="max-w-[880px] text-[12.5px] leading-[1.65] text-ink-muted">
          {site.name} is a 503A compounding pharmacy. All compounded medications require a
          valid prescription from a licensed healthcare provider for a specific, identified
          patient. Compounded medications are not FDA-approved. Information on this site is
          provided for general educational purposes and is not medical advice. &copy; {year}{" "}
          {site.name}.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
            {LEGAL.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-ink-muted transition-colors hover:text-navy"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <ul className="flex items-center gap-2">
            {SOCIALS.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-9 place-items-center rounded-full border border-hair bg-white/70 font-mono text-[12px] text-ink-soft transition-colors hover:border-hair-strong hover:text-navy"
                >
                  {/* The abbreviation is decorative; the accessible name is
                      the sr-only span. An aria-label here would not contain
                      the visible "ig", which axe reports as a label/content
                      mismatch and which breaks voice control. */}
                  <span aria-hidden>{s.label}</span>
                  <span className="sr-only">{`${site.name} on ${s.name}`}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
