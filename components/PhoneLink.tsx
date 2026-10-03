import Link from "next/link";

import { site, telHref } from "@/lib/site";

/**
 * The pharmacy's number — or an honest alternative.
 *
 * While SITE_PHONE is unset the site carried `(727) 000-0000` as a live
 * `tel:` link in the topbar, the footer, the contact page, the support page,
 * the refill page and the portal. A prescriber tapping it reached nothing.
 * This renders the number only when there is one, and offers the contact page
 * otherwise.
 */
export function PhoneLink({
  className,
  fallbackLabel = "Contact us",
}: {
  className?: string;
  fallbackLabel?: string;
}) {
  const href = telHref();

  if (!href) {
    return (
      <Link href="/contact" className={className}>
        {fallbackLabel}
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      {site.phone}
    </a>
  );
}
