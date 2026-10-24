"use client";

import { useEffect } from "react";

import { HERO_SIZES, heroForPath } from "@/lib/media";

/**
 * Starts downloading the next page's hero when a link to it is hovered or
 * focused.
 *
 * `<Link>` prefetches a route's data, not the images on it, so the first
 * visit to a page still waited on its hero photograph after the click. A
 * preload hint with the same `srcset`/`sizes` as the hero means the browser
 * fetches exactly the variant the page will ask for, and the ~200ms between
 * hover and click is usually enough for it to arrive. One hint per image;
 * nothing is fetched for links to pages without a hero or to other sites.
 */
export function HeroWarmer() {
  useEffect(() => {
    const warmed = new Set<string>();

    function warm(event: Event) {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.origin !== location.origin) return;
      if (anchor.pathname === location.pathname) return;

      const hero = heroForPath(anchor.pathname);
      if (!hero || warmed.has(hero.src)) return;
      warmed.add(hero.src);

      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = hero.src;
      if (hero.srcSet) {
        link.setAttribute("imagesrcset", hero.srcSet);
        link.setAttribute("imagesizes", HERO_SIZES);
      }
      document.head.appendChild(link);
    }

    document.addEventListener("pointerover", warm, { passive: true });
    document.addEventListener("focusin", warm);
    return () => {
      document.removeEventListener("pointerover", warm);
      document.removeEventListener("focusin", warm);
    };
  }, []);

  return null;
}
