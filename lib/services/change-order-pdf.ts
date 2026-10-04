/* No `server-only`, for the same reason lib/services/msa-pdf.ts omits it: a
 * script or a test should be able to render one without the auth stack. */
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

import { toWinAnsi } from "@/lib/services/msa-pdf";

/* ===========================================================================
   A signed change order, as its own document.

   WHY NOT THE MSA TEMPLATE
   ------------------------
   /api/agreement already renders a partner's agreement by stamping a 64-page
   artwork template. A change order went down that same path, which produced
   the body of the Master Service Agreement carrying the change order's
   signature and the change order's hash — a document whose fingerprint does
   not match its own text. Anyone checking the hash would find a mismatch and
   be right to.

   Exhibit B is two pages of prose with a signature block. It does not need
   artwork, and inventing anchor coordinates for a template that does not
   exist would be a day's work to reproduce something plain text says better.

   WINANSI, NOT UNICODE. The standard fonts cannot encode an em dash or a
   curly quote, and pdf-lib throws rather than dropping them. `toWinAnsi` is
   the same transliteration the MSA renderer uses, so the two documents fail
   over identically instead of one of them crashing.
   ========================================================================= */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 64;
const BODY_SIZE = 9.5;
const LINE_HEIGHT = 13.5;

const INK = rgb(0.06, 0.1, 0.24);
const MUTED = rgb(0.42, 0.47, 0.58);
const RULE = rgb(0.85, 0.88, 0.93);

export type ChangeOrderSignature = {
  signedName: string;
  signedTitle: string | null;
  signedAt: Date;
  agreementHash: string;
  ip: string | null;
};

/** Break one logical line into as many as the measure allows. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (text.trim() === "") return [""];

  /* Leading space is the document's indentation and has to survive wrapping,
     so it is measured off and re-applied to every continuation line. */
  const indent = text.match(/^ */)?.[0] ?? "";
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = indent;

  for (const word of words) {
    const candidate = current === indent ? indent + word : `${current} ${word}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || current === indent) {
      current = candidate;
    } else {
      lines.push(current);
      current = indent + word;
    }
  }

  lines.push(current);
  return lines;
}

/**
 * Render the change order text, with the signature block when it is signed.
 *
 * `text` is the exact string that was hashed — passed in rather than rebuilt
 * here, so the PDF cannot say something the signature does not cover.
 */
export async function buildChangeOrderPdf(input: {
  text: string;
  number: number;
  companyName: string;
  signature: ChangeOrderSignature | null;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  pdf.setTitle(`Change Order ${input.number} — ${input.companyName}`);
  pdf.setProducer("MediCraft Pharmacy");

  const measure = PAGE_WIDTH - MARGIN * 2;
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const write = (line: string, font: PDFFont, size: number, color = INK) => {
    if (y < MARGIN + LINE_HEIGHT) newPage();
    page.drawText(toWinAnsi(line), { x: MARGIN, y, size, font, color });
    y -= LINE_HEIGHT;
  };

  for (const raw of input.text.split("\n")) {
    /* The rules in the source are box-drawing characters WinAnsi cannot
       encode; drawn as a hairline instead of transliterated into a row of
       question marks. */
    if (/^─+$/.test(raw.trim())) {
      if (y < MARGIN + LINE_HEIGHT) newPage();
      y -= 4;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_WIDTH - MARGIN, y },
        thickness: 0.6,
        color: RULE,
      });
      y -= LINE_HEIGHT;
      continue;
    }

    // A heading is a short all-caps line. Set in bold rather than parsed from
    // a markup the source does not have.
    const heading = raw.trim().length > 0 && raw === raw.toUpperCase() && raw.length < 70;
    const font = heading ? bold : body;

    for (const line of wrap(raw, font, BODY_SIZE, measure)) {
      write(line, font, BODY_SIZE);
    }
  }

  /* --- The signature block ------------------------------------------- */
  if (input.signature) {
    if (y < MARGIN + LINE_HEIGHT * 9) newPage();

    y -= LINE_HEIGHT;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.6,
      color: RULE,
    });
    y -= LINE_HEIGHT * 1.5;

    write("SIGNED ELECTRONICALLY", bold, BODY_SIZE);
    y -= 4;

    const signedAt = input.signature.signedAt.toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "long",
    });

    write(input.signature.signedName, bold, 13);
    if (input.signature.signedTitle) write(input.signature.signedTitle, body, BODY_SIZE, MUTED);
    write(`for ${input.companyName}`, body, BODY_SIZE, MUTED);
    y -= 4;
    write(signedAt, body, BODY_SIZE, MUTED);
    if (input.signature.ip) write(`IP ${input.signature.ip}`, body, BODY_SIZE, MUTED);

    /* The fingerprint of the text above, split so it fits the measure. It is
       the whole point of storing a hash: this document can be checked against
       the record rather than taken on trust. */
    y -= 4;
    write("SHA-256 of the text above:", body, 8, MUTED);
    const hash = input.signature.agreementHash;
    for (let i = 0; i < hash.length; i += 32) {
      write(hash.slice(i, i + 32), body, 8, MUTED);
    }
  }

  return pdf.save();
}
