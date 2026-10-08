import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import { site } from "@/lib/site";
import "./globals.css";

/**
 * Satoshi is the identity typeface — the logo deck sets the lockup in Satoshi
 * Black over Satoshi Regular, so the site uses the real thing rather than an
 * approximation. Self-hosted from public/fonts (no runtime request to a font
 * CDN, no layout shift), in the three weights the design system uses:
 * 400 display and body, 500 UI, 700 emphasis.
 *
 * The lockup itself needs none of them — components/brand/Logo.tsx is
 * outlined paths, not live text — so dropping the 900 face changed the
 * wordmark not at all. It only ever served HTML headings, and after the
 * redesign moved display type to 400 there were five of those left.
 */
const satoshi = localFont({
  src: [
    { path: "../public/fonts/Satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Satoshi-700.woff2", weight: "700", style: "normal" },
    /* 900 is NOT loaded. The redesign sets display type at 400 and UI at 500;
       by the end only five `font-black` classes were left across the whole
       application, all pre-redesign leftovers, and they have been moved to
       weights already here. A 23 kB woff2 on the critical path of every page
       to serve five headings was the wrong trade — fonts are render-blocking,
       and FCP is the floor LCP cannot beat. The file stays in public/fonts as
       part of the supplied family. */
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
/**
 * The mono face, kept OFF the critical path.
 *
 * `preload: false` is the point. next/font preloads every weight it loads,
 * and those preloads compete with the hero image for the same throttled
 * pipe: on a slow-4G profile the home page requested six font files
 * (105 kB) and a 46 kB hero at the same instant, and the browser — rightly —
 * serves render-blocking resources first. The image finished at 3.8 s having
 * spent 3.1 s of that waiting its turn for 46 kB.
 *
 * Mono carries micro-labels: eyebrows, counts, spec values, lot numbers.
 * None of it is the page's primary reading, and `display: swap` means the
 * text appears immediately in the fallback and reflows into Plex when it
 * arrives. Nothing is invisible and nothing is blocked.
 *
 * 600 is gone too. It was used once, on a 12px uppercase label, where it is
 * indistinguishable from 500 — one more file in the preload queue for one
 * element nobody could pick out of a line-up.
 */
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

/* Lato is no longer loaded.
 *
 * It carried `font-display` because the identity folder ships it in Bold and
 * Black, and Satoshi's wide apertures were felt to run loose at body size.
 * The redesign makes the opposite choice deliberately: one family, set at
 * regular weight and large size — an 88px H1 in Satoshi 400 tracked to
 * -0.045em is the whole typographic idea, and a second family would fight it.
 *
 * So `--font-ui` is gone rather than redefined. Aliasing it to Satoshi would
 * have left a variable whose name says "a different face" pointing at the
 * same one, which is the kind of thing that is true for a year and then
 * quietly wrong. `font-display` and `--font-display` now name
 * `--font-satoshi` directly.
 *
 * The Lato woff2 files stay in public/fonts: they are part of the supplied
 * identity package, weigh nothing unreferenced, and deleting them would make
 * reverting this a hunt for files rather than an edit.
 */

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  /**
   * Location terms name Tampa and its county — the previous list said
   * "Tampa compounding pharmacy", which is the wrong city and would have
   * pulled the site against queries it cannot serve from.
   */
  keywords: [
    "compounding pharmacy",
    "503A compounding pharmacy",
    "Tampa compounding pharmacy",
    "Florida compounding pharmacy",
    "Hillsborough County pharmacy",
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

/**
 * The document shell, and nothing else.
 *
 * The marketing chrome — navbar, footer, skip link, Pharmacy JSON-LD — moved
 * to app/(site)/layout.tsx when /admin and /login arrived. Those two are
 * full-width authenticated surfaces with their own header; wrapping them in
 * the public navbar put two logos and a "Provider Portal" call to action on
 * top of the admin dashboard. A route group keeps the URLs identical and the
 * shells separate.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

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
        {children}
      </body>
    </html>
  );
}
