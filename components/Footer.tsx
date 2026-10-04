import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/icons/set";
import { Badge } from "@/components/ui/badge";
import { footerBlurb } from "@/lib/content";
import { footerBadges, footerColumns, site, hasRealPhone, telHref } from "@/lib/site";

/** Social links, with the wordmark each account is actually listed under in
 *  the owner's document. */
const SOCIALS = [
  { label: "in", name: "LinkedIn", href: site.social.linkedin },
  { label: "ig", name: "Instagram", href: site.social.instagram },
  { label: "f", name: "Facebook", href: site.social.facebook },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-sand text-ink-soft">
      <div className="container-x py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* ---- Brand ---- */}
          <div>
            {/* The reversed lockup: white bowl and wordmark, cyan pestle — the
                on-dark variant the identity deck specifies. */}
            <Link
              href="/"
              className="logo-lockup inline-flex rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
            >
              <Logo tone="light" animate="none" className="h-11" />
            </Link>

            <p className="mt-6 max-w-sm text-meta leading-relaxed">{footerBlurb}</p>

            <p className="mt-4 text-meta font-medium text-ink">{site.address}</p>

            <div className="mt-6 space-y-1.5 text-meta">
              <p>
                <a
                  href={telHref() ?? "/contact"}
                  className="transition-colors hover:text-ink"
                >
                  {hasRealPhone ? site.phone : "Contact us"}
                </a>
              </p>
              <p>
                <a
                  href={`mailto:${site.email}`}
                  className="text-brand-600 transition-colors hover:text-cyan-200"
                >
                  {site.email}
                </a>
              </p>
            </div>
          </div>

          {/* ---- Link columns ---- */}
          {footerColumns.map((col) => (
            <nav key={col.heading} aria-labelledby={`footer-${col.heading}`}>
              <h2
                id={`footer-${col.heading}`}
                className="text-label font-semibold uppercase text-ink"
              >
                {col.heading}
              </h2>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-meta transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* ---- Accreditation status ----
            These are deliberately not styled as awarded credentials. The two
            that are still pending carry an explicit "In Progress" label,
            because the owner's copy is careful never to overstate them. */}
        <div className="mt-14 flex flex-wrap gap-2.5 border-t border-line pt-8">
          {footerBadges.map((badge) => (
            <Badge
              key={badge.label}
              variant={badge.inProgress ? "progress" : "neutral"}
            >
              {badge.inProgress && (
                <Icon name="hourglass" className="h-3 w-3" strokeWidth={1.8} />
              )}
              {badge.label}
            </Badge>
          ))}
        </div>

        {/* ---- Bottom row ---- */}
        <div className="mt-8 flex flex-col gap-6 border-t border-line pt-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${site.name} on ${s.name}`}
                className="grid size-9 place-items-center rounded-lg border border-line bg-white text-caption font-bold text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600"
              >
                <span aria-hidden>{s.label}</span>
              </a>
            ))}
          </div>

          <p className="fine-print text-ink-muted">
            © {year} {site.name} · EST. {site.established} · All rights reserved.
          </p>

          {/* A compounding pharmacy is asked for all five of these during
              diligence, so all five are linked rather than the two that are
              traditional. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-caption">
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy Policy
            </Link>
            <Link href="/notice-of-privacy-practices" className="transition-colors hover:text-ink">
              HIPAA Notice
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink">
              Terms of Use
            </Link>
            <Link href="/shipping-and-returns" className="transition-colors hover:text-ink">
              Shipping &amp; Returns
            </Link>
            <Link href="/accessibility" className="transition-colors hover:text-ink">
              Accessibility
            </Link>
          </div>
        </div>

        {/* Regulatory footer — a compounding pharmacy should state this
            plainly, and the owner's document does so on the products page. */}
        {/* white/50, not /40 — regulatory text has to clear 4.5:1, and this is
            the disclosure a reader is most likely to need. */}
        <p className="mt-8 max-w-4xl text-caption leading-relaxed text-ink-muted">
          MediCraft Pharmacy is a 503A compounding pharmacy. All compounded
          medications require a valid prescription from a licensed healthcare
          provider for a specific, identified patient. Compounded medications are
          not FDA-approved. Information on this site is provided for general
          educational purposes and is not medical advice.
        </p>
      </div>
    </footer>
  );
}
