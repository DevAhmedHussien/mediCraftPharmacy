import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Web app manifest, served at /manifest.webmanifest. Points at the PNG exports
 * of the mark in public/icons/ — Android and desktop installs use these, while
 * iOS picks up app/apple-icon.png and browsers use app/icon.svg.
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
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
