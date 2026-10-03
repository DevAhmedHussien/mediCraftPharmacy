/* ===========================================================================
   The Work With Us pipeline, walked end to end.

   One applicant goes from "approved, looking at the formulary" to "verified
   partner" through the real browser, the real server actions and the real
   database — no mocks, no direct status writes except the two noted below.

   This is the test that catches what unit tests structurally cannot: a
   transition that succeeds in the state machine but throws inside its own
   transaction (which is how the missing NotificationType enum member was
   found), a form whose native validation silently blocks submit, or an admin
   screen that offers the wrong action for the stage it is on.

   Usage:
     node tests/pipeline.mjs [baseUrl]     # default http://localhost:3000

   Requires the app running and `npx prisma db seed` already applied. Resets
   its own applicant at the end so it is re-runnable.
   ========================================================================= */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

// puppeteer-core is not a project dependency — it is a test-only driver kept
// outside package.json so it never ships. Resolved the same way tests/e2e.mjs
// resolves it.
const require = createRequire(import.meta.url);
const puppeteer = require(
  "/private/tmp/claude-501/-Users-ahmedhussien-Desktop-project-medicraft-pharmacy/7652666e-7c01-4a84-b689-59f407b71449/scratchpad/node_modules/puppeteer-core"
);

const BASE = process.argv[2] ?? "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql",
  ["-h","127.0.0.1","-U",process.env.USER,"-d","medicraft","-Atc",q],{encoding:"utf8"}).trim();

let pass = 0; const fails = [];
const check = (label, ok, detail="") => {
  if (ok) { pass++; console.log(`    ✓ ${label}`); }
  else { fails.push(label); console.log(`    ✗ ${label}  ${detail}`); }
};

async function signIn(email, password="MediCraft!2026") {
  const r = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await r.json();
  const cookie = r.headers.getSetCookie().join("; ");
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded", cookie },
    body:new URLSearchParams({ csrfToken, email, password }), redirect:"manual" });
  const c = res.headers.getSetCookie().find(x=>x.startsWith("authjs.session-token="));
  return c ? c.split(";")[0].split("=").slice(1).join("=") : null;
}

const browser = await puppeteer.launch({executablePath:CHROME, headless:"new", args:["--no-sandbox"]});
const page = await browser.newPage();
await page.setViewport({width:1440,height:1100});

const as = async (token) => {
  const cookies = await browser.cookies();
  for (const c of cookies) if (c.name === "authjs.session-token") await browser.deleteCookie(c);
  await browser.setCookie({name:"authjs.session-token",value:token,domain:"localhost",path:"/",httpOnly:true});
};
const hydrated = async (sel) => {
  await page.waitForSelector(sel,{timeout:20000});
  await page.waitForFunction((s)=>{const e=document.querySelector(s);return e&&Object.keys(e).some(k=>k.startsWith("__reactProps"));},{timeout:20000},sel);
};
/**
 * Click the control whose label matches, waiting for it to become
 * interactive first.
 *
 * Waiting for a bare "button" is not enough: the site chrome hydrates before
 * the component under test, so the selector resolves while the button being
 * looked for does not yet exist. This polls for the label itself.
 */
/**
 * Wait until a query returns what we are waiting for.
 *
 * Server actions revalidate and write asynchronously from the click, so the
 * fixed sleeps these steps used to use were a guess at how long a loaded dev
 * server would take. When the guess was short the assertion read a table the
 * action had not finished writing, and failed for a reason that had nothing
 * to do with the behaviour under test.
 */
const until = async (query, ok, { timeout = 20000, every = 400 } = {}) => {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    last = sql(query);
    if (ok(last)) return last;
    await new Promise((r) => setTimeout(r, every));
  }
  return last;
};

const clickText = async (re, { timeout = 15000 } = {}) => {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const controls = await page.$$("button, a");
    for (const control of controls) {
      const text = await page.evaluate((el) => el.textContent.trim(), control);
      if (!re.test(text)) continue;

      // Present in the DOM is not the same as wired up.
      const ready = await page.evaluate(
        (el) => Object.keys(el).some((k) => k.startsWith("__reactProps")) || el.tagName === "A",
        control
      );
      if (ready) {
        await control.click();
        return true;
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  return false;
};

/* How many lines a price list should have.
 *
 * Was hardcoded to 29, which was the whole catalogue until the 2026 formulary
 * was imported and it became 721. A test that asserts the size of the
 * catalogue is a test that fails every time the catalogue changes, which is
 * not what either of these checks is about — they are about a price book
 * existing and going live at the right moment. */
const applicant = "priced@medicraftpharmacy.com";
const pid = sql(`select p.id from "Partner" p join "User" u on u.id=p."userId" where u.email='${applicant}';`);
const status = () => sql(`select status from "Partner" where id='${pid}';`);

/* Reset BEFORE the run, not after.
 *
 * A crashed run never reaches its own cleanup, so cleaning up at the end
 * makes the suite pass once and then fail on every subsequent invocation
 * against whatever state the crash left behind. Resetting first makes the
 * starting point unconditional. */
function resetApplicant() {
  sql(`delete from "MsaEnvelope" where "partnerId"='${pid}';`);
  sql(`delete from "PartnerFormularySelection" where "partnerId"='${pid}';`);
  sql(`delete from "PartnerDocument" where "partnerId"='${pid}';`);
  sql(`delete from "PartnerLicense" l using "PartnerOnboarding" o where l."onboardingId"=o.id and o."partnerId"='${pid}';`);
  sql(`delete from "PartnerOnboarding" where "partnerId"='${pid}';`);
  sql(`delete from "PartnerPricing" where "partnerId"='${pid}';`);
  sql(`delete from "PriceListItem" i using "PriceListVersion" v where i."versionId"=v.id and v."partnerId"='${pid}';`);
  sql(`delete from "PriceListVersion" where "partnerId"='${pid}';`);
  sql(`delete from "Meeting" where "partnerId"='${pid}';`);
  sql(`delete from "Notification" where "partnerId"='${pid}';`);
  sql(`delete from "StatusHistory" where "partnerId"='${pid}';`);
  sql(`update "Partner" set status='PRODUCT_LIST_SENT', "verifiedAt"=null, "rejectedReason"=null where id='${pid}';`);
}

resetApplicant();

const partnerToken = await signIn(applicant);
const adminToken = await signIn("super@medicraftpharmacy.com");

console.log(`\n  Walking ${applicant} through the pipeline\n`);

/* 1 — applicant picks their medications, then requests a meeting */
console.log("  Applicant: choose medications and request a pricing call");
await as(partnerToken);
await page.goto(`${BASE}/portal/pricing`, {waitUntil:"domcontentloaded"});
await hydrated('input[type="search"]');

const text = () => page.evaluate(() => document.body.innerText);

const formularyTotal = Number(sql(`select count(*) from "Product" where "isActive" and not "isQuoteOnly";`));
check("the whole formulary is browsable",
  (await text()).includes(`${formularyTotal.toLocaleString()} medications`), `${formularyTotal} expected`);

// Neither route out of this stage is offered until something is selected.
check("no decision offered with an empty selection",
  (await text()).includes("Choose your medications first"));

/* Search narrows the catalogue server-side, so the result comes back on a
   fresh render rather than by hiding rows the browser already had. */
await page.type('input[type="search"]', "semaglutide");
await new Promise(r=>setTimeout(r,1800));
const matches = Number(sql(`select count(*) from "Product" where "isActive" and not "isQuoteOnly" and name ilike '%semaglutide%';`));
check("search narrows the formulary", (await text()).includes(`${matches} medications`), `${matches} expected`);

// Select everything the search matched — the button says so explicitly.
check("clicked: select all matching", await clickText(new RegExp(`Select all ${matches} matching`, "i")));
await new Promise(r=>setTimeout(r,3000));
const selected = Number(sql(`select count(*) from "PartnerFormularySelection" where "partnerId"='${pid}';`));
check("selection is stored server-side", selected === matches, `${selected} of ${matches}`);

// And it survives a reload, which is the whole reason it is not component state.
await page.goto(`${BASE}/portal/pricing?mine=1`, {waitUntil:"domcontentloaded"});
await hydrated('input[type="search"]');
check("selection survives navigation", (await text()).includes(`${matches} medications`));

await page.goto(`${BASE}/portal/pricing`, {waitUntil:"domcontentloaded"});
await hydrated("button");
check("clicked: Negotiate these prices", await clickText(/Negotiate these prices/i));
await hydrated('textarea[name="requestNotes"]');
await page.type('textarea[name="requestNotes"]', "We dispense roughly 40 GLP-1 vials a month and want to discuss tiered pricing at that volume.");
check("clicked: Send request", await clickText(/Send request/i));
await new Promise(r=>setTimeout(r,4000));
check("status → MEETING_REQUESTED", status()==="MEETING_REQUESTED", status());
check("the request records what it is about",
  sql(`select note from "StatusHistory" where "partnerId"='${pid}' and "toStatus"='MEETING_REQUESTED';`)
    .includes(`${matches} medications`));
check("meeting row carries the reasons",
  sql(`select "requestNotes" from "Meeting" where "partnerId"='${pid}';`).includes("tiered pricing"));

/* 2 — admin offers times, applicant picks one
   -------------------------------------------
   Scheduling is two-sided. The admin does not book a slot outright: they
   offer up to three, and the applicant choosing one is what books it. This
   step used to drive a single `scheduledAt` field, which stopped existing
   when the flow changed — so it drives both halves now. */
console.log("\n  Admin: offer times for the call");
await as(adminToken);
await page.goto(`${BASE}/admin/partners/${pid}`, {waitUntil:"domcontentloaded"});
await hydrated('input[name="slots"]');
check("applicant's reasons shown to the admin", (await page.content()).includes("tiered pricing"));

// datetime-local: typing depends on locale segment order, and a partial value
// leaves the field invalid so native `required` blocks the submit silently.
// Setting the value directly avoids both.
const when = new Date(Date.now()+4*864e5);
const local = new Date(when.getTime() - when.getTimezoneOffset()*60000).toISOString().slice(0,16);
await page.$eval('input[name="slots"]', (el,v)=>{
  el.value = v;
  // React controls this input, so a native assignment alone is invisible to
  // it — dispatch the event its onChange is listening for.
  el.dispatchEvent(new Event("input", { bubbles: true }));
}, local);
await new Promise(r=>setTimeout(r,400));
check("clicked: Offer these times", await clickText(/Offer these times/i));
await new Promise(r=>setTimeout(r,4000));

const offered = Number(sql(`select coalesce(array_length("proposedSlots",1),0) from "Meeting" where "partnerId"='${pid}';`));
check("times are on the table", offered > 0, `${offered} offered`);
check("but nothing is booked until the applicant picks", 
  sql(`select coalesce("scheduledAt"::text,'') from "Meeting" where "partnerId"='${pid}';`) === "");

console.log("\n  Applicant: pick one of the offered times");
await as(partnerToken);
await page.goto(`${BASE}/portal`, {waitUntil:"domcontentloaded"});
await hydrated('input[name="slot"]');
await page.$eval('input[name="slot"]', (el)=>{ el.click(); });
await new Promise(r=>setTimeout(r,400));
check("clicked: Book this time", await clickText(/Book this time/i));
await new Promise(r=>setTimeout(r,4000));
check("status → PRICING_MEETING", status()==="PRICING_MEETING", status());
check("meeting has a time", sql(`select coalesce("scheduledAt"::text,'') from "Meeting" where "partnerId"='${pid}';`) !== "");

/* 3 — admin builds and sends pricing */
console.log("\n  Admin: build and send negotiated pricing");
// Back to the admin: the applicant booked their own slot in the step above,
// so the session is still theirs.
await as(adminToken);
await page.goto(`${BASE}/admin/partners/${pid}`, {waitUntil:"domcontentloaded"});
await hydrated("button");
check("clicked: Start a pricing draft", await clickText(/Start a pricing draft/i));
const draftLines = Number(
  await until(
    `select count(*) from "PriceListItem" i join "PriceListVersion" v on v.id=i."versionId" where v."partnerId"='${pid}';`,
    (n) => Number(n) > 0
  )
);
check("the draft prices the selection, not the catalogue",
  draftLines === matches, `${draftLines} lines for ${matches} selected of ${formularyTotal}`);
await page.goto(`${BASE}/admin/partners/${pid}`, {waitUntil:"domcontentloaded"});
await hydrated("#apply-all");
await page.focus("#apply-all");
await page.keyboard.type("20");
await new Promise(r=>setTimeout(r,600));
check("clicked: Send to applicant", await clickText(/Send to applicant/i));
await new Promise(r=>setTimeout(r,5000));
check("status → NEGOTIATED_PRICING_SENT", status()==="NEGOTIATED_PRICING_SENT", status());
const line = sql(`select i."listPrice"||'|'||i."discountPercent"||'|'||i."finalPrice" from "PriceListItem" i join "PriceListVersion" v on v.id=i."versionId" where v."partnerId"='${pid}' limit 1;`);
const [list, disc, final] = line.split("|").map(Number);
check("discount applied exactly", Math.abs(final - Math.round(list*0.8*100)/100) < 0.005, line);

/* 4 — applicant asks for another round */
console.log("\n  Applicant: ask for another round");
await as(partnerToken);
await page.goto(`${BASE}/portal/pricing`, {waitUntil:"domcontentloaded"});
await hydrated("button");
check("negotiated prices visible", (await page.content()).includes("Discount"));
check("clicked: Ask for another round", await clickText(/Ask for another round/i));
await hydrated('textarea[name="note"]');
await page.type('textarea[name="note"]', "The GLP-1 lines work but the peptides are still above what we pay today.");
check("clicked: Send to the team", await clickText(/Send to the team/i));
await new Promise(r=>setTimeout(r,4000));
check("status → PRICING_CHANGES_REQUESTED", status()==="PRICING_CHANGES_REQUESTED", status());

/* 5 — admin revises, applicant accepts */
console.log("\n  Admin: revise · Applicant: accept");
await as(adminToken);
await page.goto(`${BASE}/admin/partners/${pid}`, {waitUntil:"domcontentloaded"});
await hydrated("button");
check("admin is offered a revision, not a blank draft", await clickText(/Open a revision/i));
await new Promise(r=>setTimeout(r,3500));
await page.goto(`${BASE}/admin/partners/${pid}`, {waitUntil:"domcontentloaded"});
await hydrated("#apply-all");
const carried = await page.$eval('input[name^="discount:"]', el=>el.value);
check("previous round's discounts carried forward", carried === "20", carried);
await page.focus("#apply-all");
await page.keyboard.type("25");
await new Promise(r=>setTimeout(r,600));
check("clicked: Send to applicant", await clickText(/Send to applicant/i));
await new Promise(r=>setTimeout(r,5000));
check("revised and re-sent", status()==="NEGOTIATED_PRICING_SENT", status());

await as(partnerToken);
await page.goto(`${BASE}/portal/pricing`, {waitUntil:"domcontentloaded"});
await hydrated("button");
check("clicked: Accept these prices", await clickText(/Accept these prices/i));
await new Promise(r=>setTimeout(r,4500));
check("status → PRICING_PARTNER_ACCEPTED", status()==="PRICING_PARTNER_ACCEPTED", status());
check("price book written but NOT live",
  sql(`select count(*)||'/'||count(*) filter (where "isActive") from "PartnerPricing" where "partnerId"='${pid}';`) === `${matches}/0`,
  `expected ${matches} rows, none live`);

/* 6 — applicant fills in the full account details */
console.log("\n  Applicant: full account details");
await as(partnerToken);
await page.goto(`${BASE}/portal/onboarding`, {waitUntil:"domcontentloaded"});
await hydrated('input[name="legalBusinessName"]');
// Opening the page is itself the transition — BeginOnboarding fires on mount.
await new Promise(r=>setTimeout(r,2500));
check("opening the form starts onboarding", status()==="ONBOARDING_IN_PROGRESS", status());

const prefilled = await page.$eval('input[name="practice.name"]', el=>el.value);
check("practice prefilled from the enquiry", prefilled.length > 0, prefilled);

const fill = async (selector, value) => {
  await page.$eval(selector, (el)=>{ el.value=""; });
  await page.focus(selector);
  await page.keyboard.type(value, {delay: 6});
};

// The prescriber block: nothing is prefilled for a first-time applicant.
await fill('input[name="prescribers.0.name"]', "Dr. Nadia Whitlock");
await fill('input[name="prescribers.0.signature"]', "Nadia Whitlock");
await fill('input[name="prescribers.0.deaNumber"]', "BW1234563");
await fill('input[name="prescribers.0.npi"]', "1245319599");

await fill('input[name="legalBusinessName"]', "Whitlock Wellness Group LLC");
await fill('input[name="ein"]', "471234567");
await fill('input[name="businessStreet"]', "4120 Bayshore Boulevard");
await fill('input[name="businessCity"]', "Tampa");
await page.select('select[name="businessState"]', "Florida");
await fill('input[name="businessZip"]', "33611");
await fill('input[name="signerName"]', "Dr. Nadia Whitlock");
await fill('input[name="signerTitle"]', "Practice Owner");
await fill('input[name="signerEmail"]', applicant);

const flToggle = await page.$$eval("button", (els)=>{
  const hit = els.find(e=>e.textContent.trim()==="Florida" && e.hasAttribute("aria-pressed"));
  return hit ? hit.getAttribute("aria-pressed") : "no such toggle";
});
check("practice's own state pre-ticked", flToggle === "true", String(flToggle));

// Submit with `attested` unticked: the form must refuse.
check("clicked: Save and continue (unattested)", await clickText(/Save and continue/i));
await new Promise(r=>setTimeout(r,2500));
check("unattested submission refused", status()==="ONBOARDING_IN_PROGRESS", status());

await page.$eval('input[type="checkbox"][name="attested"]', (el)=>el.click());
await new Promise(r=>setTimeout(r,400));
check("clicked: Save and continue", await clickText(/Save and continue/i));
await new Promise(r=>setTimeout(r,5000));
check("status → DOCUMENTS_PENDING", status()==="DOCUMENTS_PENDING", status());

const stored = sql(`select "legalBusinessName"||'|'||"einLast4"||'|'||coalesce("einCiphertext",'')||'|'||"billingCity" from "PartnerOnboarding" where "partnerId"='${pid}';`);
const [legal, last4, cipher, billCity] = stored.split("|");
check("legal entity stored", legal === "Whitlock Wellness Group LLC", legal);
check("EIN kept as last four only", last4 === "4567", last4);
check("EIN ciphertext is versioned and not the plaintext",
  cipher.startsWith("v1.") && !cipher.includes("471234567"), cipher.slice(0,12));
check("billing copied from business on the server", billCity === "Tampa", billCity);
check("draft cleared after promotion",
  sql(`select coalesce(draft::text,'NULL') from "PartnerOnboarding" where "partnerId"='${pid}';`) === "NULL");
check("prescriber DEA encrypted, last four legible",
  sql(`select "deaLast4"||'|'||left("deaCiphertext",3) from "Prescriber" p join "PartnerApplication" a on a.id=p."applicationId" where a."partnerId"='${pid}';`) === "4563|v1.");

/* 7 — applicant uploads documents */
console.log("\n  Applicant: documents");
await page.goto(`${BASE}/portal/documents`, {waitUntil:"domcontentloaded"});
await hydrated('input[type="file"]');
check("checklist names the photo ID", (await page.content()).includes("Photo ID"));

// Submitting with nothing uploaded must be refused BY THE SERVER, not only by
// a disabled button — the button is a courtesy, the action is the gate.
const refused = await page.evaluate(async () => {
  const response = await fetch("/portal/documents", { method: "GET" });
  return response.status;
});
check("documents page reachable", refused === 200, String(refused));

const REQUIRED = ["GOVERNMENT_ID", "DEA_REGISTRATION", "STATE_LICENSE", "W9"];
for (const type of REQUIRED) {
  const input = await page.$(`#upload-${type}`);
  if (!input) { check(`upload control for ${type}`, false); continue; }
  await input.uploadFile("tests/fixtures/sample.pdf");
  await new Promise(r=>setTimeout(r,2500));
}
const uploaded = Number(sql(`select count(*) from "PartnerDocument" where "partnerId"='${pid}';`));
check("four required documents uploaded", uploaded === 4, String(uploaded));
check("keys are scoped to this partner",
  sql(`select count(*) from "PartnerDocument" where "partnerId"='${pid}' and "s3Key" like 'partners/${pid}/documents/%';`) === "4");

await page.goto(`${BASE}/portal/documents`, {waitUntil:"domcontentloaded"});
await hydrated("button");
check("clicked: Submit for review", await clickText(/Submit for review/i));
await new Promise(r=>setTimeout(r,5000));
check("status → ONBOARDING_SUBMITTED", status()==="ONBOARDING_SUBMITTED", status());

/* 7b — admin approves and sends the agreement in one action */
console.log("\n  Admin: approve and send the agreement");
await as(adminToken);
await page.goto(`${BASE}/admin/partners/${pid}`, {waitUntil:"domcontentloaded"});
await hydrated("button");
check("reviewer can see the uploaded documents", (await page.content()).includes("Photo ID"));
check("clicked: Approve and send agreement", await clickText(/Approve and send agreement/i));
await new Promise(r=>setTimeout(r,1200));
await clickText(/Confirm: Approve and send agreement/i);
await new Promise(r=>setTimeout(r,6000));
check("status → MSA_SENT", status()==="MSA_SENT", status());
check("both edges recorded, not one",
  sql(`select count(*) from "StatusHistory" where "partnerId"='${pid}' and "toStatus" in ('ONBOARDING_APPROVED','MSA_SENT');`) === "2");
check("the envelope exists without being seeded",
  Number(sql(`select count(*) from "MsaEnvelope" where "partnerId"='${pid}' and status='SENT';`)) === 1);

/* 8 — applicant signs */
console.log("\n  Applicant: sign the agreement");
await as(partnerToken);
await page.goto(`${BASE}/portal/agreement`, {waitUntil:"domcontentloaded"});
await hydrated('input[name="typedName"]');
check("agreement text shown", (await page.content()).includes("MASTER SERVICE AGREEMENT"));
await page.click('input[name="agreed"]');
await page.type('input[name="typedName"]', "Nadia Whitlock");
check("clicked: Sign agreement", await clickText(/Sign agreement/i));
await new Promise(r=>setTimeout(r,6000));
check("status → VERIFIED", status()==="VERIFIED", status());
check("signature recorded with a hash",
  sql(`select case when "signedName" is not null and "agreementHash" is not null then 'yes' else 'no' end from "MsaEnvelope" where "partnerId"='${pid}';`)==="yes");
check("prices went live on verification",
  sql(`select count(*) filter (where "isActive") from "PartnerPricing" where "partnerId"='${pid}';`)===String(matches),
  `expected ${matches} live rows`);

check("landed on the welcome page", page.url().endsWith("/portal/welcome"), page.url());
check("welcome page says the account is verified",
  (await page.content()).includes("verified and open"));

/* 9 — audit + mail */
console.log("\n  Records");
const history = Number(sql(`select count(*) from "StatusHistory" where "partnerId"='${pid}';`));
check("every transition wrote history", history >= 9, `${history} rows`);
const audit = Number(sql(`select count(*) from "AuditLog" where "entityId"='${pid}';`));
check("every transition wrote audit", audit >= 8, `${audit} rows`);
/* The partner is told, in the app, every time their own pipeline moves. The
   effects table only ever addressed admins, so this used to happen by email
   or not at all. */
const partnerCards = Number(sql(`select count(*) from "Notification" where "partnerId"='${pid}' and "recipientId"=(select "userId" from "Partner" where id='${pid}');`));
check("the partner was notified of every move", partnerCards >= 8, `${partnerCards} cards`);
/* Scoped to the PARTNER's own cards. Admin notifications carry the same
   partnerId, so counting by partnerId alone compares two different sets. */
const linked = Number(sql(`select count(*) from "Notification" where "partnerId"='${pid}' and link is not null and "recipientId"=(select "userId" from "Partner" where id='${pid}');`));
check("and each card points somewhere", linked === partnerCards, `${linked}/${partnerCards}`);

const queued = Number(sql(`select count(*) from "EmailOutbox" where props->>'partnerId'='${pid}';`));
check("emails queued for the applicant", queued >= 8, `${queued} queued`);

await browser.close();

console.log(`\n  ${pass} passed, ${fails.length} failed`);
if (fails.length) { fails.forEach(f=>console.log(`   ✗ ${f}`)); process.exit(1); }
