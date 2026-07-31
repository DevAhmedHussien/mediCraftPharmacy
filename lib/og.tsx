import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Open Graph's recommended card size. Every generated image uses it. */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/**
 * Reads a file out of /public and returns it as a data URI.
 *
 * The OG renderer (Satori) cannot resolve site-relative paths — at build time
 * there is no server to fetch them from — so bitmaps have to be inlined.
 */
function publicFileAsDataUri(publicPath: string, mime: string): string {
  const bytes = readFileSync(join(process.cwd(), "public", publicPath));
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

/**
 * A crop of the packshot taken tight around the vial. The full render carries
 * wide white margins, which leave the vial looking small inside a share card,
 * so the card uses this version instead.
 *
 * Deliberately a JPEG, not the WebP used elsewhere: the OG renderer (Satori)
 * cannot decode WebP — feeding it one fails the build with
 * "TypeError: a is not iterable" while prerendering. The pages themselves are
 * served WebP through next/image; only this build-time crop stays JPEG.
 */
export const PRODUCT_IMAGE_TIGHT = {
  src: "/images/products/semaglutide-double-strength-flex-dose-3ml-tight.jpg",
  width: 470,
  height: 880,
} as const;

export function productImageTightDataUri(): string {
  return publicFileAsDataUri(PRODUCT_IMAGE_TIGHT.src, "image/jpeg");
}

/**
 * Packshot panel for the right edge of a share card: a white plate on the grey
 * band, which is how product imagery is presented everywhere else on the site.
 */
export function OgPackshot({ src }: { src: string }) {
  return (
    <div
      style={{
        width: 440,
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: OG_COLORS.band,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 320,
          height: 512,
          borderRadius: 28,
          background: OG_COLORS.white,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={236} height={442} style={{ objectFit: "contain" }} />
      </div>
    </div>
  );
}

/** Palette values, literal: Satori has no access to the Tailwind tokens. */
export const OG_COLORS = {
  ink: "#1d1d1f",
  inkSoft: "#6e6e73",
  inkMuted: "#86868b",
  brand: "#0071e3",
  brandLight: "#9ccbff",
  band: "#f5f5f7",
  white: "#ffffff",
} as const;

/**
 * The MediCraft cross, rebuilt from three positioned divs. Satori supports no
 * SVG `<rect>`, so the mark is composed rather than inlined.
 */
export function OgLogoMark({ size = 44 }: { size?: number }) {
  const bar = size * 0.22;
  const arm = size * 0.42;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: (size - bar) / 2,
          width: size,
          height: bar,
          borderRadius: bar,
          background: OG_COLORS.brandLight,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: (size - bar) / 2,
          top: 0,
          width: bar,
          height: arm,
          borderRadius: bar,
          background: OG_COLORS.brand,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: (size - bar) / 2,
          top: size - arm,
          width: bar,
          height: arm,
          borderRadius: bar,
          background: OG_COLORS.brand,
        }}
      />
    </div>
  );
}

/** Mark plus wordmark, matching the site lockup. */
export function OgLockup({ scale = 1 }: { scale?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 * scale }}>
      <OgLogoMark size={44 * scale} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 34 * scale,
            letterSpacing: -0.7 * scale,
            color: OG_COLORS.ink,
          }}
        >
          <span style={{ fontWeight: 400 }}>Medi</span>
          <span style={{ fontWeight: 700 }}>Craft</span>
          <span style={{ fontWeight: 400 }}>&nbsp;Pharmacy</span>
        </div>
      </div>
    </div>
  );
}
