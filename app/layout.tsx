import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import { site } from "@/lib/site";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "./globals.css";

/**
 * Satoshi is the identity typeface — the logo deck sets the lockup in Satoshi
 * Black over Satoshi Regular, so the site uses the real thing rather than an
 * approximation. Self-hosted from public/fonts (no runtime request to a font
 * CDN, no layout shift), with the four weights the design system uses:
 * 400 body, 500 micro-labels, 700 UI emphasis, 900 display.
 */
const satoshi = localFont({
  src: [
    { path: "../public/fonts/Satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Satoshi-700.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/Satoshi-900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

/**
 * Reserved strictly for regulatory micro-data — USP chapter marks, lot
 * numbers, beyond-use dates, credential lines. Setting those in a mono is what
 * makes the "documented proof" thesis visible rather than merely claimed; it
 * is never used for prose.
 */
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  /**
   * Location terms name Palm Harbor and its county — the previous list said
   * "Tampa compounding pharmacy", which is the wrong city and would have
   * pulled the site against queries it cannot serve from.
   */
  keywords: [
    "compounding pharmacy",
    "503A compounding pharmacy",
    "Palm Harbor compounding pharmacy",
    "Florida compounding pharmacy",
    "Pinellas County pharmacy",
    "custom medications",
    "sterile compounding",
    "semaglutide",
    "tirzepatide",
    "GLP-1 weight management",
    "hormone replacement therapy",
    "peptide therapy",
  ],
  authors: [{ name: site.name }],
  openGraph: {
    type: "website",
    url: site.url,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    siteName: site.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  // "/" rather than the absolute origin, so it resolves against metadataBase
  // and a preview deployment canonicalises to itself instead of to production.
  // Every page overrides this with its own path via `pageMetadata`.
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * Organisation structured data.
   *
   * Deliberately narrower than before. The previous version asserted a street
   * address, a ZIP, a fax line and three separate branch locations, none of
   * which appear in the pharmacy's own identity document — publishing invented
   * NAP data is actively harmful for a licensed pharmacy's local search. What
   * is stated here is only what the owner states: Palm Harbor, Florida, one
   * location, licensed in Florida.
   *
   * Add `streetAddress` and `postalCode` here once the suite address is
   * confirmed; Google needs both for a Pharmacy entity to rank locally.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Pharmacy",
    "@id": `${site.url}/#pharmacy`,
    name: site.name,
    description: site.description,
    url: site.url,
    telephone: site.phone,
    email: site.email,
    priceRange: site.priceRange,
    currenciesAccepted: "USD",
    foundingDate: site.llcEstablished,
    address: {
      "@type": "PostalAddress",
      addressLocality: site.addressParts.city,
      addressRegion: site.addressParts.state,
      addressCountry: site.addressParts.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.lat,
      longitude: site.geo.lng,
    },
    // Licensed in Florida today. The 49-state ambition is not an area served
    // yet, so it is not claimed here.
    areaServed: { "@type": "State", name: "Florida" },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "13:00",
      },
    ],
    sameAs: [site.social.linkedin, site.social.instagram, site.social.facebook],
  };

  return (
    <html lang="en" className={`${satoshi.variable} ${mono.variable}`}>
      <body>
        {/*
         * Scroll-reveal animations render with inline `opacity:0` on the
         * server. Without JS that animation never runs, so force the content
         * visible — the server-rendered page stays fully readable on its own.
         */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/*
         * Skip link. The header carries a two-tier bar, a six-item nav and an
         * eleven-item Products panel, so a keyboard or screen-reader user would
         * otherwise tab through roughly twenty controls on every page before
         * reaching the content. Visually hidden until focused.
         */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Navbar />
        {/* `id` is the skip target; `tabIndex={-1}` lets it receive focus
            programmatically without entering the tab order itself. */}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
