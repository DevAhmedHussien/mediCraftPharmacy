import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Web app manifest, served at /manifest.webmanifest.
 *
 * Points at the supplied PNG exports in public/ — Android and desktop installs
 * use these, while iOS picks up app/apple-icon.png and browsers use
 * app/favicon.ico (48/32px) or app/icon.svg (everything else).
 *
 * The icon set ships its own site.webmanifest; it is deliberately not used.
 * Next already serves a manifest from this file, and two manifests means the
 * one the browser picks is whichever <link> it sees first.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    // The brand blue from the identity deck.
    theme_color: "#1b54fb",
    icons: [
      { src: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        /* `maskable` as supplied: Android crops an icon to whatever shape the
           launcher uses, and an icon not declared maskable gets a white plate
           behind it instead. */
        purpose: "maskable",
      },
    ],
  };
}
