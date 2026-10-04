import { ImageResponse } from "next/og";

import { OG_COLORS, OG_CONTENT_TYPE, OG_SIZE, OgLogoMark, heroOgDataUri } from "@/lib/og";
import { site } from "@/lib/site";

/**
 * Site-wide social preview card, 1200x630.
 *
 * Built on the hero render — the injectable line on its navy stage — because
 * a share card is the one piece of this site most people see before they see
 * the site. A typographic card said "MediCraft Pharmacy"; this one shows what
 * MediCraft makes, which is the whole argument in one frame.
 *
 * The image is laid full-bleed with a left-weighted navy scrim rather than
 * cropped into a panel: the render's own background IS navy, so the scrim and
 * the photograph share a ground and the type sits on solid colour without a
 * visible box seam. Same reasoning as the hero itself.
 *
 * Rendered on the Node runtime so it can read the JPEG off disk, and
 * prerendered at build time — the shared link serves a static PNG with no
 * cold start.
 */
export const alt = `${site.name} — ${site.tagline}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  const hero = heroOgDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: OG_COLORS.navy,
        }}
      >
        {/* The render, full-bleed and anchored right so the vials keep the
            right third and the copy keeps the left. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero}
          alt=""
          width={1200}
          height={675}
          style={{
            position: "absolute",
            top: -22,
            left: 0,
            width: 1200,
            height: 675,
            objectFit: "cover",
          }}
        />

        {/* Scrim. Satori supports linear-gradient, so the dissolve is real
            rather than a stack of stepped rectangles. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(13,25,62,0.97) 0%, rgba(13,25,62,0.92) 38%, rgba(13,25,62,0.55) 62%, rgba(13,25,62,0.12) 100%)",
          }}
        />

        {/* Copy */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 64,
            width: 760,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <OgLogoMark size={44} tone="invert" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: OG_COLORS.white, letterSpacing: -0.5 }}>
                MediCraft
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: OG_COLORS.cyan, letterSpacing: 1.6 }}>
                PHARMACY
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 62,
                fontWeight: 900,
                lineHeight: 1.04,
                letterSpacing: -2,
                color: OG_COLORS.white,
              }}
            >
              Wellness Is Crafted,
            </div>
            <div
              style={{
                fontSize: 62,
                fontWeight: 900,
                lineHeight: 1.04,
                letterSpacing: -2,
                color: OG_COLORS.white,
              }}
            >
              Not Manufactured.
            </div>

            <div style={{ display: "flex", marginTop: 22, fontSize: 24, color: "rgba(255,255,255,0.78)" }}>
              503A sterile compounding · Tampa, Florida
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", width: 22, height: 4, borderRadius: 2, background: OG_COLORS.cyan }} />
            <div style={{ fontSize: 18, color: "rgba(255,255,255,0.65)", letterSpacing: 1.4 }}>
              USP 795 · 797 · 800 COMPLIANT
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
