/* No `server-only` here, deliberately.
 *
 * `node:fs/promises` below already makes this module impossible to bundle for
 * a browser — Next fails the build rather than shipping it. Adding the guard
 * on top buys nothing and costs the ability to call this from a script or a
 * test, which is exactly the trade lib/encryption.ts settles the same way. */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import anchorData from "@/lib/msa-anchors.json";

/* ===========================================================================
   The partner's own copy of the agreement.

   The template is 64 pages, and 47 of them are the full Partner Formulary —
   the reference catalogue every partner gets.

   THEIR PRICES COME FIRST, THEN THE CATALOGUE. An earlier version of this file
   REPLACED the catalogue with the partner's own schedule, on the reasoning
   that a practice should not have to hunt for its own terms in a 692-item
   reference. That reasoning was half right: the agreed prices do have to be
   impossible to miss, but dropping the catalogue also dropped the only
   statement of what else MediCraft dispenses — which is exactly what a
   partner needs when they come back to add preparations later.

   So both are in, in the order that makes the agreement readable. The
   partner's own negotiated lines go in as Exhibit A-1, immediately after the
   Exhibit A pricing terms they implement, and the template's Schedule A-1 —
   the reference catalogue — follows unchanged.

   The naming follows the template rather than overriding it. The artwork
   already calls pages 16 onward "Schedule A-1", and Exhibit A already says
   negotiated prices are the ones differing from Provider Cost; the inserted
   pages are exactly that, so Exhibit A-1 is where they belong. Everything
   else — the body, Exhibit A, the covers — is copied through untouched.

   THE ANCHOR TAGS ARE THE LAYOUT. The template carries `\c_legalname\`,
   `\c_sig\`, `\m_date\` and twenty-two others, which is the convention
   SignEasy and DocuSign both scan for. We use the same marks: a value is drawn
   where its tag sits, so the layout is the designer's rather than a set of
   coordinates someone guessed. scripts/extract-msa-anchors.py records where
   they are; this file draws over them.
   ========================================================================= */

type Anchor = { page: number; x: number; y: number; width: number; height: number };

const ANCHORS = anchorData.anchors as Record<string, Anchor>;

type Footer = { page: number; x: number; y: number; height: number; endX: number };
const FOOTERS = anchorData.footers as Footer[];

/** A contents entry: where the number sits, and which page it points at. */
type TocEntry = Footer & { target: number };
const TOC = anchorData.toc as TocEntry[];

/**
 * Where the reference catalogue begins in the template, 1-based.
 *
 * Pages 1–13 are the agreement body and its execution page, 14–15 are
 * Exhibit A, and 16 onward is the formulary. The partner's own schedule is
 * inserted at this boundary, so it reads immediately after the pricing terms
 * it implements and immediately before the catalogue it is drawn from.
 */
const CATALOGUE_FIRST_PAGE = 16;

const INK = rgb(0.06, 0.1, 0.24);
const MUTED = rgb(0.42, 0.47, 0.58);
const RULE = rgb(0.85, 0.88, 0.93);
const BRAND = rgb(0.11, 0.33, 0.98);

export type PriceLine = {
  name: string;
  strength: string | null;
  form: string | null;
  packageSize: string | null;
  listPrice: string;
  discountPercent: string | null;
  finalPrice: string;
  unit: string;
};

export type MsaFields = {
  /** The Client, as it appears on the W-9. */
  legalName: string;
  entityType?: string | null;
  address?: string | null;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
};

/**
 * Everything else the Client told us, for Exhibit C.
 *
 * WHY AN EXHIBIT AND NOT MORE ANCHORS
 * -----------------------------------
 * The template carries twenty-five tags and no more. Trading name, EIN,
 * billing address, states of operation, licences and prescribers have nowhere
 * to go in the artwork, and adding tags means a new template from the
 * designer every time onboarding asks one more question.
 *
 * So they go on a generated page instead — the same mechanism Schedule A-1
 * already uses for pricing. The partner signs a document that states, in the
 * executed record, every detail they gave us. Before this, a signed MSA could
 * be read end to end without revealing which prescribers or which licences it
 * actually covered; that information lived only in a database that is not
 * part of the agreement.
 *
 * NOTHING SENSITIVE IS PRINTED IN FULL. EIN, DEA, NPI and licence numbers
 * appear as their last four digits, exactly as the admin screen shows them.
 * The agreement has to identify what it covers; it does not have to be a
 * second copy of the regulated identifiers, and a signed PDF gets forwarded,
 * printed and emailed in ways the database never is.
 */
export type ClientProfile = {
  tradingName?: string | null;
  einLast4?: string | null;
  businessType?: string | null;
  businessAddress?: string | null;
  billingAddress?: string | null;
  statesOfOperation?: string[];
  accountType?: string | null;
  medicraftRep?: string | null;
  howHeard?: string | null;
  signer?: { name?: string | null; title?: string | null; email?: string | null } | null;
  prescribers?: {
    name: string;
    deaLast4?: string | null;
    deaExpiration?: string | null;
    npiLast4?: string | null;
    stateLicenseLast4?: string | null;
  }[];
  licenses?: {
    type: string;
    state?: string | null;
    numberLast4?: string | null;
    expiresAt?: string | null;
  }[];
};

export type SignatureFields = {
  signedName: string;
  signedTitle?: string | null;
  signedAt: Date;
  /** The fingerprint of the exact text that was signed. */
  agreementHash: string;
  ip?: string | null;
};

const templatePath = () =>
  path.resolve(process.cwd(), "assets/msa/msa-2026-template.pdf");

function draw(
  pages: (PDFPage | null)[],
  name: string,
  text: string,
  font: PDFFont,
  { size = 10, color = INK, offsetY = 0 } = {}
) {
  const anchor = ANCHORS[name];
  if (!anchor) {
    // A renamed or removed tag must fail here, not print a client's name into
    // the margin of an agreement nobody reads before signing.
    throw new Error(
      `MSA template has no anchor "${name}". Re-run scripts/extract-msa-anchors.py.`
    );
  }

  const page = pages[anchor.page - 1];
  if (!page) {
    throw new Error(
      `Anchor "${name}" points at template page ${anchor.page}, which the ` +
        `generated document does not carry — it fell inside the replaced schedule.`
    );
  }

  page.drawText(text, { x: anchor.x, y: anchor.y + offsetY, size, font, color });
}

/**
 * Cover the tag itself.
 *
 * `\c_legalname\` is visible text in the template. Drawing over it without
 * hiding it leaves both the value and the placeholder on the page.
 */
function mask(pages: (PDFPage | null)[], name: string) {
  const anchor = ANCHORS[name];
  if (!anchor) return;

  const page = pages[anchor.page - 1];
  if (!page) return;

  page.drawRectangle({
    x: anchor.x - 1,
    y: anchor.y - 2,
    // The tag text is narrow; the value that replaces it is not. Clear a band
    // wide enough for the field rather than just the placeholder glyphs.
    width: 230,
    height: anchor.height + 4,
    color: rgb(1, 1, 1),
  });
}

function fill(
  pages: (PDFPage | null)[],
  name: string,
  value: string | null | undefined,
  font: PDFFont,
  options?: { size?: number; color?: ReturnType<typeof rgb> }
) {
  mask(pages, name);
  if (value) draw(pages, name, value, font, options);
}

/* --- The replacement schedule -------------------------------------------- */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const ROW_HEIGHT = 20;

const money = (value: string) => `$${Number(value).toFixed(2)}`;

/** Trim to fit a column, with an ellipsis rather than an overflow. */
function clip(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;

  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function scheduleHeader(
  page: PDFPage,
  bold: PDFFont,
  regular: PDFFont,
  companyName: string,
  pageNumber: number,
  totalPages: number
) {
  page.drawText("EXHIBIT A-1 · YOUR NEGOTIATED PRICING", {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN,
    size: 8,
    font: bold,
    color: BRAND,
  });

  page.drawText(companyName, {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - 22,
    size: 15,
    font: bold,
    color: INK,
  });

  const label = `Page ${pageNumber} of ${totalPages}`;
  page.drawText(label, {
    x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(label, 8),
    y: PAGE_HEIGHT - MARGIN,
    size: 8,
    font: regular,
    color: MUTED,
  });
}

const COLUMNS = [
  { label: "PREPARATION", x: MARGIN, width: 236 },
  { label: "PACK", x: MARGIN + 242, width: 74 },
  { label: "LIST", x: MARGIN + 322, width: 54, right: true },
  { label: "DISC.", x: MARGIN + 382, width: 44, right: true },
  { label: "YOU PAY", x: MARGIN + 432, width: 72, right: true },
];

/**
 * Build the replacement Schedule A-1.
 *
 * Deliberately plain: Helvetica, a rule under the header, one row per line.
 * The surrounding document is set in a licensed typeface we do not have the
 * rights to embed, and a schedule that half-matches the artwork looks worse
 * than one that is clearly a data appendix.
 */
async function buildSchedule(
  pdf: PDFDocument,
  companyName: string,
  lines: PriceLine[],
  bold: PDFFont,
  regular: PDFFont
): Promise<PDFPage[]> {
  const bodyTop = PAGE_HEIGHT - MARGIN - 64;
  const rowsPerPage = Math.floor((bodyTop - MARGIN - 40) / ROW_HEIGHT);
  const pageCount = Math.max(1, Math.ceil(lines.length / rowsPerPage));

  const pages: PDFPage[] = [];

  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);

    scheduleHeader(page, bold, regular, companyName, index + 1, pageCount);

    let y = bodyTop;

    for (const column of COLUMNS) {
      const x = column.right
        ? column.x + column.width - regular.widthOfTextAtSize(column.label, 7)
        : column.x;
      page.drawText(column.label, { x, y, size: 7, font: bold, color: MUTED });
    }

    y -= 8;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.75,
      color: RULE,
    });

    y -= ROW_HEIGHT;

    for (const line of lines.slice(index * rowsPerPage, (index + 1) * rowsPerPage)) {
      const detail = [line.strength, line.form].filter(Boolean).join(" · ");

      page.drawText(clip(line.name, regular, 9, COLUMNS[0]!.width), {
        x: COLUMNS[0]!.x,
        y,
        size: 9,
        font: regular,
        color: INK,
      });
      if (detail) {
        page.drawText(clip(detail, regular, 7, COLUMNS[0]!.width), {
          x: COLUMNS[0]!.x,
          y: y - 8,
          size: 7,
          font: regular,
          color: MUTED,
        });
      }

      page.drawText(clip(line.packageSize ?? line.unit, regular, 8, COLUMNS[1]!.width), {
        x: COLUMNS[1]!.x,
        y,
        size: 8,
        font: regular,
        color: MUTED,
      });

      const cells: [number, string, PDFFont, ReturnType<typeof rgb>][] = [
        [2, money(line.listPrice), regular, MUTED],
        [3, line.discountPercent ? `${Number(line.discountPercent)}%` : "—", regular, MUTED],
        [4, money(line.finalPrice), bold, INK],
      ];

      for (const [columnIndex, text, cellFont, color] of cells) {
        const column = COLUMNS[columnIndex]!;
        const size = columnIndex === 4 ? 9 : 8;
        page.drawText(text, {
          x: column.x + column.width - cellFont.widthOfTextAtSize(text, size),
          y,
          size,
          font: cellFont,
          color,
        });
      }

      y -= ROW_HEIGHT;
    }

    const note =
      "Prices are per unit of sale and exclude shipping. Items priced by quote are not listed here and are " +
      "added by change order under Exhibit B.";
    page.drawText(clip(note, regular, 7, PAGE_WIDTH - MARGIN * 2), {
      x: MARGIN,
      y: MARGIN - 8,
      size: 7,
      font: regular,
      color: MUTED,
    });
  }

  return pages;
}

/* --- The document -------------------------------------------------------- */

export type BuildOptions = {
  companyName: string;
  fields: MsaFields;
  lines: PriceLine[];
  /** Everything else the Client gave us. Rendered as Exhibit C. */
  profile?: ClientProfile | null;
  /** Present once signed. Stamps the execution page. */
  signature?: SignatureFields | null;
};

/**
 * Produce the partner's agreement as a PDF.
 *
 * Returns the bytes. Nothing is written to disk here — the caller decides
 * whether this is a download, an upload to storage, or a payload for a
 * signing platform.
 */
export async function buildMsaPdf(options: BuildOptions): Promise<Uint8Array> {
  const template = await PDFDocument.load(await readFile(templatePath()));
  const pdf = await PDFDocument.create();

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const total = template.getPageCount();

  /* The body and Exhibit A, then the partner's own schedule, then the whole
     reference catalogue. Nothing from the template is dropped — the schedule
     is INSERTED at the catalogue boundary rather than put in its place. */
  const before = Array.from({ length: CATALOGUE_FIRST_PAGE - 1 }, (_, i) => i);
  const catalogue = Array.from(
    { length: total - (CATALOGUE_FIRST_PAGE - 1) },
    (_, i) => CATALOGUE_FIRST_PAGE - 1 + i
  );

  const copiedBefore = await pdf.copyPages(template, before);
  for (const page of copiedBefore) pdf.addPage(page);

  const scheduleLength = (
    await buildSchedule(pdf, options.companyName, options.lines, bold, regular)
  ).length;

  const copiedCatalogue = await pdf.copyPages(template, catalogue);
  for (const page of copiedCatalogue) pdf.addPage(page);

  /* The anchor map addresses TEMPLATE page numbers, and every catalogue page
     has moved down by however long the partner's schedule turned out to be.
     This maps a template page number onto the page that now holds it, which
     keeps every `ANCHORS[name].page` lookup honest.

     Nothing maps to null any more: because the insert keeps all 64 template
     pages, every anchor still has a page to land on. The null case is kept in
     the type because `draw` must still refuse rather than guess if that ever
     stops being true. */
  const pages = pdf.getPages();

  const byTemplatePage: (PDFPage | null)[] = [];
  for (let templatePage = 1; templatePage <= total; templatePage += 1) {
    const index =
      templatePage < CATALOGUE_FIRST_PAGE
        ? templatePage - 1
        : templatePage - 1 + scheduleLength;
    byTemplatePage.push(pages[index] ?? null);
  }

  const { fields } = options;

  fill(byTemplatePage, "c_legalname", fields.legalName, bold, { size: 10 });
  fill(byTemplatePage, "c_entity", fields.entityType, regular, { size: 10 });
  fill(byTemplatePage, "c_address", fields.address, regular, { size: 10 });
  fill(byTemplatePage, "c_contact", fields.contact, regular, { size: 10 });

  fill(byTemplatePage, "c_sig_entity", fields.legalName, regular, { size: 9 });
  fill(byTemplatePage, "c_sig_address", fields.address, regular, { size: 9 });
  fill(byTemplatePage, "c_email", fields.email, regular, { size: 9 });
  fill(byTemplatePage, "c_phone", fields.phone, regular, { size: 9 });
  fill(byTemplatePage, "c_exa_client", fields.legalName, regular, { size: 10 });

  /* Exhibit C goes last, after Exhibit B, so the artwork's own exhibit order
     is not interrupted. Added before the footers are renumbered — it changes
     the page count, and a footer claiming otherwise is the defect
     `renumberFooters` exists to fix. */
  if (options.profile) {
    buildClientProfile(pdf, options.companyName, options.profile, bold, regular);
  }

  renumberContents(byTemplatePage, scheduleLength, regular);
  renumberFooters(byTemplatePage, pdf.getPages(), regular);

  if (options.signature) {
    stampSignature(byTemplatePage, options.signature, bold, regular);
  } else {
    /* Unsigned: the signature tags stay exactly as they are. A signing
       platform scans for them, and blanking them would remove the fields it is
       looking for. */
  }

  return pdf.save();
}

/**
 * Rewrite the contents pages.
 *
 * Two of them: the agreement's own contents on page 3, and the formulary's
 * category index inside Schedule A-1. Both carry baked destination numbers,
 * and every destination at or past the insert point has moved down by the
 * length of the partner's schedule.
 *
 * Right-aligned to the number's own right edge, because that is how the
 * artwork sets them — a left-aligned redraw of "17" over "16" is the same
 * width, but "107" over "99" is not, and it would hang into the margin.
 */
function renumberContents(
  byTemplatePage: (PDFPage | null)[],
  shift: number,
  font: PDFFont
) {
  if (shift === 0) return;

  for (const entry of TOC) {
    /* Only destinations at or past the insert point move. Exhibit A sits at
       template page 14, ahead of the schedule, and shifting it would send a
       reader to the acceptance block looking for the pricing terms. */
    if (entry.target < CATALOGUE_FIRST_PAGE) continue;

    const page = byTemplatePage[entry.page - 1];
    if (!page) continue;

    page.drawRectangle({
      x: entry.x - 2,
      y: entry.y - 2,
      width: entry.endX - entry.x + 5,
      height: entry.height + 4,
      color: rgb(1, 1, 1),
    });

    const label = String(entry.target + shift);
    const size = Math.min(9, entry.height + 1.5);
    page.drawText(label, {
      x: entry.endX - font.widthOfTextAtSize(label, size),
      y: entry.y + 1,
      size,
      font,
      // The artwork sets these in the brand blue, not the body ink. Redrawing
      // in ink leaves three numbers that look like corrections — which, on a
      // contract, is exactly the wrong impression.
      color: BRAND,
    });
  }
}

/**
 * Rewrite "Page 13 of 66".
 *
 * The template's footer is artwork with the total baked in, and the agreement
 * that comes out of here is nowhere near 66 pages. A contract that tells the
 * person signing it there are forty-six pages they cannot see is a defect, not
 * a cosmetic one — so the old number is covered and the real one drawn over
 * it, in the same place and at the same size.
 *
 * Pages inside the replaced schedule carry their own numbering, drawn by
 * `buildSchedule`.
 */
function renumberFooters(
  byTemplatePage: (PDFPage | null)[],
  allPages: PDFPage[],
  font: PDFFont
) {
  /* Where each page ended up. `byTemplatePage` is indexed by the TEMPLATE's
     numbering, so searching it returns the old number — which is the one being
     corrected. The position has to come from the generated document. */
  const positionOf = new Map(allPages.map((page, index) => [page, index + 1]));
  const totalPages = allPages.length;

  for (const footer of FOOTERS) {
    const page = byTemplatePage[footer.page - 1];
    if (!page) continue;

    const position = positionOf.get(page);
    if (!position) continue;

    /* Covers the old number. The glyphs stay in the PDF's text layer —
       pdf-lib cannot remove content from a page it did not create — so a tool
       that scrapes text will still see "Page 4 of 66" behind the patch. What a
       signer reads, and what prints, is correct; that is the artifact the
       signature attaches to. */
    page.drawRectangle({
      x: footer.x - 3,
      y: footer.y - 3,
      width: footer.endX - footer.x + 8,
      height: footer.height + 6,
      color: rgb(1, 1, 1),
    });

    const label = `Page ${position} of ${totalPages}`;
    page.drawText(label, {
      // Right-aligned, like the original.
      x: footer.endX - font.widthOfTextAtSize(label, 7.5),
      y: footer.y + 1,
      size: 7.5,
      font,
      color: BRAND,
    });
  }
}

/**
 * Stamp the execution page.
 *
 * Used by the internal driver, which captures a typed name. A platform
 * signature replaces this: SignEasy and DocuSign write their own field and
 * return a certificate, and we store their envelope rather than our drawing.
 */
function stampSignature(
  pages: (PDFPage | null)[],
  signature: SignatureFields,
  bold: PDFFont,
  regular: PDFFont
) {
  const date = signature.signedAt.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  fill(pages, "c_sig", signature.signedName, bold, { size: 13 });
  fill(pages, "c_date", date, regular, { size: 10 });
  fill(pages, "c_name", signature.signedName, regular, { size: 10 });
  fill(pages, "c_title", signature.signedTitle ?? "", regular, { size: 10 });

  /* Exhibit A carries its own acceptance block in the 2026 FINAL template —
     the client initials the commercial terms separately from the agreement
     body. Left blank, an executed MSA would show the body signed and the
     pricing exhibit unaccepted, which is the one page a billing dispute turns
     on. Same signature, same date: one act of signing accepts both, and the
     agreement says so. */
  fill(pages, "c_sig_exA", signature.signedName, bold, { size: 13 });
  fill(pages, "c_date_exA", date, regular, { size: 10 });
  fill(pages, "c_name_exA", signature.signedName, regular, { size: 10 });
  fill(pages, "c_title_exA", signature.signedTitle ?? "", regular, { size: 10 });

  /* The audit line, at the foot of the execution page.
   *
   * A typed name is a valid electronic signature under E-SIGN/UETA when
   * intent, attribution and record integrity are captured; this is the
   * record-integrity half, printed on the document so a copy that leaves our
   * system carries its own evidence.
   *
   * At the FOOT of the page, not under the signature: drawn there it landed on
   * top of the "Signature" label and the rule beneath it, which is how a
   * careful document starts looking careless. */
  const anchor = ANCHORS.c_sig;
  const page = pages[anchor.page - 1];
  if (!page) return;

  const lines = [
    `Signed electronically by ${signature.signedName} on ${signature.signedAt.toISOString()}` +
      (signature.ip ? ` from ${signature.ip}` : ""),
    `Agreement fingerprint (SHA-256): ${signature.agreementHash}`,
  ];

  lines.forEach((line, index) => {
    page.drawText(clip(line, regular, 6.5, PAGE_WIDTH - MARGIN * 2), {
      x: MARGIN,
      y: 54 - index * 9,
      size: 6.5,
      font: regular,
      color: MUTED,
    });
  });
}

/* --- Exhibit C ------------------------------------------------------------ */

/**
 * Everything the Client told us, on the record.
 *
 * Laid out as labelled rows rather than a table: the values are of wildly
 * different lengths — a two-letter state next to a full street address — and
 * a fixed grid either truncates the long ones or wastes two thirds of the
 * page on the short ones.
 *
 * A value we do not hold prints as "—" rather than being skipped. An omitted
 * row reads as "this does not apply"; a dash reads as "not given", which is
 * the true statement and the one that shows an admin what is missing.
 */
function buildClientProfile(
  pdf: PDFDocument,
  companyName: string,
  profile: ClientProfile,
  bold: PDFFont,
  regular: PDFFont
): PDFPage[] {
  const pages: PDFPage[] = [];
  const LABEL_WIDTH = 150;
  const VALUE_X = MARGIN + LABEL_WIDTH;
  const VALUE_WIDTH = PAGE_WIDTH - MARGIN - VALUE_X;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  let y = PAGE_HEIGHT - MARGIN;

  const header = () => {
    page.drawText("EXHIBIT C · CLIENT INFORMATION", {
      x: MARGIN,
      y,
      size: 8,
      font: bold,
      color: BRAND,
    });
    y -= 22;
    page.drawText(companyName, { x: MARGIN, y, size: 15, font: bold, color: INK });
    y -= 16;
    page.drawText("As provided by the Client during onboarding.", {
      x: MARGIN,
      y,
      size: 8,
      font: regular,
      color: MUTED,
    });
    y -= 26;
  };

  header();

  /** Start a new page when the next block would run off this one. */
  const room = (needed: number) => {
    if (y - needed > MARGIN + 30) return;
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    y = PAGE_HEIGHT - MARGIN;
    header();
  };

  const section = (title: string) => {
    /* Heading plus two rows. A heading alone at the foot of a page — which is
       what a smaller reservation produces — reads as an empty section, and
       the reader has to turn over to find out it was not. */
    room(22 + ROW_HEIGHT * 2);
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y: y + 10 },
      end: { x: PAGE_WIDTH - MARGIN, y: y + 10 },
      thickness: 0.5,
      color: RULE,
    });
    page.drawText(title.toUpperCase(), { x: MARGIN, y, size: 7.5, font: bold, color: BRAND });
    y -= 16;
  };

  const row = (label: string, value: string | null | undefined) => {
    room(ROW_HEIGHT * 2);
    page.drawText(label, { x: MARGIN, y, size: 8.5, font: regular, color: MUTED });

    const text = value && value.trim().length > 0 ? value.trim() : "—";
    // Wrapped, not truncated: a street address that loses its second half is
    // worse than one that takes two lines.
    const words = text.split(/\s+/);
    let line = "";
    const out: string[] = [];
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (regular.widthOfTextAtSize(candidate, 9) > VALUE_WIDTH && line) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) out.push(line);

    for (const [index, l] of out.entries()) {
      if (index > 0) room(ROW_HEIGHT);
      page.drawText(l, { x: VALUE_X, y, size: 9, font: regular, color: INK });
      if (index < out.length - 1) y -= 12;
    }
    y -= ROW_HEIGHT;
  };

  section("The business");
  row("Legal business name", companyName);
  row("Trading name (DBA)", profile.tradingName);
  row("Business type", profile.businessType);
  row("EIN", profile.einLast4 ? `•••• ${profile.einLast4}` : null);
  row("Business address", profile.businessAddress);
  row("Billing address", profile.billingAddress ?? "Same as business address");
  row(
    "States of operation",
    profile.statesOfOperation?.length ? profile.statesOfOperation.join(", ") : null
  );

  section("Authorised signer");
  row("Name", profile.signer?.name);
  row("Title", profile.signer?.title);
  row("Email", profile.signer?.email);

  if (profile.prescribers?.length) {
    section("Prescribers");
    for (const [index, p] of profile.prescribers.entries()) {
      row(`Prescriber ${index + 1}`, p.name);
      row("  DEA", p.deaLast4 ? `•••• ${p.deaLast4}` : "Not registered");
      row("  DEA expires", p.deaExpiration);
      row("  NPI", p.npiLast4 ? `•••• ${p.npiLast4}` : null);
      row("  State licence", p.stateLicenseLast4 ? `•••• ${p.stateLicenseLast4}` : null);
    }
  }

  if (profile.licenses?.length) {
    section("Licences on file");
    for (const licence of profile.licenses) {
      row(
        [licence.type, licence.state].filter(Boolean).join(" · "),
        [
          licence.numberLast4 ? `•••• ${licence.numberLast4}` : null,
          licence.expiresAt ? `expires ${licence.expiresAt}` : null,
        ]
          .filter(Boolean)
          .join(", ")
      );
    }
  }

  section("Account");
  row("Account type", profile.accountType);
  row("MediCraft representative", profile.medicraftRep);
  row("How they heard about us", profile.howHeard);

  return pages;
}
