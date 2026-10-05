/* ===========================================================================
   Input masks — US phone and mm-dd-yyyy date.

   Written here rather than pulled in as a dependency. Both are narrow,
   format-specific transforms of about fifteen lines each, and the popular
   mask libraries ship a cursor-management engine that fights React's
   controlled inputs. More to the point, a mask library cannot know that the
   *stored* value and the *displayed* value should differ — and for both of
   these they must:

     · A phone is displayed as (727) 555-0142 and stored as +17275550142,
       because E.164 is what a telephony API, a CRM and a `tel:` link all
       expect, and because "(727) 555-0142" and "727-555-0142" are the same
       number that would otherwise deduplicate as two contacts.

     · A date is displayed as mm-dd-yyyy, the format the paper account-setup
       form uses, and stored as an ISO `yyyy-mm-dd` date. Storing the display
       string would make "03-04-2026" ambiguous the moment anyone outside the
       US reads it.

   So each mask is a pair: `format` for what the user sees, `parse` for what
   the database gets. Both are pure functions, usable on the server for
   re-validation — never trust a mask, it is a convenience for typing.
   ========================================================================= */

/* --- US phone ------------------------------------------------------------ */

/**
 * Progressive display mask. Formats as far as the digits allow, so the user
 * sees the shape forming rather than a template full of underscores they have
 * to type around.
 *
 *   ""          → ""
 *   "727"       → "(727"
 *   "7275550"   → "(727) 555-0"
 *   "7275550142"→ "(727) 555-0142"
 */
export function formatUsPhone(input: string): string {
  // A leading country code is the one thing a paste can add that the mask
  // must absorb rather than treat as an area code.
  const digits = input.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** E.164 for storage, or null when the number is not a complete US number. */
export function parseUsPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "").replace(/^1(?=\d{10})/, "");
  return digits.length === 10 ? `+1${digits}` : null;
}

/** Turn a stored +1XXXXXXXXXX back into the display form. */
export function displayUsPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  return formatUsPhone(e164.replace(/^\+1/, ""));
}

/**
 * Is this a plausible US number?
 *
 * NANP rules, not just a digit count: an area code and an exchange code both
 * start 2–9. "(111) 111-1111" is ten digits and is not a phone number, and
 * accepting it means someone's onboarding stalls on an unreachable contact.
 */
export function isValidUsPhone(input: string): boolean {
  const digits = input.replace(/\D/g, "").replace(/^1(?=\d{10})/, "");
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits);
}

/* --- Date, mm-dd-yyyy ---------------------------------------------------- */

/**
 * Progressive display mask for mm-dd-yyyy.
 *
 * Separators are inserted as the user passes each boundary, and typing one
 * manually is absorbed rather than duplicated — `parse` strips non-digits
 * first, so "3-4-2026" and "03042026" both land correctly.
 */
export function formatDate(input: string): string {
  // A stored ISO value can be handed back to the field (an edit form, or a
  // re-render after the resolver transformed it); show it as mm-dd-yyyy
  // rather than shredding it into "20-27-1225".
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (iso) return `${iso[2]}-${iso[3]}-${iso[1]}`;

  const digits = input.replace(/\D/g, "").slice(0, 8);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

/**
 * ISO `yyyy-mm-dd` for storage, or null if the date is not real.
 *
 * ACCEPTS EITHER FORMAT, AND THAT IS LOAD-BEARING. The obvious implementation
 * takes only mm-dd-yyyy, and it breaks the moment the value is parsed twice —
 * which is exactly what happens here: React Hook Form hands `handleSubmit`
 * the *transformed* values, the server action re-parses the same object with
 * the same schema, and an already-ISO "2027-12-25" strips to "20271225" and
 * reads as month 20. Making the function idempotent is what lets the client
 * and the server share one schema instead of maintaining two.
 *
 * The round-trip check is what catches 02-30-2026: `new Date(2026, 1, 30)`
 * happily rolls over to 2 March, so comparing the parts back against the
 * constructed date is the only way to reject it. A regex cannot.
 */
export function parseDate(input: string): string | null {
  const trimmed = input.trim();

  // Already storage-shaped: yyyy-mm-dd.
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  const digits = trimmed.replace(/\D/g, "");
  if (!iso && digits.length !== 8) return null;

  const month = iso ? Number(iso[2]) : Number(digits.slice(0, 2));
  const day = iso ? Number(iso[3]) : Number(digits.slice(2, 4));
  const year = iso ? Number(iso[1]) : Number(digits.slice(4));

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1900 || year > 2200) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

/** Turn a stored ISO date (or Date) back into mm-dd-yyyy for display. */
export function displayDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${month}-${day}-${year}` : "";
}

export function isValidDate(input: string): boolean {
  return parseDate(input) !== null;
}

/** Not in the past — for licence and registration expiry fields. */
export function isFutureDate(input: string): boolean {
  const iso = parseDate(input);
  if (!iso) return false;
  const today = new Date().toISOString().slice(0, 10);
  return iso >= today;
}

/* --- Other formats the account-setup form needs -------------------------- */

/**
 * DEA registration numbers are two letters then seven digits, and the last
 * digit is a checksum. Validating it here means a transposed digit is caught
 * at the keyboard rather than by the DEA lookup three days later.
 *
 * The check: sum digits 1,3,5 plus twice the sum of digits 2,4,6; the last
 * digit of that total must equal digit 7.
 */
export function formatDea(input: string): string {
  const cleaned = input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `${cleaned.slice(0, 2).replace(/[^A-Z]/g, "")}${cleaned.slice(2, 9).replace(/\D/g, "")}`;
}

export function isValidDea(input: string): boolean {
  const value = formatDea(input);
  if (!/^[A-Z]{2}\d{7}$/.test(value)) return false;

  const d = value.slice(2).split("").map(Number);
  const checksum = (d[0]! + d[2]! + d[4]!) + 2 * (d[1]! + d[3]! + d[5]!);
  return checksum % 10 === d[6];
}

/**
 * NPI is ten digits with a Luhn check over the number prefixed by 80840
 * (the NPI-specific constant from the ISO 7812 issuer namespace).
 */
export function formatNpi(input: string): string {
  return input.replace(/\D/g, "").slice(0, 10);
}

export function isValidNpi(input: string): boolean {
  const digits = formatNpi(input);
  if (digits.length !== 10) return false;

  const payload = `80840${digits.slice(0, 9)}`;
  let sum = 0;
  let double = true;

  for (let i = payload.length - 1; i >= 0; i--) {
    let n = Number(payload[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }

  return (10 - (sum % 10)) % 10 === Number(digits[9]);
}

/** ZIP or ZIP+4, formatted as the user types. */
export function formatZip(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 9);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/* --- Payment card ---------------------------------------------------------
   Formatting and checking only. Nothing here stores, logs or transmits a card
   number; `cardBrand` and `cardLast4` exist so the rest of the app can talk
   about a card without ever holding one.
   ------------------------------------------------------------------------ */

/**
 * Card number, grouped as the user types.
 *
 * Amex really is 4-6-5 rather than 4-4-4-4, and getting that wrong is the
 * most visible way to tell a prescriber you have never taken their card
 * before. 19 digits is the cap because Maestro and some UnionPay ranges
 * genuinely are that long; the old 16-digit assumption silently truncated
 * them into an invalid number.
 */
export function formatCardNumber(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 19);
  const groups = /^3[47]/.test(digits) ? [4, 6, 5] : [4, 4, 4, 4, 3];

  const parts: string[] = [];
  let at = 0;
  for (const size of groups) {
    if (at >= digits.length) break;
    parts.push(digits.slice(at, at + size));
    at += size;
  }
  return parts.join(" ");
}

/** The issuer, from the leading digits. Used for display and CVV length. */
export function cardBrand(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (!d) return null;
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "American Express";
  if (/^6(?:011|5|4[4-9])/.test(d)) return "Discover";
  if (/^3(?:0[0-5]|[68])/.test(d)) return "Diners Club";
  if (/^35/.test(d)) return "JCB";
  return null;
}

/**
 * The Luhn check digit.
 *
 * Catches a mistyped or transposed digit before anything downstream tries to
 * charge it — which is the entire reason to run it client-side. It says
 * nothing about whether the card exists or has funds; only a processor can
 * answer that.
 */
export function isValidCardNumber(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  if (!/^\d{13,19}$/.test(digits)) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Expiry, as MM / YY. */
export function formatCardExpiry(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) {
    /* A lone "2" could still become "02" or "12", so it is left alone; a lone
       "4" cannot be the start of any month, so it is padded to "04" and the
       user carries on typing the year. Doing this on every keystroke instead
       would make "1" jump to "01/" and put December out of reach. */
    return d.length === 1 && Number(d) > 1 ? `0${d}` : d;
  }
  return `${d.slice(0, 2)} / ${d.slice(2)}`;
}

/** Expiry month and year, or null if it is not a real future month. */
export function parseCardExpiry(input: string): { month: number; year: number } | null {
  const d = input.replace(/\D/g, "");
  if (d.length !== 4) return null;

  const month = Number(d.slice(0, 2));
  if (month < 1 || month > 12) return null;

  const year = 2000 + Number(d.slice(2));
  const now = new Date();
  /* A card is good through the LAST day of its expiry month, so the
     comparison is against the first of the following month. Comparing against
     today would reject a perfectly valid card for up to thirty days. */
  if (new Date(year, month, 1) <= now) return null;

  return { month, year };
}

export function isValidCardExpiry(input: string): boolean {
  return parseCardExpiry(input) !== null;
}

/** Amex prints four digits on the front; everyone else prints three on the back. */
export function cvvLength(cardNumber: string): 3 | 4 {
  return /^3[47]/.test(cardNumber.replace(/\D/g, "")) ? 4 : 3;
}
