import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { GlobeIcon } from "@/components/icons";
import { footerLinks, site } from "@/lib/site";

/** Card marks we accept. All five artworks are a uniform 36×22, so explicit
 *  dimensions keep the row from shifting as they load. */
const paymentMethods = [
  { src: "/images/payment/visa.webp", label: "Visa" },
  { src: "/images/payment/mastercard.webp", label: "Mastercard" },
  { src: "/images/payment/amex.webp", label: "American Express" },
  { src: "/images/payment/discover.webp", label: "Discover" },
  { src: "/images/payment/diners.webp", label: "Diners Club" },
];

/**
 * Apple's footer: the grey band (#f5f5f7), everything at 12px, hairline rules
 * between the fine print, the link columns, and the copyright row. No dark
 * fill and no oversized logo — Apple keeps the whole thing quiet.
 */
export function Footer() {
  const columns = [
    { heading: "Explore", links: footerLinks },
    {
      heading: "Contact",
      links: [
        { label: site.phone, href: `tel:${site.phone}` },
        { label: site.tollFree, href: `tel:${site.tollFree}` },
        { label: site.email, href: `mailto:${site.email}` },
      ],
    },
  ];

  return (
    <footer className="band text-caption text-ink-soft">
      <div className="container-x py-8">
        <Link
          href="/"
          aria-label={`${site.name} — home`}
          className="inline-flex rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <Logo
            markClassName="h-9 w-9 sm:h-8 sm:w-8"
            wordmarkClassName="text-lg"
          />
        </Link>

        <p className="mt-5 max-w-4xl leading-relaxed">
          {site.tagline}. A specialty compounding pharmacy serving providers and patients
          nationwide. All medications are compounded to order and dispensed by
          prescription only.
        </p>

        <div className="mt-6 grid gap-8 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.heading}>
              <h2 className="font-semibold text-ink">{col.heading}</h2>
              <ul className="mt-3 space-y-2">
                {col.links.map((item) => (
                  <li key={item.href}>
                    {item.href.startsWith("/") ? (
                      <Link href={item.href} className="hover:underline">
                        {item.label}
                      </Link>
                    ) : (
                      <a href={item.href} className="hover:underline">
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="font-semibold text-ink">Visit us</h2>
            <ul className="mt-3 space-y-2">
              <li>{site.address}</li>
              <li>{site.hours}</li>
              <li className="flex items-start gap-1.5">
                <GlobeIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Licensed to ship nationwide
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-ink">Follow</h2>
            <ul className="mt-3 space-y-2">
              {[
                { label: "Instagram", href: site.social.instagram },
                { label: "Facebook", href: site.social.facebook },
                { label: "LinkedIn", href: site.social.linkedin },
              ].map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-line pt-6 text-ink-muted md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <p>
              Copyright © {new Date().getFullYear()} {site.name}. All rights reserved.{" "}
              {site.since}.
            </p>
            <p>PCAB Accredited · USP 795 / 797 Compliant</p>
          </div>

          <ul aria-label="Accepted payment methods" className="flex items-center gap-2">
            {paymentMethods.map((m) => (
              <li key={m.src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.src}
                  alt={m.label}
                  width={36}
                  height={22}
                  loading="lazy"
                  decoding="async"
                  className="h-[22px] w-9 rounded-[3px]"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
