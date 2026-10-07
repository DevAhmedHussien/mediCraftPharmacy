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

/* Every site that writes to an outbox must also kick it. The email kick
   shipped first and drained only `processOutbox`, so the CRM rows written by
   the SAME transaction still waited for the cron — the partner got their
   confirmation in seconds while GoHighLevel heard minutes later. */
for (const [label, file] of [
  ["applyTransition", "lib/services/transition.ts"],
  ["notifyStaffOfInquiry", "lib/services/inquiry-notify.ts"],
  ["recordAmendmentCrmEvent", "lib/services/amendments.ts"],
] as const) {
  const src = readFileSync(file, "utf8");

  check(
    `${label} kicks the outboxes`,
    /kickOutboxes\(\)/.test(src),
    `${file} enqueues work but nothing drains it until the cron`
  );
}

/* The kick itself: both queues, neither awaited, nothing able to throw. */
{
  const kick = readFileSync("lib/services/outbox-kick.ts", "utf8");

  check(
    "the kick drains EMAIL",
    /processOutbox\(\)/.test(kick),
    "registration confirmations would wait for the cron"
  );

  check(
    "the kick drains the CRM mirror",
    /processCrmOutbox\(\)/.test(kick),
    "GoHighLevel would learn about every pipeline move up to five minutes late"
  );

  check(
    "one queue failing cannot stop the other",
    /allSettled/.test(kick),
    "Promise.all would let a GoHighLevel outage swallow the partner's email"
  );

  check(
    "it is not awaited",
    /void \(async/.test(kick) && !/^\s*await kickOutboxes/m.test(kick),
    "awaiting puts two third-party round trips on a path someone is waiting on"
  );

  check(
    "it cannot throw into its caller",
    /\.catch\(/.test(kick),
    "an unhandled rejection turns a committed transition into a 500"
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
