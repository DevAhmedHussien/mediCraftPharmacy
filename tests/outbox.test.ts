/**
 * The outbox drains on write, not five minutes later.
 *
 * This is a regression test for a real complaint: "registration email takes
 * too long to send". It did — `applyTransition` wrote the row inside the
 * transaction and nothing sent it until the five-minute drain cron came
 * round, so a partner waited up to five minutes for "we have your
 * application" and the most likely reading of that silence is that the form
 * did not work.
 *
 * What is asserted here is the WIRING, not the delivery: that both paths that
 * enqueue mail also kick the drain, that neither awaits it, and that neither
 * can throw into its caller. Delivery itself belongs to processOutbox, which
 * the cron still owns as the retry guarantee.
 */
import { readFileSync } from "node:fs";

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`    ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`    ✗ ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

console.log("\n  outbox");

for (const [label, file] of [
  ["applyTransition", "lib/services/transition.ts"],
  ["notifyStaffOfInquiry", "lib/services/inquiry-notify.ts"],
] as const) {
  const src = readFileSync(file, "utf8");

  check(
    `${label} kicks the drain`,
    /processOutbox\(\)/.test(src),
    `${file} enqueues mail but never calls processOutbox`
  );

  check(
    `${label} does not await it`,
    /void import\("@\/lib\/services\/email"\)/.test(src) && !/await\s+processOutbox/.test(src),
    "awaiting puts an SMTP round trip on a path someone is waiting on"
  );

  check(
    `${label} cannot throw from the drain`,
    /\.catch\(/.test(src.slice(src.indexOf("processOutbox"))),
    "an unhandled rejection here turns a committed transition into a 500"
  );
}

/* The cron is the delivery guarantee and must not be removed in favour of the
   kick above — the kick is best-effort and dies with the process. */
const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
check(
  "the drain cron still exists as the retry guarantee",
  /medicraft-drain-outbox/.test(deploy),
  "the immediate kick is an optimisation, not a replacement for the cron"
);

console.log(`\n  outbox: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
