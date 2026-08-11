import { ImageResponse } from "next/og";
import {
  OG_COLORS,
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgLockup,
  OgPackshot,
  productImageTightDataUri,
} from "@/lib/og";
import { site } from "@/lib/site";

/**
 * Site-wide social preview card, 1200x630. Next.js picks this file up by
 * convention and emits the og:image / og:image:width / og:image:height tags
 * automatically, resolved against `metadataBase`.
 *
 * Rendered on the Node runtime so it can read the packshot off disk, and
 * prerendered at build time — the shared link serves a static PNG.
 */
export const alt = `${site.name} — ${site.tagline}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  const vial = productImageTightDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: OG_COLORS.white,
        }}
      >
        {/* Copy */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 64,
          }}
        >
          <OgLockup />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 60,
                fontWeight: 600,
                lineHeight: 1.06,
                letterSpacing: -1.6,
                color: OG_COLORS.ink,
              }}
            >
              Wellness is crafted, not manufactured.
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: 25,
                lineHeight: 1.4,
                letterSpacing: -0.5,
                color: OG_COLORS.inkSoft,
              }}
            >
              Specialty compounding — GLP-1, hormones, peptides and more,
              dosed for the individual.
            </div>
          </div>

          {/* Status line. It previously read "PCAB accredited · … · Ships
              nationwide", both of which overstated the pharmacy: PCAB is in
              progress, and licensure is Florida only today. A share card is
              the most-copied surface on the site, so it says what is true. */}
          <div style={{ display: "flex", fontSize: 20, color: OG_COLORS.inkMuted }}>
            503A compounding · USP 795 · 797 · 800 · PCAB accreditation in progress
          </div>
        </div>

        {/* Packshot */}
        <OgPackshot src={vial} />
      </div>
    ),
    { ...OG_SIZE }
  );
}
