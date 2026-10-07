import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

/**
 * The 404.
 *
 * WHY THIS EXISTS AT ALL: there was no `not-found.tsx` anywhere in the app,
 * so every unmatched URL fell through to Next's built-in page — 11.6 kB of
 * unstyled default with no navigation, no footer and the title "404: This
 * page could not be found." For a licensed pharmacy that is the page a
 * prescriber sees after a mistyped URL, a stale link from a colleague, or a
 * product that has since been delisted, and it gives them no way back and no
 * evidence they are still on the right site.
 *
 * IT DOES NOT RENDER THE FULL NAVBAR. The header needs the category list from
 * Postgres and the session from cookies; a 404 is exactly the request where
 * the database may be the reason you are here, and a 404 that throws is a
 * 500. The lockup links home, the footer carries the address, the phone
 * number and every section of the site, and that is enough to recover from.
 *
 * `app/not-found.tsx` rather than `app/(site)/not-found.tsx`: Next uses the
 * ROOT not-found for URLs that match no segment, which is the case this is
 * for. A copy inside the route group would only catch `notFound()` thrown
 * from within that group.
 */
export const metadata: Metadata = {
  /* Bare, because the root layout's title template already appends
     "| MediCraft Pharmacy" — spelling it out here produced "Page not found —
     MediCraft Pharmacy | MediCraft Pharmacy". */
  title: "Page not found",
  description:
    "That page does not exist. Browse the formulary, request a refill, or contact the pharmacy team.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-navy">
      <header className="mx-auto w-full max-w-[1120px] px-5 pt-8">
        <Link
          href="/"
          aria-label={`${site.name} — home`}
          className="inline-flex rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <Logo className="h-[30px] w-auto" animate="none" />
        </Link>
      </header>

      <main
        id="main"
        className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-start gap-5 px-5 py-24 lg:py-32"
      >
        <p className="eyebrow">Error 404</p>
        <h1 className="max-w-[760px] font-display text-[clamp(2.25rem,5vw,3.75rem)] font-normal leading-[1.05] tracking-display text-balance">
          That page is not here.
        </h1>
        <p className="max-w-[58ch] text-[1.0625rem] leading-[1.65] text-ink-soft text-pretty">
          The address may be mistyped, or the page may have moved. Nothing is
          wrong with your account or your order — this is only a missing page.
        </p>

        <div className="mt-2 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/products">Browse the formulary</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Contact the pharmacy</Link>
          </Button>
        </div>

        {/* The three things someone who lands here most often wanted. */}
        <nav aria-label="Common destinations" className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          {[
            { href: "/refill", label: "Request a refill" },
            { href: "/work-with-us", label: "Open a provider account" },
            { href: "/support", label: "Support and FAQs" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[0.9375rem] font-medium text-brand-500 underline-offset-4 transition-colors hover:text-navy hover:underline motion-reduce:transition-none"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </main>

      <Footer />
    </div>
  );
}
