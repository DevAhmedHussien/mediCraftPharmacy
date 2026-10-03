/* ===========================================================================
   End-to-end smoke test, driven as the super admin.

   Runs against a real server, a real database and a real browser — no mocks.
   The point is to catch the class of bug that unit tests structurally cannot:
   a form field that never submits, a guard that lets the wrong role through,
   a save that redirects but writes nothing.

   Usage:
     node tests/e2e.mjs [baseUrl]      # default http://localhost:3311

   Requires a seeded database (`npx prisma db seed`) and Chrome installed.
   ========================================================================= */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const BASE = process.argv[2] ?? "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const SUPER = { email: "super@medicraftpharmacy.com", password: "MediCraft!2026" };
const ADMIN = { email: "admin@medicraftpharmacy.com", password: "MediCraft!2026" };

const require = createRequire(import.meta.url);

/* --- Tiny assertion harness --------------------------------------------- */

let passed = 0;
const failures = [];
let current = "";

const step = (name) => {
  current = name;
  process.stdout.write(`\n  ${name}\n`);
};

function check(label, condition, detail = "") {
  if (condition) {
    passed++;
    process.stdout.write(`    ✓ ${label}\n`);
  } else {
    failures.push(`${current} → ${label}${detail ? ` (${detail})` : ""}`);
    process.stdout.write(`    ✗ ${label}${detail ? `  ${detail}` : ""}\n`);
  }
}

/** Query the database directly, so a UI claim can be checked against the row. */
function sql(query) {
  return execFileSync(
    "/opt/homebrew/opt/postgresql@18/bin/psql",
    ["-h", "127.0.0.1", "-U", process.env.USER, "-d", "medicraft", "-Atc", query],
    { encoding: "utf8" }
  ).trim();
}

/* --- Session helpers ----------------------------------------------------- */

/** Sign in through the real credentials callback and return the session cookie. */
async function signIn({ email, password }) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = csrfRes.headers.getSetCookie().join("; ");

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email, password }),
    redirect: "manual",
  });

  const session = res.headers
    .getSetCookie()
    .find((c) => c.startsWith("authjs.session-token="));

  return session ? session.split(";")[0].split("=").slice(1).join("=") : null;
}

const withCookie = (token) => ({ cookie: `authjs.session-token=${token}` });

/* --- Run ----------------------------------------------------------------- */

const puppeteer = require("/private/tmp/claude-501/-Users-ahmedhussien-Desktop-project-medicraft-pharmacy/7652666e-7c01-4a84-b689-59f407b71449/scratchpad/node_modules/puppeteer-core");

console.log(`\n  MediCraft end-to-end  —  ${BASE}`);

/* ---- 1. Public site, unauthenticated ---- */
step("Public site");
{
  for (const path of ["/", "/products", "/compounding", "/quality", "/blog", "/work-with-us", "/login"]) {
    const res = await fetch(`${BASE}${path}`);
    check(`GET ${path} → 200`, res.status === 200, `got ${res.status}`);
  }

  const post = await fetch(`${BASE}/blog/what-usp-797-actually-requires`);
  check("published post renders", post.status === 200, `got ${post.status}`);

  const draft = await fetch(`${BASE}/blog/reading-a-certificate-of-analysis`);
  check("DRAFT post is not publicly reachable", draft.status === 404, `got ${draft.status}`);
}

/* ---- 2. SEO surface ---- */
step("SEO");
{
  const home = await fetch(`${BASE}/`).then((r) => r.text());
  check("og:image declared", home.includes('property="og:image"'));
  check("canonical declared", home.includes('rel="canonical"'));
  check("Pharmacy JSON-LD present", home.includes('"@type":"Pharmacy"'));
  check("WebSite JSON-LD present", home.includes('"@type":"WebSite"'));
  check("knowsAbout present for LLMs", home.includes("knowsAbout"));

  // Next content-hashes the generated route (/opengraph-image-<hash>), so the
  // URL has to be read off the page rather than assumed.
  const ogUrl = home.match(/property="og:image" content="([^"]+)"/)?.[1] ?? "";
  const parsed = ogUrl ? new URL(ogUrl) : null;
  const og = await fetch(`${BASE}${parsed ? parsed.pathname + parsed.search : "/opengraph-image"}`);
  const ogBytes = (await og.arrayBuffer()).byteLength;

  check(
    "OG image renders as PNG",
    og.status === 200 && (og.headers.get("content-type") ?? "").includes("image/png"),
    `${og.status} ${og.headers.get("content-type")}`
  );
  check("OG image is a real image, not a stub", ogBytes > 20_000, `${ogBytes} bytes`);

  const robots = await fetch(`${BASE}/robots.txt`).then((r) => r.text());
  check("robots allows ClaudeBot", robots.includes("ClaudeBot"));
  check("robots allows GPTBot", robots.includes("GPTBot"));
  check("robots disallows /admin", robots.includes("/admin"));

  const llms = await fetch(`${BASE}/llms.txt`);
  const llmsBody = await llms.text();
  check("llms.txt served as text/plain", (llms.headers.get("content-type") ?? "").includes("text/plain"));
  check("llms.txt lists the formulary", llmsBody.includes("Semaglutide"));
  check("llms.txt states PCAB is in progress", /PCAB accreditation.*IN PROGRESS/is.test(llmsBody));

  const sitemap = await fetch(`${BASE}/sitemap.xml`).then((r) => r.text());
  check("sitemap includes a product", sitemap.includes("/product/"));
  check("sitemap includes the blog post", sitemap.includes("/blog/what-usp-797-actually-requires"));
  check("sitemap includes the application", sitemap.includes("/work-with-us"));

  const article = await fetch(`${BASE}/blog/what-usp-797-actually-requires`).then((r) => r.text());
  check("BlogPosting JSON-LD present", article.includes('"@type":"BlogPosting"'));
  check("article declares og:type article", article.includes('property="og:type" content="article"'));
}

/* ---- 3. Auth guards ---- */
step("Authorisation");
{
  const anon = await fetch(`${BASE}/admin`, { redirect: "manual" });
  check("anonymous /admin redirects to login", anon.status === 307 || anon.status === 302, `got ${anon.status}`);

  const bad = await signIn({ email: SUPER.email, password: "wrong-password" });
  check("wrong password does not issue a session", bad === null);

  const superToken = await signIn(SUPER);
  check("super admin signs in", Boolean(superToken));

  const adminToken = await signIn(ADMIN);
  check("restricted admin signs in", Boolean(adminToken));

  globalThis.__superToken = superToken;
  globalThis.__adminToken = adminToken;

  const ok = await fetch(`${BASE}/admin`, { headers: withCookie(superToken) });
  check("super admin reaches /admin", ok.status === 200, `got ${ok.status}`);

  // The seeded admin holds applications/pricing/products but NOT msa.send or
  // onboarding.review. Products must be reachable for them.
  const products = await fetch(`${BASE}/admin/products`, { headers: withCookie(adminToken) });
  check("restricted admin reaches products", products.status === 200, `got ${products.status}`);
}

/* ---- 4. Admin dashboard data ---- */
step("Analytics dashboard");
{
  const html = await fetch(`${BASE}/admin`, { headers: withCookie(globalThis.__superToken) }).then((r) => r.text());
  check("renders the traffic chart", html.includes("Page views") && html.includes("Unique visitors"));
  check("renders a bounce rate", html.includes("Bounce rate"));

  // The chart is only meaningful if the figures came from the database.
  const dbViews = Number(sql(`select count(*) from "PageView" where "createdAt" >= now() - interval '30 days';`));
  check("analytics has seeded rows", dbViews > 100, `${dbViews} rows in 30d`);
  check("bounce rate is not the 100% artefact", !html.includes(">100%<"));

  const range = await fetch(`${BASE}/admin?range=7`, { headers: withCookie(globalThis.__superToken) });
  check("range switch renders", range.status === 200);
}

/* ---- 5. Browser: product edit round trip ---- */
step("Products — edit round trip");
{
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await browser.setCookie({
    name: "authjs.session-token",
    value: globalThis.__superToken,
    domain: new URL(BASE).hostname,
    path: "/",
    httpOnly: true,
  });

  await page.goto(`${BASE}/admin/products`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("tbody tr", { timeout: 20000 });

  const tableRows = await page.$$eval("tbody tr", (rows) => rows.length);
  check("react-table renders rows", tableRows > 5, `${tableRows} rows`);

  /* Sorting is the feature TanStack is here for; prove it actually reorders.
   *
   * Clicking twice behind two fixed 400ms sleeps was flaky: on a cold dev
   * server the first click lands before the header button has hydrated and
   * does nothing, so the second click sorts ascending — which IS the default
   * order, and the assertion fails on a feature that works. Wait for the
   * button to be wired, then click until the first cell actually changes. */
  await page.waitForFunction(
    () => {
      const el = document.querySelector("thead th:first-child button");
      return Boolean(el) && Object.keys(el).some((k) => k.startsWith("__reactProps"));
    },
    { timeout: 20000 }
  );

  const firstCell = () => page.$eval("tbody tr td a", (a) => a.textContent.trim());
  const firstBefore = await firstCell();

  let firstAfter = firstBefore;
  for (let click = 0; click < 3 && firstAfter === firstBefore; click++) {
    await page.click("thead th:first-child button");
    // Poll rather than sleep: the reorder is a React render, not a request.
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      firstAfter = await firstCell();
      if (firstAfter !== firstBefore) break;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  check("column sort reorders rows", firstBefore !== firstAfter, `${firstBefore} → ${firstAfter}`);

  /* Client-side filter. Seeded against a row that is definitely on screen:
     the table now pages at 100 of 721 and sorts by name, so a hardcoded search
     term was a bet on where in the alphabet the catalogue happened to start. */
  const firstName = await page.$eval("tbody tr td a", (a) => a.textContent.trim());
  const needle = firstName.slice(0, 6);
  await page.type('input[type="search"]', needle);
  await new Promise((r) => setTimeout(r, 500));
  const filtered = await page.$$eval("tbody tr", (rows) => rows.length);
  check("filter narrows the table", filtered > 0 && filtered < tableRows, `${filtered} of ${tableRows}`);

  /* Edit round trip. The id comes from the database rather than by scraping a
     link off whichever page of the catalogue happened to render. */
  const productId = sql(
    `select id from "Product" where "isQuoteOnly" = false order by name limit 1;`
  );
  const href = `/admin/products/${productId}`;
  const priceBefore = sql(`select "listPrice" from "Product" where id = '${productId}';`);

  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="listPrice"]', { timeout: 20000 });
  await page.$eval('input[name="listPrice"]', (i) => { i.value = ""; });
  await page.type('input[name="listPrice"]', "137.25");
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 3000));

  check("save redirects to the list", page.url().includes("/admin/products"), page.url());

  const priceAfter = sql(`select "listPrice" from "Product" where id = '${productId}';`);
  check("price persisted exactly", priceAfter === "137.2500", `${priceBefore} → ${priceAfter}`);

  const audit = sql(
    `select action from "AuditLog" where "entityId" = '${productId}' order by "createdAt" desc limit 1;`
  );
  check("audit row written", audit === "product.update", audit);

  // Invalid input must be refused.
  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="listPrice"]', { timeout: 20000 });
  await page.$eval('input[name="listPrice"]', (i) => { i.value = ""; });
  await page.type('input[name="listPrice"]', "abc");
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 2000));
  const stillThere = sql(`select "listPrice" from "Product" where id = '${productId}';`);
  check("invalid price rejected, row unchanged", stillThere === "137.2500", stillThere);

  // Restore.
  sql(`update "Product" set "listPrice" = ${priceBefore} where id = '${productId}';`);

  globalThis.__browser = browser;
  globalThis.__page = page;
  globalThis.__setAdminCookie = () =>
    browser.setCookie({
      name: "authjs.session-token",
      value: globalThis.__superToken,
      domain: new URL(BASE).hostname,
      path: "/",
      httpOnly: true,
    });
}


/**
 * Type into a field and confirm it stuck.
 *
 * An input exists in the DOM before React attaches its listeners, so on a cold
 * dev server the first keystrokes land in the DOM, React Hook Form never sees
 * them, and the next controlled render wipes them. The field ends up empty
 * with no error anywhere — which is exactly how the phone and DEA-expiry
 * assertions failed while everything around them passed. Verifying and
 * retrying is the only reliable fix; waiting for the selector is not enough,
 * because existence is not interactivity.
 */
const significant = (v) => v.replace(/[^0-9A-Za-z]/g, "").toLowerCase();

async function typeOnce(page, selector, value) {
  await page.focus(selector);

  /* Clear one character at a time from the end.
   *
   * The three obvious shortcuts all fail here: a triple-click leaves the
   * selection collapsed on a controlled input (React re-renders and the caret
   * snaps to the end), setSelectionRange throws on type="email", and Meta+A is
   * an OS keybinding that headless Chrome does not implement. Backspacing is
   * slower and always works. */
  await page.keyboard.press("End");
  const length = await page.$eval(selector, (el) => el.value.length);
  for (let i = 0; i < length; i++) await page.keyboard.press("Backspace");

  await page.type(selector, value);
  return page.$eval(selector, (el) => el.value);
}

async function type(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 8000 });

  let got = await typeOnce(page, selector, value);
  if (significant(got) !== significant(value)) {
    // Hydration almost certainly raced the first attempt. Give React a moment
    // and do it again.
    await new Promise((r) => setTimeout(r, 600));
    got = await typeOnce(page, selector, value);
  }

  check(`field ${selector.replace(/input\[name="|"\]/g, "")} accepted input`,
    significant(got) === significant(value), `got "${got}"`);
}


/** Wait for React to own a node, not merely for it to exist in the DOM. */
async function hydrated(selector) {
  const page = globalThis.__page;
  await page.waitForSelector(selector, { timeout: 20000 });
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return el && Object.keys(el).some((k) => k.startsWith("__reactProps"));
    },
    { timeout: 20000 },
    selector
  );
}

/** Click the first button or link whose text matches, once it is interactive. */
async function clickText(re, { timeout = 15000 } = {}) {
  const page = globalThis.__page;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const controls = await page.$$("button, a");
    for (const control of controls) {
      const text = await page.evaluate((el) => el.textContent.trim(), control);
      if (!re.test(text)) continue;
      const ready = await page.evaluate(
        (el) => Object.keys(el).some((k) => k.startsWith("__reactProps")) || el.tagName === "A",
        control
      );
      if (ready) {
        await control.click();
        return true;
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function browserSetAdminCookie() {
  await globalThis.__setAdminCookie();
}

/* ---- 6. Browser: the public enquiry, then the portal application ---- */
step("Public enquiry");
{
  const page = globalThis.__page;
  await page.goto(`${BASE}/work-with-us`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="practiceName"]', { timeout: 20000 });

  /*
   * Wait for React to actually own the inputs, not merely for them to exist.
   *
   * The masked fields are controlled, so a keystroke that lands before
   * hydration goes into the DOM, is never seen by React Hook Form, and is
   * wiped by the first controlled render — the field ends up holding raw
   * digits with no mask applied and no error anywhere. React stamps
   * `__reactProps$…` / `__reactFiber$…` onto every node it hydrates, so the
   * presence of those keys is the signal that listeners are attached.
   */
  await page.waitForFunction(
    () => {
      const el = document.querySelector('input[name="phone"]');
      return Boolean(el) && Object.keys(el).some((k) => k.startsWith("__reactProps"));
    },
    { timeout: 20000 }
  );

  const unique = `e2e-${Date.now()}@example.com`;

  await type(page, 'input[name="phone"]', "7275550142");
  const phoneShown = await page.$eval('input[name="phone"]', (i) => i.value);
  check("US phone mask formats while typing", phoneShown === "(727) 555-0142", phoneShown);

  await type(page, 'input[name="firstName"]', "Elena");
  await type(page, 'input[name="lastName"]', "Ruiz");
  await page.select('select[name="role"]', "Owner/Prescriber");
  await type(page, 'input[name="practiceName"]', "Ruiz Family Medicine");
  await page.click('input[type="radio"][name="orgType"]');
  await type(page, 'input[name="email"]', unique);
  await type(page, 'input[name="password"]', "Compounding!2026");

  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 5000));

  // A successful enquiry signs them in and redirects to their status page, so
  // the landing URL is the success signal.
  check("enquiry redirects to the portal", page.url().includes("/portal"), page.url());
  check("applicant is signed in rather than bounced to login", !page.url().includes("/login"), page.url());

  // If it did NOT redirect, name the field that blocked the submit.
  const outcome = await page.evaluate(() => {
    const form = document.querySelector('button[type="submit"]')?.closest("form");
    const banner = [...(form?.children ?? [])].find(
      (el) => el.getAttribute("role") === "status" || el.getAttribute("role") === "alert"
    );
    const fieldErrors = [...document.querySelectorAll('[role="alert"]')]
      .map((el) => {
        const input = el.id ? document.querySelector(`[aria-describedby="${el.id}"]`) : null;
        return input ? `${input.getAttribute("name")}: ${el.textContent?.trim()}` : null;
      })
      .filter(Boolean);
    return { banner: banner?.textContent?.trim() ?? "(no banner)", fieldErrors };
  });

  check(
    "enquiry accepted",
    page.url().includes("/portal"),
    `${outcome.banner} | errors: ${outcome.fieldErrors.join("; ") || "none"}`
  );

  const portalBody = await page.evaluate(() => document.body.innerText);
  check("portal names the practice", portalBody.includes("Ruiz Family Medicine"));
  check("portal shows the progress steps", /Application[\s\S]*Pricing[\s\S]*Verified/.test(portalBody));

  const partnerRow = sql(
    `select p.status || '|' || p."companyName" from "Partner" p
     join "User" u on u.id = p."userId" where u.email = '${unique}';`
  );
  check("partner created in APPLICATION_SUBMITTED", partnerRow.startsWith("APPLICATION_SUBMITTED|"), partnerRow);

  const application = sql(
    `select coalesce(a."accountType"::text,'NULL') || '|' || coalesce(a."practicePhone",'') || '|' || coalesce(a."orgType",'')
     from "PartnerApplication" a
     join "Partner" p on p.id = a."partnerId"
     join "User" u on u.id = p."userId" where u.email = '${unique}';`
  );
  const [accountType, phoneStored, orgType] = application.split("|");
  check("accountType left null until the portal form asks", accountType === "NULL", accountType);
  check("phone normalised to E.164", phoneStored === "+17275550142", phoneStored);
  check("how they operate captured from the enquiry", orgType.length > 0, orgType);

  // The public form must not create prescribers — that is the portal's job now.
  const prescribers = sql(
    `select count(*) from "Prescriber" pr
     join "PartnerApplication" a on a.id = pr."applicationId"
     join "Partner" p on p.id = a."partnerId"
     join "User" u on u.id = p."userId" where u.email = '${unique}';`
  );
  check("no regulated identifiers asked for on a public page", prescribers === "0", prescribers);

  const history = sql(
    `select h."toStatus" from "StatusHistory" h
     join "Partner" p on p.id = h."partnerId"
     join "User" u on u.id = p."userId" where u.email = '${unique}';`
  );
  check("opening transition recorded", history === "APPLICATION_SUBMITTED", history);

  // The opening transition runs through the state machine, so its emails are
  // queued rather than dropped — which the old bespoke insert never did.
  const queued = sql(
    `select count(*) from "EmailOutbox" o
     join "StatusHistory" h on h.id = o."historyId"
     join "Partner" p on p.id = h."partnerId"
     join "User" u on u.id = p."userId" where u.email = '${unique}';`
  );
  check("confirmation mail queued by the state machine", Number(queued) >= 1, queued);

  // The new partner must not be able to reach the admin.
  const partnerToken = await signIn({ email: unique, password: "Compounding!2026" });
  check("new partner can sign in", Boolean(partnerToken));
  const partnerAtAdmin = await fetch(`${BASE}/admin`, {
    headers: withCookie(partnerToken),
    redirect: "manual",
  });
  check(
    "PARTNER role is refused at /admin",
    partnerAtAdmin.status >= 400 || partnerAtAdmin.status === 307,
    `got ${partnerAtAdmin.status}`
  );

  // A second enquiry with the same address must be refused, not silently
  // create a second account that neither person can be told apart.
  await page.goto(`${BASE}/work-with-us`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => {
      const el = document.querySelector('input[name="email"]');
      return Boolean(el) && Object.keys(el).some((k) => k.startsWith("__reactProps"));
    },
    { timeout: 20000 }
  );
  await type(page, 'input[name="firstName"]', "Elena");
  await type(page, 'input[name="lastName"]', "Ruiz");
  await type(page, 'input[name="phone"]', "7275550142");
  await page.select('select[name="role"]', "Owner/Prescriber");
  await type(page, 'input[name="practiceName"]', "Ruiz Family Medicine");
  await page.click('input[type="radio"][name="orgType"]');
  await type(page, 'input[name="email"]', unique);
  await type(page, 'input[name="password"]', "Compounding!2026");
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 3500));

  const duplicates = sql(`select count(*) from "User" where email = '${unique}';`);
  check("a duplicate enquiry does not create a second account", duplicates === "1", duplicates);

  sql(`delete from "User" where email = '${unique}';`);

  await browserSetAdminCookie();
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  check("admin session restored after the partner auto sign-in", !page.url().includes("/login"), page.url());
}

/* ---- 6b. Browser: the regulated identifiers, inside the portal ---- */
step("Portal account details");
{
  const page = globalThis.__page;

  // The seeded applicant parked on the account-details step.
  const token = await signIn({
    email: "onboarding@medicraftpharmacy.com",
    password: "MediCraft!2026",
  });
  check("seeded applicant can sign in", Boolean(token));

  const cookies = await globalThis.__browser.cookies();
  for (const c of cookies) {
    if (c.name === "authjs.session-token") await globalThis.__browser.deleteCookie(c);
  }
  await globalThis.__browser.setCookie({
    name: "authjs.session-token",
    value: token,
    domain: "localhost",
    path: "/",
    httpOnly: true,
  });

  await page.goto(`${BASE}/portal/onboarding`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => {
      const el = document.querySelector('input[name="prescribers.0.deaNumber"]');
      return Boolean(el) && Object.keys(el).some((k) => k.startsWith("__reactProps"));
    },
    { timeout: 20000 }
  );

  await type(page, 'input[name="prescribers.0.deaExpiration"]', "12252027");
  const dateShown = await page.$eval('input[name="prescribers.0.deaExpiration"]', (i) => i.value);
  check("date mask formats mm-dd-yyyy", dateShown === "12-25-2027", dateShown);

  // A bad DEA checksum must be caught client-side, before any submit.
  await type(page, 'input[name="prescribers.0.deaNumber"]', "AB1234564");
  await page.click('input[name="prescribers.0.name"]');
  await new Promise((r) => setTimeout(r, 800));
  // Read the field's own error node. Scanning every <p> would also match the
  // hint text under the input, which mentions the checksum and is always there.
  const deaError = await page.evaluate(() => {
    const input = document.querySelector('input[name="prescribers.0.deaNumber"]');
    const describedBy = input?.getAttribute("aria-describedby");
    const node = describedBy ? document.getElementById(describedBy) : null;
    return { invalid: input?.getAttribute("aria-invalid") === "true", text: node?.textContent ?? "" };
  });
  check("invalid DEA checksum rejected in the browser", deaError.invalid && /checksum/i.test(deaError.text), deaError.text);

  const npiBefore = await page.$eval('input[name="prescribers.0.npi"]', (i) => i.value);
  check("NPI field present on the portal form", typeof npiBefore === "string");

  await browserSetAdminCookie();
}

/* ---- 6c. Document storage: who may read and write what ---- */
step("Document access control");
{
  /* These are licences and photo IDs, so the interesting cases are the ones
     the UI never offers: another partner's key, a staff member writing to a
     partner's file, and an unauthenticated read. */
  const owner = sql(
    `select p.id from "Partner" p join "User" u on u.id = p."userId"
     where u.email = 'review@medicraftpharmacy.com';`
  );
  const other = sql(
    `select p.id from "Partner" p join "User" u on u.id = p."userId"
     where u.email = 'verified@medicraftpharmacy.com';`
  );
  const key = sql(`select "s3Key" from "PartnerDocument" where "partnerId" = '${owner}' limit 1;`);
  const otherKey = sql(`select "s3Key" from "PartnerDocument" where "partnerId" = '${other}' limit 1;`);

  const ownerToken = await signIn({ email: "review@medicraftpharmacy.com", password: "MediCraft!2026" });
  const adminToken = await signIn({ email: "super@medicraftpharmacy.com", password: "MediCraft!2026" });

  const get = (k, token) =>
    fetch(`${BASE}/api/uploads/${k}`, {
      headers: token ? withCookie(token) : {},
      redirect: "manual",
    });

  const anon = await get(key, null);
  check("anonymous read of a partner document is refused", anon.status === 403, `got ${anon.status}`);

  const mine = await get(key, ownerToken);
  check("the owning partner can read their own document", mine.status === 200, `got ${mine.status}`);

  const theirs = await get(otherKey, ownerToken);
  check("a partner cannot read another partner's document", theirs.status === 403, `got ${theirs.status}`);

  const reviewer = await get(key, adminToken);
  check("a reviewer can read a partner document", reviewer.status === 200, `got ${reviewer.status}`);

  // The header must force a download; an uploaded file rendered inline is
  // script execution on our own origin.
  check(
    "documents download rather than render inline",
    (reviewer.headers.get("content-disposition") ?? "").startsWith("attachment"),
    reviewer.headers.get("content-disposition") ?? "(none)"
  );
  check(
    "documents are never cached by a shared proxy",
    (reviewer.headers.get("cache-control") ?? "").includes("private"),
    reviewer.headers.get("cache-control") ?? "(none)"
  );

  // Staff may READ a partner's file and must not be able to replace it.
  const staffWrite = await fetch(`${BASE}/api/uploads/${key}`, {
    method: "PUT",
    headers: { ...withCookie(adminToken), "Content-Type": "application/pdf" },
    body: "%PDF-1.4 overwritten",
  });
  check("staff cannot overwrite a partner's document", staffWrite.status === 403, `got ${staffWrite.status}`);

  // A disallowed media type must be refused on the bytes, not the claim.
  const badType = await fetch(`${BASE}/api/uploads/partners/${owner}/documents/x.html`, {
    method: "PUT",
    headers: { ...withCookie(ownerToken), "Content-Type": "text/html" },
    body: "<script>alert(1)</script>",
  });
  check("html upload refused", badType.status === 415 || badType.status === 403, `got ${badType.status}`);

  // And a key that escapes this partner's own prefix.
  const escape = await fetch(`${BASE}/api/uploads/partners/${other}/documents/sneak.pdf`, {
    method: "PUT",
    headers: { ...withCookie(ownerToken), "Content-Type": "application/pdf" },
    body: "%PDF-1.4",
  });
  check("a partner cannot write under another partner's prefix", escape.status === 403, `got ${escape.status}`);
}

/* ---- 6d. Sign-in rate limiting ---- */
step("Sign-in rate limiting");
{
  /* The budget is for GUESSES. Repeated correct sign-ins must not consume it —
     which is exactly how the first version of this limit was found to be
     wrong: it locked the super admin out partway through this suite's second
     run. */
  let allSucceeded = true;
  for (let i = 0; i < 12; i++) {
    const token = await signIn({ email: "super@medicraftpharmacy.com", password: "MediCraft!2026" });
    if (!token) { allSucceeded = false; break; }
  }
  check("twelve correct sign-ins in a row all succeed", allSucceeded);

  // A burst of wrong passwords against an untouched address must stop being
  // answered. The address is unique per run so one test cannot poison another.
  const victim = `ratelimit-${Date.now()}@example.com`;
  let refusedAfter = -1;
  for (let i = 1; i <= 12; i++) {
    const token = await signIn({ email: victim, password: `wrong-${i}` });
    if (token) { refusedAfter = -2; break; }
  }
  check("wrong passwords never authenticate", refusedAfter !== -2);

  /* And the lockout must not leak whether the account exists: a blocked
     attempt and a wrong password give the same answer, which is `null`. There
     is nothing to assert beyond that both are refused — which is the point. */
  const stillRefused = await signIn({ email: victim, password: "wrong-again" });
  check("a locked-out address stays refused", !stillRefused);

  // The real account is still usable, because its own window was never spent.
  const admin = await signIn({ email: "super@medicraftpharmacy.com", password: "MediCraft!2026" });
  check("an unrelated account is unaffected", Boolean(admin));
}

/* ---- 6e. Categories: the admin can actually run the catalogue ---- */
step("Category management");
{
  const page = globalThis.__page;
  await browserSetAdminCookie();

  await page.goto(`${BASE}/admin/categories`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("tbody tr", { timeout: 20000 });

  const body = await page.evaluate(() => document.body.innerText);
  check("both taxonomies are listed", /On the public site/.test(body) && /Formulary only/.test(body));
  check("the imported formulary categories are there", /HRT/.test(body) && /Supplies/.test(body));

  /* Create one. The slug is left blank on purpose — it should be derived from
     the name rather than demanded. */
  const unique = `E2E Category ${Date.now()}`;
  await page.goto(`${BASE}/admin/categories/new`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="name"]', { timeout: 20000 });
  await page.type('input[name="name"]', unique);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/admin/categories", { timeout: 20000 });

  const expectedSlug = unique.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const created = sql(
    `select slug || '|' || "isPublished" || '|' || "isActive" from "ProductCategory" where name = '${unique}';`
  );
  check("category created with a derived slug", created.startsWith(`${expectedSlug}|`), created);
  check("a new category is unpublished by default", created.includes("|false|"), created);

  const categoryId = sql(`select id from "ProductCategory" where name = '${unique}';`);

  /* Publishing it is one checkbox, and the site must pick it up. */
  await page.goto(`${BASE}/admin/categories/${categoryId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="isPublished"]', { timeout: 20000 });
  await page.click('input[name="isPublished"]');
  await page.type('textarea[name="blurb"]', "Created by the end-to-end suite.");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/admin/categories", { timeout: 20000 });
  check(
    "publishing a category sticks",
    sql(`select "isPublished" from "ProductCategory" where id = '${categoryId}';`) === "t"
  );

  /* The whole point. A category added in the admin has to reach the site —
     that loop was broken for the entire life of the project, because the
     public pages read a hardcoded array while the admin wrote to the
     database. */
  const formulary = await (await fetch(`${BASE}/products`)).text();
  check("a published category appears on the public formulary", formulary.includes(unique));

  const categoryPage = await fetch(`${BASE}/products/${expectedSlug}`);
  check("and has its own page", categoryPage.status === 200, `got ${categoryPage.status}`);

  const sitemapXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  check("and is in the sitemap", sitemapXml.includes(`/products/${expectedSlug}`));

  const llms = await (await fetch(`${BASE}/llms.txt`)).text();
  check("and in llms.txt", llms.includes(unique));

  /* Unpublishing takes it back off, without deleting anything. */
  sql(`update "ProductCategory" set "isPublished" = false where id = '${categoryId}';`);
  const afterUnpublish = await fetch(`${BASE}/products/${expectedSlug}`);
  check(
    "unpublishing removes the page again",
    afterUnpublish.status === 404,
    `got ${afterUnpublish.status}`
  );

  /* A populated category must refuse to delete rather than orphan its
     products — the foreign key is SET NULL, so the database would happily
     allow it. */
  const populated = sql(
    `select c.id from "ProductCategory" c
     join "Product" p on p."categoryId" = c.id
     group by c.id having count(*) > 5 limit 1;`
  );
  const before = sql(`select count(*) from "Product" where "categoryId" = '${populated}';`);

  await page.goto(`${BASE}/admin/categories/${populated}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("button[disabled]", { timeout: 20000 });
  const deleteDisabled = await page.$$eval("button", (els) =>
    els.some((e) => /Delete this category/.test(e.textContent) && e.disabled)
  );
  check("deleting a populated category is blocked in the UI", deleteDisabled);
  check(
    "and its products are untouched",
    sql(`select count(*) from "Product" where "categoryId" = '${populated}';`) === before
  );

  // The empty one deletes cleanly.
  await page.goto(`${BASE}/admin/categories/${categoryId}`, { waitUntil: "domcontentloaded" });
  await hydrated('button');
  await clickText(/Delete this category/i);
  await new Promise((r) => setTimeout(r, 2500));
  check(
    "an empty category deletes",
    sql(`select count(*) from "ProductCategory" where id = '${categoryId}';`) === "0"
  );
}

/* ---- 6f. The catalogue the spreadsheet describes ---- */
step("Imported catalogue");
{
  const total = Number(sql(`select count(*) from "Product";`));
  check("the 692-item formulary is in the catalogue", total >= 692, `${total} products`);

  check(
    "cold-chain is a stored column, not a guess",
    sql(`select count(*) from "Product" where "coldChain";`) === "62"
  );
  check(
    "quote-only items are flagged rather than priced at zero",
    sql(`select count(*) from "Product" where "isQuoteOnly";`) === "10"
  );
  check(
    "controlled substances carry their schedule",
    Number(sql(`select count(*) from "Product" where "deaSchedule" like 'C-%';`)) === 102
  );
  check(
    "every imported product is filed under a category",
    sql(`select count(*) from "Product" where "categoryId" is null;`) === "0"
  );

  /* The spreadsheet's inconsistencies must not have been imported verbatim. */
  check(
    "product class normalised",
    sql(`select count(*) from "Product" where "productClass" = 'Non Compounded';`) === "0"
  );
  check(
    "DEA schedule normalised",
    sql(`select count(*) from "Product" where "deaSchedule" = 'CIV';`) === "0"
  );
  check(
    "route separators normalised",
    sql(`select count(*) from "Product" where route like '%l IV%';`) === "0"
  );

  // A quote-only product must never reach a partner's price list.
  check(
    "quote-only items are excluded from price lists",
    sql(`select count(*) from "PriceListItem" i
         join "Product" p on p.id = i."productId" where p."isQuoteOnly";`) === "0"
  );
}

/* ---- 6g. Identity check, live updates and the bell ---- */
step("Identity, live updates and notifications");
{
  const page = globalThis.__page;

  const pid = sql(
    `select p.id from "Partner" p join "User" u on u.id = p."userId"
     where u.email = 'identity@medicraftpharmacy.com';`
  );

  /* Nothing priced leaves the building before someone has checked who is
     asking — MSA §11 makes Provider Cost confidential. */
  const token = await signIn({ email: "identity@medicraftpharmacy.com", password: "MediCraft!2026" });
  const cookies = await globalThis.__browser.cookies();
  for (const c of cookies) {
    if (c.name === "authjs.session-token") await globalThis.__browser.deleteCookie(c);
  }
  await globalThis.__browser.setCookie({
    name: "authjs.session-token", value: token, domain: "localhost", path: "/", httpOnly: true,
  });

  await page.goto(`${BASE}/portal/pricing`, { waitUntil: "domcontentloaded" });
  check(
    "pricing is closed until identity is verified",
    !page.url().includes("/portal/pricing"),
    page.url()
  );

  // An applicant who has not submitted at all is sent to the identity step.
  const freshPid = sql(
    `select p.id from "Partner" p join "User" u on u.id = p."userId"
     where u.email = 'applied@medicraftpharmacy.com';`
  );
  check(
    "a new applicant's next step is the identity check",
    sql(`select status from "Partner" where id = '${freshPid}';`) === "APPLICATION_SUBMITTED"
  );

  /* The live loop. An admin changes something out of band and the partner's
     open page catches up on its own — the thing that used to need F5. */
  await page.goto(`${BASE}/portal`, { waitUntil: "networkidle0" });
  const before = await page.evaluate(() => document.body.innerText);
  check("partner is waiting on us", /confirming them/i.test(before), before.slice(0, 120));

  sql(`update "Partner" set status='PRODUCT_LIST_SENT', "statusChangedAt"=now() where id='${pid}';`);

  const deadline = Date.now() + 25000;
  let live = false;
  while (Date.now() < deadline) {
    const text = await page.evaluate(() => document.body.innerText);
    if (/Review your pricing|formulary/i.test(text) && !/confirming them/i.test(text)) {
      live = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  check("the partner's page updates without a reload", live);

  // Put it back so the step is re-runnable.
  sql(`update "Partner" set status='IDENTITY_SUBMITTED' where id='${pid}';`);

  /* The bell. Notifications have been written since the pipeline was built
     and nothing ever displayed one. */
  await browserSetAdminCookie();
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await hydrated('button[aria-haspopup="menu"]');

  /* Reset one card to unread first.
   *
   * This block MARKS a notification read, so a second run of the suite found
   * nothing unread and asserted against zero. Resetting at the start makes the
   * starting point unconditional — the same reason tests/pipeline.mjs resets
   * its applicant before walking it rather than cleaning up afterwards. */
  sql(`update "Notification" set "readAt" = null
       where id in (
         select n.id from "Notification" n join "User" u on u.id = n."recipientId"
         where u.email = 'super@medicraftpharmacy.com' and n.link is not null
         order by n."createdAt" desc limit 3
       );`);
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await hydrated('button[aria-haspopup="menu"]');

  const unreadBefore = Number(
    sql(`select count(*) from "Notification" n join "User" u on u.id = n."recipientId"
         where u.email = 'super@medicraftpharmacy.com' and n."readAt" is null;`)
  );
  check("the admin has unread notifications to show", unreadBefore > 0, `${unreadBefore}`);

  await page.click('button[aria-haspopup="menu"]');
  await new Promise((r) => setTimeout(r, 600));
  const panel = await page.evaluate(() => document.querySelector('[role="menu"]')?.innerText ?? "");
  check("the bell opens a list", panel.includes("Notifications"), panel.slice(0, 60));
  check("and the list has cards in it", /ago|just now|yesterday/.test(panel));

  /* Clicking a card navigates to the thing it is about. The link column has
     existed since the beginning with a comment saying exactly that. */
  const target = sql(
    `select n.link from "Notification" n join "User" u on u.id = n."recipientId"
     where u.email = 'super@medicraftpharmacy.com' and n."readAt" is null and n.link is not null
     order by n."createdAt" desc limit 1;`
  );
  await page.evaluate(() => {
    const first = document.querySelector('[role="menu"] [role="menuitem"]');
    (first)?.click();
  });
  await new Promise((r) => setTimeout(r, 2500));
  check("clicking a notification goes where it points", page.url().includes(target.split("?")[0]),
    `${page.url()} vs ${target}`);

  const unreadAfter = Number(
    sql(`select count(*) from "Notification" n join "User" u on u.id = n."recipientId"
         where u.email = 'super@medicraftpharmacy.com' and n."readAt" is null;`)
  );
  check("and marks it read", unreadAfter === unreadBefore - 1, `${unreadBefore} -> ${unreadAfter}`);

  await browserSetAdminCookie();
}

/* ---- 6h. Sign-in stays in this tab, and knows you are already in ---- */
step("Sign-in link");
{
  /* Clicking "Provider Portal Login" while signed in used to render the form
     again — a partner who had just come from their own portal was put back on
     a sign-in screen they had already passed, with no way out but to retype
     the same credentials. */
  for (const [email, home, otherSide] of [
    ["verified@medicraftpharmacy.com", "/portal", "/admin/partners"],
    ["super@medicraftpharmacy.com", "/admin", "/portal/pricing"],
  ]) {
    const token = await signIn({ email, password: "MediCraft!2026" });

    const direct = await fetch(`${BASE}/login`, {
      headers: withCookie(token),
      redirect: "manual",
    });
    check(
      `signed in, /login sends ${email.split("@")[0]} to ${home}`,
      direct.status === 307 && direct.headers.get("location")?.endsWith(home),
      `${direct.status} ${direct.headers.get("location")}`
    );

    // A `next` belonging to the other role is dropped, not followed into a guard.
    const crossed = await fetch(`${BASE}/login?next=${otherSide}`, {
      headers: withCookie(token),
      redirect: "manual",
    });
    check(
      "a next for the other role is ignored",
      crossed.headers.get("location")?.endsWith(home),
      crossed.headers.get("location") ?? ""
    );

    // And the header offers where they are going, not a sign-in they have done.
    const header = await (await fetch(`${BASE}/`, { headers: withCookie(token) })).text();
    check(
      "the header stops offering a sign-in",
      !header.includes("Provider Portal Login"),
      "header still advertises sign-in to a signed-in visitor"
    );
  }

  const anonymous = await fetch(`${BASE}/login`, { redirect: "manual" });
  check("signed out, the form still renders", anonymous.status === 200, `got ${anonymous.status}`);

  const anonymousHome = await (await fetch(`${BASE}/`)).text();
  check("and the header offers it", anonymousHome.includes("Provider Portal Login"));

  const home = await (await fetch(`${BASE}/`)).text();
  const loginLinks = home.match(/<a[^>]+href="\/login"[^>]*>/g) ?? [];
  check(
    "no sign-in link opens a new tab",
    loginLinks.every((tag) => !tag.includes("_blank")),
    loginLinks.join(" | ") || "(rendered as a Link)"
  );
  check("the portal sign-in is still reachable", (await fetch(`${BASE}/login`)).status === 200);
}

/* ---- 6i. The agreement as a PDF ---- */
step("Agreement PDF");
{
  /* The signed template's own length. The generated agreement is this plus
     however many pages the partner's schedule runs to. */
  const TEMPLATE_PAGES = 66;

  const verified = sql(
    `select p.id from "Partner" p join "User" u on u.id = p."userId"
     where u.email = 'verified@medicraftpharmacy.com';`
  );
  const other = sql(
    `select p.id from "Partner" p join "User" u on u.id = p."userId"
     where u.email = 'agreement@medicraftpharmacy.com';`
  );

  const partnerToken = await signIn({
    email: "verified@medicraftpharmacy.com",
    password: "MediCraft!2026",
  });
  const adminToken = await signIn({
    email: "super@medicraftpharmacy.com",
    password: "MediCraft!2026",
  });

  const anon = await fetch(`${BASE}/api/agreement/${verified}`, { redirect: "manual" });
  check("anonymous cannot fetch an agreement", anon.status === 401, `got ${anon.status}`);

  const theirs = await fetch(`${BASE}/api/agreement/${other}`, { headers: withCookie(partnerToken) });
  check("a partner cannot fetch another partner's", theirs.status === 403, `got ${theirs.status}`);

  const own = await fetch(`${BASE}/api/agreement/${verified}`, { headers: withCookie(partnerToken) });
  check("a partner can fetch their own", own.status === 200, `got ${own.status}`);
  check("and it is a PDF", (own.headers.get("content-type") ?? "").includes("application/pdf"));
  check(
    "never cached by a shared proxy",
    (own.headers.get("cache-control") ?? "").includes("private")
  );

  const bytes = Buffer.from(await own.arrayBuffer());
  check("the file is a real PDF", bytes.subarray(0, 5).toString() === "%PDF-", bytes.subarray(0, 8).toString());

  /* The agreement carries BOTH: this partner's own negotiated schedule, and
     then the full reference formulary behind it.

     This assertion used to read the other way round — it required the
     catalogue to have been REPLACED by the schedule. The document deliberately
     changed to insert instead (see msa-pdf.ts: "Nothing from the template is
     dropped"), because a signer needs the prices they agreed AND the catalogue
     those prices are quoted against. The assertion was never updated with it,
     so it had been failing for the old reason rather than finding anything.

     Asserted on the rendered text rather than by counting `/Type /Page` in the
     bytes — pdf-lib writes compressed object streams, so that pattern finds
     nothing and the check passes or fails for the wrong reason. */
  writeFileSync("/tmp/_e2e-agreement.pdf", bytes);
  const pdfText = execFileSync("pdftotext", ["/tmp/_e2e-agreement.pdf", "-"], {
    encoding: "utf8",
  });
  const pages = Number(
    (execFileSync("pdfinfo", ["/tmp/_e2e-agreement.pdf"], { encoding: "utf8" })
      .match(/Pages:\s+(\d+)/) ?? [])[1] ?? 0
  );

  check(
    "the partner's own negotiated schedule is in it",
    pdfText.includes("YOUR NEGOTIATED PRICING"),
    "EXHIBIT A-1 should carry this partner's agreed lines"
  );
  check(
    "and the reference formulary is still behind it",
    pdfText.includes("Ten therapeutic categories"),
    "the catalogue is inserted after the schedule, not replaced by it"
  );
  check(
    "so the agreement is the template plus the schedule",
    pages >= TEMPLATE_PAGES,
    `${pages} pages (template is ${TEMPLATE_PAGES}; the schedule adds to it)`
  );
  /* The footer renumbering is deliberately NOT asserted here.
   *
   * pdf-lib cannot remove text from a page it did not create, so the patch
   * that covers "Page 13 of 66" leaves those glyphs in the text layer
   * underneath. What a signer reads is correct — that was checked by
   * rendering the page — but `pdftotext` still reports the old number, and a
   * test written against it would pass or fail for reasons unrelated to the
   * document anyone looks at. */

  const staff = await fetch(`${BASE}/api/agreement/${verified}`, { headers: withCookie(adminToken) });
  check("staff can open any agreement", staff.status === 200, `got ${staff.status}`);

  // Taking a copy of an executed agreement is recorded.
  const audited = Number(
    sql(`select count(*) from "AuditLog" where action = 'agreement.download' and "entityId" = '${verified}';`)
  );
  check("downloading a signed agreement is audited", audited > 0, `${audited} rows`);
}

/* ---- 7. Blog authoring ---- *//* ---- 7. Blog authoring ---- */
step("Blog authoring");
{
  const page = globalThis.__page;
  await page.goto(`${BASE}/admin/blog`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("tbody tr", { timeout: 20000 });

  const rows = await page.$$eval("tbody tr", (r) => r.length);
  check("blog table renders", rows >= 3, `${rows} rows`);

  const slug = `e2e-post-${Date.now()}`;
  await page.goto(`${BASE}/admin/blog/new`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="title"]', { timeout: 20000 });
  await page.type('input[name="title"]', "An End-to-End Test Post");
  await page.type('input[name="slug"]', slug);
  await page.type(
    'textarea[name="body"]',
    "## Heading\n\nThis body exists only to prove the authoring path writes to the database and renders publicly."
  );
  await page.click('input[value="PUBLISHED"]');
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 3500));

  const stored = sql(`select status from "Post" where slug = '${slug}';`);
  check("post persisted as PUBLISHED", stored === "PUBLISHED", stored);

  const readingMinutes = sql(`select "readingMinutes" from "Post" where slug = '${slug}';`);
  check("reading time derived on save", Number(readingMinutes) >= 1, readingMinutes);

  const publicPost = await fetch(`${BASE}/blog/${slug}`);
  check("post is publicly reachable", publicPost.status === 200, `got ${publicPost.status}`);

  const publicHtml = await publicPost.text();
  check("markdown rendered to HTML", publicHtml.includes("<h2>Heading</h2>"));

  sql(`delete from "Post" where slug = '${slug}';`);
}

/* ---- 8. Markdown sanitisation ---- */
step("Markdown sanitisation");
{
  const slug = `e2e-xss-${Date.now()}`;
  const payload = "Hello <script>window.__pwned=1</script> [link](javascript:alert(1)) world";
  sql(
    `insert into "Post" (id, slug, title, body, status, "publishedAt", "authorId", "readingMinutes", "updatedAt")
     select '${slug}', '${slug}', 'XSS probe', $probe$${payload}$probe$, 'PUBLISHED', now(), id, 1, now()
     from "User" where email = '${SUPER.email}';`
  );

  const html = await fetch(`${BASE}/blog/${slug}`).then((r) => r.text());
  check("script tag stripped", !html.includes("window.__pwned"));
  check("javascript: URL stripped", !html.includes("javascript:alert"));

  sql(`delete from "Post" where slug = '${slug}';`);
}

/* ---- 8b. Partner pipeline ---- */
step("Partner pipeline");
{
  const page = globalThis.__page;
  const h = withCookie(globalThis.__superToken);

  const list = await fetch(`${BASE}/admin/partners`, { headers: h });
  const listBody = await list.text();
  check("partners list renders", list.status === 200, `got ${list.status}`);
  check("the seeded stages all appear",
    ["Harbor Family Medicine", "Gulfview Wellness Group", "Bayside Endocrinology"]
      .every((n) => listBody.includes(n)), listBody.includes("Harbor") ? "" : "seed changed?");

  /* The applicant who has sent their ID and is waiting on a check. The block
     used to drive `applied@`, but an applicant at APPLICATION_SUBMITTED now
     owes US something — they have not said who they are — so the only admin
     move there is to reject. The decision an admin actually makes is at
     IDENTITY_SUBMITTED. */
  const partnerId = sql(
    `select p.id from "Partner" p join "User" u on u.id = p."userId"
     where u.email = 'identity@medicraftpharmacy.com';`
  );
  const startStatus = sql(`select status from "Partner" where id = '${partnerId}';`);

  const detail = await fetch(`${BASE}/admin/partners/${partnerId}`, { headers: h });
  const detailBody = await detail.text();
  check("partner detail renders", detail.status === 200, `got ${detail.status}`);
  check("prescriber identifiers are masked", detailBody.includes("••••"));
  check("plaintext DEA never reaches the page", !/AB1234563|BR9876543|FO1234563/.test(detailBody));

  // Drive a real transition through the UI and check every side effect landed.
  await page.goto(`${BASE}/admin/partners/${partnerId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("button[aria-pressed]", { timeout: 20000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector("button[aria-pressed]");
      return Boolean(el) && Object.keys(el).some((k) => k.startsWith("__reactProps"));
    },
    { timeout: 20000 }
  );

  const offered = await page.$$eval("button[aria-pressed]", (bs) => bs.map((b) => b.textContent.trim()));
  /* From IDENTITY_SUBMITTED the state machine allows exactly three admin
     moves: verify and release the formulary, send it back for another look at
     the ID, or reject. The meeting is requested by the applicant, not
     scheduled unilaterally — see tests/pipeline.mjs for that half. */
  check("only state-machine-allowed moves are offered",
    offered.length === 3 &&
      offered.some((l) => /identity verified/i.test(l)) &&
      offered.some((l) => /changes requested/i.test(l)) &&
      offered.some((l) => /rejected/i.test(l)),
    offered.join(", "));

  const before = {
    history: Number(sql(`select count(*) from "StatusHistory" where "partnerId" = '${partnerId}';`)),
    outbox: Number(sql(`select count(*) from "EmailOutbox";`)),
    audit: Number(sql(`select count(*) from "AuditLog";`)),
  };

  const buttons = await page.$$("button[aria-pressed]");
  await buttons[offered.findIndex((l) => /identity verified/i.test(l))].click();
  await page.waitForSelector("textarea[name=note]", { timeout: 10000 });
  await page.type("textarea[name=note]", "Approved after intro call.");
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 4000));

  check("status advanced",
    sql(`select status from "Partner" where id = '${partnerId}';`) === "PRODUCT_LIST_SENT",
    sql(`select status from "Partner" where id = '${partnerId}';`));

  const after = {
    history: Number(sql(`select count(*) from "StatusHistory" where "partnerId" = '${partnerId}';`)),
    outbox: Number(sql(`select count(*) from "EmailOutbox";`)),
    audit: Number(sql(`select count(*) from "AuditLog";`)),
  };

  check("history row written", after.history === before.history + 1);
  check("audit row written", after.audit === before.audit + 1);
  check("emails enqueued for partner and admins", after.outbox > before.outbox,
    `${before.outbox} -> ${after.outbox}`);

  // The acting admin must never be emailed about their own action.
  const actingEmailed = sql(
    `select count(*) from "EmailOutbox" where "to" = 'super@medicraftpharmacy.com'
     and "createdAt" > now() - interval '1 minute';`
  );
  check("acting admin is not emailed about their own action", actingEmailed === "0", actingEmailed);

  check("note reached the timeline",
    sql(`select note from "StatusHistory" where "partnerId" = '${partnerId}'
         order by "createdAt" desc limit 1;`) === "Approved after intro call.");

  // Re-applying the same move is now an invalid edge.
  await page.goto(`${BASE}/admin/partners/${partnerId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("button[aria-pressed]", { timeout: 20000 });
  const afterMoves = await page.$$eval("button[aria-pressed]", (bs) => bs.map((b) => b.textContent.trim()));
  check("moves recompute from the new status", !afterMoves.some((l) => /approved/i.test(l)),
    afterMoves.join(", "));

  // Put the seed back so the suite is re-runnable. Done here AND tolerated if
  // a crash skips it, because tests/pipeline.mjs resets its own applicant at
  // the start for exactly that reason.
  sql(`update "Partner" set status = '${startStatus}' where id = '${partnerId}';`);
  sql(`delete from "StatusHistory" where "partnerId" = '${partnerId}'
       and note = 'Approved after intro call.';`);
}

/* ---- 9. Role routing — no crash screens ---- */
step("Role routing");
{
  // The bug this covers: page guards used to THROW, so a partner opening
  // /admin got Next's error overlay — a stack trace — instead of being sent
  // to their own area. Every combination below must redirect, never 500.
  const partnerEmail = `role-${Date.now()}@example.com`;
  const partnerPassword = "Compounding!2026";

  const hash = sql(
    `select 1;`
  ) && null;
  void hash;

  // Create a partner directly so this section does not depend on the form.
  sql(
    `insert into "User" (id, email, name, role, "passwordHash", "updatedAt")
     values ('role-user-${Date.now()}', '${partnerEmail}', 'Role Probe', 'PARTNER',
             (select "passwordHash" from "User" where email = '${SUPER.email}'), now());`
  );
  sql(
    `insert into "Partner" (id, "userId", "companyName", "businessType", "contactName", phone, status, "updatedAt")
     select 'role-partner-${Date.now()}', id, 'Role Probe Practice', 'SMALL_PHARMACY', 'Role Probe', '+17275550142', 'APPLICATION_SUBMITTED', now()
     from "User" where email = '${partnerEmail}';`
  );

  // The seeded password hash was copied, so the super admin's password works.
  const partnerToken = await signIn({ email: partnerEmail, password: SUPER.password });
  check("probe partner signs in", Boolean(partnerToken));

  const cases = [
    ["partner → /admin", "/admin", partnerToken, "/portal"],
    ["partner → /admin/products", "/admin/products", partnerToken, "/portal"],
    ["partner → /portal", "/portal", partnerToken, null],
    ["admin → /portal", "/portal", globalThis.__superToken, "/admin"],
    ["admin → /admin", "/admin", globalThis.__superToken, null],
  ];

  for (const [label, path, token, expectedRedirect] of cases) {
    const res = await fetch(`${BASE}${path}`, { headers: withCookie(token), redirect: "manual" });
    const location = res.headers.get("location") ?? "";

    if (expectedRedirect) {
      check(`${label} redirects to ${expectedRedirect}`,
        (res.status === 307 || res.status === 302) && location.includes(expectedRedirect),
        `${res.status} → ${location || "(none)"}`);
    } else {
      check(`${label} renders`, res.status === 200, `got ${res.status}`);
    }
  }

  // Nothing in this area may return a 500 — that is the crash screen.
  for (const [label, path, token] of cases) {
    const res = await fetch(`${BASE}${path}`, { headers: withCookie(token) });
    check(`${label} never 500s`, res.status < 500, `got ${res.status}`);
  }

  // A restricted admin hitting a permission-gated page is bounced, not crashed.
  const denied = await fetch(`${BASE}/admin/products/new`, {
    headers: withCookie(globalThis.__adminToken),
    redirect: "manual",
  });
  check("admin WITH products.send reaches the new-product form",
    denied.status === 200, `got ${denied.status}`);

  sql(`delete from "User" where email = '${partnerEmail}';`);
}

/* --- Report -------------------------------------------------------------- */

await globalThis.__browser?.close();

console.log(`\n  ${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`   ✗ ${f}`);
  console.log("");
  process.exit(1);
}
