/* Mask unit tests. Run with `npm test`.

   These are pure functions, so they need no DOM and no database — which is
   exactly why they are worth testing: the DEA checksum and the NPI Luhn check
   are the two places in this codebase where a subtle arithmetic slip would
   silently accept an invalid regulated identifier, and neither failure is
   visible by looking at the form. */

import {
  formatUsPhone, parseUsPhone, isValidUsPhone, displayUsPhone,
  formatDate, parseDate, isValidDate, displayDate,
  isValidDea, isValidNpi, formatZip,
  formatCardNumber, cardBrand, isValidCardNumber,
  formatCardExpiry, parseCardExpiry, cvvLength,
} from "../lib/masks";

let pass = 0, fail = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; }
  else { fail++; console.log(`  FAIL ${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
};

// Phone — progressive mask
eq("phone empty", formatUsPhone(""), "");
eq("phone 3", formatUsPhone("727"), "(727");
eq("phone 7", formatUsPhone("7275550"), "(727) 555-0");
eq("phone 10", formatUsPhone("7275550142"), "(727) 555-0142");
eq("phone absorbs +1", formatUsPhone("+1 727 555 0142"), "(727) 555-0142");
eq("phone caps at 10", formatUsPhone("72755501429999"), "(727) 555-0142");
eq("phone parse", parseUsPhone("(727) 555-0142"), "+17275550142");
eq("phone parse partial", parseUsPhone("727555"), null);
eq("phone display", displayUsPhone("+17275550142"), "(727) 555-0142");
eq("phone NANP rejects 111", isValidUsPhone("(111) 111-1111"), false);
eq("phone NANP accepts", isValidUsPhone("(727) 555-0142"), true);

// Date — mm-dd-yyyy
eq("date 2", formatDate("03"), "03");
eq("date 4", formatDate("0304"), "03-04");
eq("date 8", formatDate("03042026"), "03-04-2026");
eq("date absorbs dashes", formatDate("3-4-2026"), "34-20-26");
eq("date parse", parseDate("03-04-2026"), "2026-03-04");
eq("date rejects feb 30", parseDate("02-30-2026"), null);
eq("date accepts leap", parseDate("02-29-2024"), "2024-02-29");
eq("date rejects non-leap", parseDate("02-29-2026"), null);
eq("date rejects month 13", parseDate("13-01-2026"), null);
eq("date display", displayDate("2026-03-04"), "03-04-2026");
eq("date roundtrip", displayDate(parseDate("12-25-2026")!), "12-25-2026");

// DEA checksum — real-format sample
eq("dea valid", isValidDea("AB1234563"), true);
eq("dea bad checksum", isValidDea("AB1234564"), false);
eq("dea wrong shape", isValidDea("A1234563"), false);

// NPI Luhn — a known-valid test NPI
eq("npi valid", isValidNpi("1234567893"), true);
eq("npi bad check", isValidNpi("1234567894"), false);
eq("npi short", isValidNpi("123456789"), false);

// ZIP
eq("zip 5", formatZip("34683"), "34683");
eq("zip+4", formatZip("346831234"), "34683-1234");

console.log(`\n  masks: ${pass} passed, ${fail} failed`);

/* Idempotency. The client transforms once and the server transforms the same
   object again, so every parse must accept its own output. This is the test
   that would have caught the double-transform bug before the E2E run did. */
eq("date parse is idempotent", parseDate(parseDate("12-25-2027")!), "2027-12-25");
eq("date format accepts ISO", formatDate("2027-12-25"), "12-25-2027");
eq("phone parse is idempotent", parseUsPhone(parseUsPhone("(727) 555-0142")!), "+17275550142");
eq("phone valid on its own output", isValidUsPhone(parseUsPhone("(727) 555-0142")!), true);
eq("date valid on its own output", isValidDate(parseDate("02-29-2024")!), true);


/* --- Payment card ---------------------------------------------------------
   The card number is the one field on the onboarding form where a single
   mistyped digit produces something that LOOKS right and fails only when
   somebody tries to bill it. Luhn is what catches that at the keyboard, so it
   is worth a test for the same reason the DEA and NPI checksums above are.

   `cvvLength` is here because Amex is the exception on every axis — 15 digits,
   4-6-5 grouping, a four-digit code on the front — and every one of those is
   somewhere a 16-digit assumption silently truncates or rejects a valid card.
   ------------------------------------------------------------------------ */
eq("card groups 4-4-4-4", formatCardNumber("4242424242424242"), "4242 4242 4242 4242");
eq("card groups amex 4-6-5", formatCardNumber("378282246310005"), "3782 822463 10005");
eq("card keeps 19 digits", formatCardNumber("4242424242424242424").replace(/ /g, "").length, 19);
eq("card caps at 19", formatCardNumber("42424242424242424249999").replace(/ /g, "").length, 19);
eq("card strips letters", formatCardNumber("4242-abc-4242 4242 4242"), "4242 4242 4242 4242");

eq("brand visa", cardBrand("4242424242424242"), "Visa");
eq("brand amex", cardBrand("378282246310005"), "American Express");
eq("brand mastercard 5-series", cardBrand("5555555555554444"), "Mastercard");
eq("brand mastercard 2-series", cardBrand("2223003122003222"), "Mastercard");
eq("brand discover", cardBrand("6011111111111117"), "Discover");
eq("brand unknown", cardBrand("9999999999999999"), null);
eq("brand empty", cardBrand(""), null);

eq("luhn visa", isValidCardNumber("4242 4242 4242 4242"), true);
eq("luhn amex", isValidCardNumber("378282246310005"), true);
eq("luhn mastercard", isValidCardNumber("5555555555554444"), true);
// The classic typo: two adjacent digits swapped. Luhn exists to catch it.
eq("luhn rejects transposition", isValidCardNumber("4242424242424224"), false);
eq("luhn rejects one wrong digit", isValidCardNumber("4242424242424243"), false);
eq("luhn rejects too short", isValidCardNumber("424242"), false);
eq("luhn rejects empty", isValidCardNumber(""), false);

eq("expiry leaves 1 (could be 12)", formatCardExpiry("1"), "1");
eq("expiry pads 4 to 04", formatCardExpiry("4"), "04");
eq("expiry formats", formatCardExpiry("0428"), "04 / 28");
eq("expiry caps at 4 digits", formatCardExpiry("042899"), "04 / 28");
eq("expiry month 00 rejected", parseCardExpiry("0028"), null);
eq("expiry month 13 rejected", parseCardExpiry("1328"), null);
eq("expiry partial rejected", parseCardExpiry("04"), null);
eq("expiry 2099 accepted", parseCardExpiry("1299"), { month: 12, year: 2099 });
// A card is good THROUGH the last day of its month, so a long-past date is
// the only safe constant to assert on.
eq("expiry 2020 rejected", parseCardExpiry("0120"), null);

eq("cvv 4 on amex", cvvLength("378282246310005"), 4);
eq("cvv 3 on visa", cvvLength("4242424242424242"), 3);
eq("cvv 3 when unknown", cvvLength(""), 3);

console.log(`  masks (idempotency): ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
