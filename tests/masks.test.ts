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

console.log(`  masks (idempotency): ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
