import { writeFileSync } from "node:fs";
import sharp from "sharp";
import {
  BOWL_D, KNOB_D, HANDLE_D, MOUTH, GLYPHS, ROW1, ROW2, ROW1_Y, ROW2_Y,
} from "@/components/brand/Logo";

/* The real lockup, as a standalone SVG with literal colours.
   The component paints with Tailwind classes, which do not exist outside the
   app — so the brand values are written in directly here. */
const BRAND = "#1b54fb";  // brand-500, the wordmark and bowl
const CYAN  = "#23dce1";  // cyan-400, the pestle and the mouth

const defs = Object.entries(GLYPHS)
  .map(([k, d]) => `<path id="g-${k}" d="${d}"/>`).join("");
const row1 = ROW1.map(([k, x]) => `<use href="#g-${k}" x="${x}" y="${ROW1_Y}"/>`).join("");
const row2 = ROW2.map(([k, x]) => `<use href="#g-${k}" x="${x}" y="${ROW2_Y}"/>`).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 277.6 95.2">
<defs>${defs}</defs>
<path fill="${BRAND}" d="${BOWL_D}"/>
<g fill="${CYAN}"><path d="${KNOB_D}"/><path d="${HANDLE_D}"/></g>
<ellipse fill="${CYAN}" cx="${MOUTH.cx}" cy="${MOUTH.cy}" rx="${MOUTH.rx}" ry="${MOUTH.ry}"/>
<g fill="${BRAND}">${row1}${row2}</g>
</svg>`;

async function main() {
  writeFileSync("public/images/brand/medicraft-logo.svg", svg);
  // 876 wide: rendered at 292 CSS px in email, so it stays sharp at 3x.
  await sharp(Buffer.from(svg)).resize({ width: 876 }).png({ compressionLevel: 9 })
    .toFile("public/images/brand/medicraft-logo.png");
  const meta = await sharp("public/images/brand/medicraft-logo.png").metadata();
  console.log(`wrote ${meta.width}x${meta.height} png, ${meta.channels} channels, alpha=${meta.hasAlpha}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
