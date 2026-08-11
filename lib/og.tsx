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

/** Palette values, literal: Satori has no access to the Tailwind tokens.
 *  Values are the identity deck's Option 2 colours. */
export const OG_COLORS = {
  ink: "#0f1a33",
  inkSoft: "#46536f",
  inkMuted: "#6b7794",
  brand: "#1b54fb",
  brandLight: "#9bb8ff",
  cyan: "#23dce1",
  navy: "#0d193e",
  band: "#f5f8fd",
  white: "#ffffff",
} as const;

/**
 * The MediCraft mark for share cards.
 *
 * Satori's SVG support is partial, so the mark is handed to it as an `<img>`
 * carrying a data URI rather than as inline SVG elements — that path is fully
 * supported and renders the real artwork instead of an approximation of it.
 *
 * Geometry and colours are the same values the site's Logo component uses,
 * taken from the identity deck. `tone: "invert"` reverses the bowl to white
 * for cards laid on navy.
 */
function markDataUri(tone: "light" | "invert"): string {
  const bowl = tone === "invert" ? "%23ffffff" : "%231b54fb";
  const pestle = "%2323dce1";

  const svg =
    "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 89.5 62.43'%3E" +
    `%3Cpath fill='${bowl}' d='M 79.640625 62.425781 L 76.597657 45.160156 C 75.164063 47.351562 73.496094 49.410156 71.601563 51.304687 C 64.429688 58.476562 54.894531 62.425781 44.75 62.425781 C 34.605469 62.425781 25.070313 58.476562 17.894531 51.304687 C 16.003907 49.410156 14.332031 47.351562 12.902344 45.160156 L 9.859375 62.425781 L 0 62.425781 L 6.699219 24.449219 L 16.480469 24.449219 C 16.480469 40.039062 29.160157 52.71875 44.75 52.71875 C 60.335938 52.71875 73.019531 40.039062 73.019531 24.449219 L 82.800781 24.449219 L 89.496094 62.425781 Z'/%3E` +
    `%3Cpath fill='${pestle}' d='M 63.699219 1.125 C 62.964844 2.253906 63.832031 4.125 65.640625 5.300781 C 67.449219 6.480469 69.507813 6.523437 70.246094 5.394531 C 70.980469 4.265625 64.433594 0 63.699219 1.125'/%3E` +
    `%3Cpath fill='${pestle}' d='M 68.980469 4.570312 L 64.960938 1.949219 L 44.75 26.375 L 59.882813 22.734375 Z'/%3E` +
    `%3Cellipse fill='${pestle}' cx='44.748' cy='24.027' rx='25.326' ry='4.547'/%3E` +
    "%3C/svg%3E";

  return `data:image/svg+xml,${svg}`;
}

export function OgLogoMark({
  size = 44,
  tone = "light",
}: {
  size?: number;
  tone?: "light" | "invert";
}) {
  // The mark is wider than it is tall (89.5 x 62.43), so height drives the box.
  const height = size;
  const width = Math.round((height * 89.5) / 62.43);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={markDataUri(tone)} alt="" width={width} height={height} />
  );
}

/**
 * Mark plus wordmark. The weight contrast mirrors the lockup — "Medi" light
 * against a bold "Craft" — with "Pharmacy" as the quieter descriptor.
 */
export function OgLockup({
  scale = 1,
  tone = "light",
}: {
  scale?: number;
  tone?: "light" | "invert";
}) {
  const type = tone === "invert" ? OG_COLORS.white : OG_COLORS.brand;
  const descriptor = tone === "invert" ? OG_COLORS.brandLight : OG_COLORS.inkSoft;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 * scale }}>
      <OgLogoMark size={40 * scale} tone={tone} />
      {/* `gap` supplies the word space rather than a non-breaking space —
          Satori collapses leading whitespace inside a flex child, which ran
          "MediCraft" and "Pharmacy" together. */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 9 * scale,
          fontSize: 32 * scale,
          letterSpacing: -0.8 * scale,
          color: type,
        }}
      >
        <div style={{ display: "flex" }}>
          <span style={{ fontWeight: 400 }}>Medi</span>
          <span style={{ fontWeight: 700 }}>Craft</span>
        </div>
        <span style={{ fontWeight: 400, color: descriptor }}>Pharmacy</span>
      </div>
    </div>
  );
}
