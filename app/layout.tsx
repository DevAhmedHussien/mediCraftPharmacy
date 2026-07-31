import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { site } from "@/lib/site";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "./globals.css";

/**
 * The reference site (hallandalerx.com) uses Adobe Fonts' Neue Haas Grotesk
 * for both body and display — an all-sans Swiss grotesque. That kit is
 * domain-locked, so we load Inter (the closest free neo-grotesque) and put
 * Neue Haas Grotesk / Helvetica Neue first in the fallback stack: if you add
 * your own Adobe Fonts kit, the site renders with the exact typeface.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: [
    "compounding pharmacy",
    "Florida compounding pharmacy",
    "Tampa compounding pharmacy",
    "custom medications",
    "semaglutide",
    "tirzepatide",
    "GLP-1 weight management",
    "hormone replacement therapy",
    "peptide therapy",
    "specialty pharmacy Florida",
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
  alternates: {
    canonical: site.url,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Pharmacy",
    "@id": `${site.url}/#pharmacy`,
    name: site.name,
    description: site.description,
    url: site.url,
    telephone: site.phone,
    faxNumber: site.fax,
    email: site.email,
    priceRange: site.priceRange,
    currenciesAccepted: "USD",
    address: {
      "@type": "PostalAddress",
      streetAddress: site.addressParts.street,
      addressLocality: site.addressParts.city,
      addressRegion: site.addressParts.state,
      postalCode: site.addressParts.zip,
      addressCountry: site.addressParts.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.lat,
      longitude: site.geo.lng,
    },
    areaServed: [
      { "@type": "State", name: "Florida" },
      { "@type": "Country", name: "United States" },
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:30",
        closes: "18:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "13:00",
      },
    ],
    location: site.locations.map((loc) => ({
      "@type": "Pharmacy",
      name: `${site.name} — ${loc.city}`,
      telephone: loc.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: loc.street,
        addressLocality: loc.city,
        addressRegion: loc.state,
        postalCode: loc.zip,
        addressCountry: "US",
      },
    })),
    sameAs: [site.social.instagram, site.social.facebook, site.social.linkedin],
  };

  return (
    <html lang="en" className={inter.variable}>
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
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
