import type { ReactNode } from "react";

import { Footer } from "@/components/Footer";
import { categoryThumb } from "@/lib/media";
import { Navbar } from "@/components/Navbar";
import { CookieConsent } from "@/components/CookieConsent";
import { site, hasRealPhone } from "@/lib/site";
import { auth } from "@/lib/auth";
import { getCategories, getProductsByCategory } from "@/lib/catalogue";
import { homeForRole, homeLabelForRole } from "@/lib/home-route";

/**
 * The public site shell.
 *
 * A route group, so every marketing URL is unchanged — `app/(site)/about`
 * still serves `/about`. What the group buys is a second shell: /admin and
 * /login sit outside it and therefore render without the navbar, the footer
 * and the Pharmacy structured data, none of which belong on an authenticated
 * screen.
 */
/* ===========================================================================
   This segment renders per request.

   WHY IT HAS TO
   -------------
   The layout below calls `auth()` to decide whether the header says "Provider
   portal" or names the signed-in account. `auth()` reads cookies, which makes
   every page under it a dynamic render.

   That was already true and already fine for the pages Next treats as
   dynamic. It was NOT fine for the three with `generateStaticParams` —
   /product/[slug], /products/[category] and /blog/[slug]. Next renders those
   in a static context, `auth()` throws DYNAMIC_SERVER_USAGE, and the request
   500s.

   IT ONLY BROKE IN THE CONTAINER, which is what made it expensive to find.
   `generateStaticParams` reads the catalogue from Postgres, and
   lib/static-params.ts deliberately degrades to zero paths when no database
   is reachable — because an image that can only be built next to a live
   database cannot be built from a clean checkout. Locally the database IS
   up, so every path was prerendered to a file at build time and no page ever
   re-rendered. In the image, nothing was prerendered, so every request
   rendered on demand and hit the throw. The build was green, the local site
   was perfect, and every product and category page was a 500 in production.

   THE ALTERNATIVE, IF STATIC MATTERS LATER
   ----------------------------------------
   Keep the pages static and move the session read behind a Suspense boundary
   so only the account link streams dynamically. That is the better shape for
   SEO-facing pages and a bigger change to the header than is worth making
   while production is down. Worth revisiting if these pages ever need to be
   served from a CDN edge.
   ========================================================================= */
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  /* The products menu, built once per request and handed to the nav.
   *
   * Navbar and NavDrawer are client components, so they cannot query. Reading
   * a static array was the old answer and the reason a category added in the
   * admin never appeared in the menu. `getCategories` and
   * `getProductsByCategory` are both wrapped in React's `cache`, so the
   * per-category loop below is two queries, not one per category. */
  /* Who is signed in, for the header. The marketing shell offered "Provider
     Portal Login" to everyone, including the partner who had just come from
     their own portal. */
  const session = await auth();
  const account = session?.user
    ? {
        name: session.user.name ?? session.user.email ?? "Account",
        href: homeForRole(session.user.role),
        label: homeLabelForRole(session.user.role),
      }
    : null;

  const categories = await getCategories();
  const navCategories = await Promise.all(
    categories.map(async (category) => {
      const items = await getProductsByCategory(category.slug);
      return {
        slug: category.slug,
        name: category.name,
        blurb: category.blurb,
        icon: category.icon,
        count: items.length,
        thumb: categoryThumb(category.slug, items[0]?.slug, items[0]?.name),
        products: items.map((p) => ({
          slug: p.slug,
          name: p.name,
          form: p.form,
          doses: p.doses,
        })),
      };
    })
  );

  /**
   * Organisation structured data.
   *
   * Deliberately narrower than before. The previous version asserted a street
   * address, a ZIP, a fax line and three separate branch locations, none of
   * which appear in the pharmacy's own identity document — publishing invented
   * NAP data is actively harmful for a licensed pharmacy's local search. What
   * is stated here is only what the owner states: Tampa, Florida, one
   * location, licensed in Florida.
   *
   * The street address and postal code are now published, which is what
   * Google needs before a Pharmacy entity can rank locally at all — a
   * locality-only PostalAddress is treated as an incomplete record.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Pharmacy",
    "@id": `${site.url}/#pharmacy`,
    name: site.name,
    description: site.description,
    url: site.url,
    ...(hasRealPhone ? { telephone: site.phone } : {}),
    email: site.email,
    priceRange: site.priceRange,
    currenciesAccepted: "USD",
    foundingDate: site.llcEstablished,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.addressParts.street,
      addressLocality: site.addressParts.city,
      addressRegion: site.addressParts.state,
      postalCode: site.addressParts.postalCode,
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

  /**
   * WebSite entity.
   *
   * The Pharmacy node above says who the business is; this says what the site
   * is and ties every other node to one graph via `publisher`. `knowsAbout`
   * is the part that earns its place with language models specifically: it
   * states the pharmacy's subject-matter scope in plain terms, so an
   * assistant asked "who compounds flex-dose tirzepatide in Florida" has an
   * explicit claim to match rather than an inference from page copy.
   */
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    url: site.url,
    name: site.name,
    description: site.description,
    inLanguage: "en-US",
    publisher: { "@id": `${site.url}/#pharmacy` },
    knowsAbout: [
      "503A sterile compounding",
      "USP <795> non-sterile compounding",
      "USP <797> sterile compounding",
      "USP <800> hazardous drug handling",
      "Compounded semaglutide and tirzepatide flex-dose vials",
      "Bioidentical hormone replacement therapy compounding",
      "Peptide therapy compounding",
      "Compounded topical and troche dosage forms",
      "Beyond-use dating and environmental monitoring",
    ],
  };

  return (
    /* The paper ground. Set on the shell rather than on <body> so the admin
       console and /login — which sit outside this route group — keep their
       own grounds. */
    <div className="min-h-screen bg-paper text-navy">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
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
      <Navbar categories={navCategories} account={account} />
      {/* `id` is the skip target; `tabIndex={-1}` lets it receive focus
          programmatically without entering the tab order itself. The
          `site-main` class carries the offset for the fixed chrome — it is a
          class rather than a bare `main` selector so the admin's own <main>
          does not inherit a 108px gap it has no header to fill. */}
      <main id="main" tabIndex={-1} className="site-main">
        {children}
      </main>

      {/* The Phone / Email / Location band that used to sit here is gone.
          
          It repeated on all twenty-four pages, directly above a footer that
          already carries the address and the phone number — so every page
          ended by saying how to reach the pharmacy twice, in two different
          treatments, and the second one was three cards tall.
          
          Nothing is lost. `/contact` still renders `ContactChannels`
          directly, which is where that information is the content rather
          than furniture, and the footer keeps the address and the number. */}
      <Footer />
      {/* Client-only: the stored choice is in localStorage, which the server
          cannot read, so the banner mounts hidden and appears once checked. */}
      <CookieConsent />
    </div>
  );
}
