/**
 * Run axe-core against local routes, through an already-running Chrome.
 *
 * Needs a Chrome listening on 9222 and the dev server on 3000:
 *
 *   npm run dev
 *   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *     --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-profile
 *   npm pack axe-core --pack-destination /tmp && tar xzf /tmp/axe-core-*.tgz -C /tmp
 *   node --experimental-websocket scripts/axe.mjs /tmp/package/axe.min.js / /login
 *
 * Signed-in routes work too — whatever session that Chrome profile already
 * holds is the session the audit runs under, so sign in once and pass
 * /portal or /admin like any other path.
 *
 * CDP rather than Playwright on purpose: this repo has no browser-automation
 * dependency and an audit script is not a good reason to add one.
 */
import { readFileSync } from "node:fs";

const [axePath, ...routes] = process.argv.slice(2);
if (!axePath || routes.length === 0) {
  console.error("usage: node --experimental-websocket scripts/axe.mjs <axe.min.js> <route…>");
  process.exit(1);
}

const AXE = readFileSync(axePath, "utf8");
const BASE = process.env.AXE_BASE ?? "http://localhost:3000";

const targets = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = targets.find((t) => t.type === "page");
if (!page) {
  console.error("no page target on 9222 — is Chrome running with --remote-debugging-port?");
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const x = JSON.parse(m.data);
  if (x.id && pending.has(x.id)) {
    pending.get(x.id)(x);
    pending.delete(x.id);
  }
};
await new Promise((r) => (ws.onopen = r));
const send = (method, params) =>
  new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send("Page.enable");
await send("Runtime.enable");

let total = 0;

for (const route of routes) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await send("Page.navigate", { url: BASE + route });
  // Next needs a beat to hydrate; axe on a half-built tree reports noise.
  await new Promise((r) => setTimeout(r, 5000));
  await send("Runtime.evaluate", { expression: AXE });

  const res = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } })
      .then(r => r.violations.map(v => ({
        id: v.id, impact: v.impact, n: v.nodes.length, help: v.help,
        target: v.nodes.slice(0, 3).map(n => n.target.join(' ')),
      })))`,
  });

  const violations = res.result?.result?.value;
  console.log(`\n=== ${route} ===`);
  if (!Array.isArray(violations)) {
    console.log("  axe did not return:", JSON.stringify(res.result).slice(0, 300));
    continue;
  }
  if (violations.length === 0) {
    console.log("  no violations");
    continue;
  }
  for (const v of violations) {
    total += v.n;
    console.log(`  [${v.impact}] ${v.id} ×${v.n} — ${v.help}`);
    for (const t of v.target) console.log(`      ${t}`);
  }
}

ws.close();
if (total > 0) {
  console.log(`\n${total} violation node(s) across ${routes.length} route(s).`);
  process.exitCode = 1;
}
