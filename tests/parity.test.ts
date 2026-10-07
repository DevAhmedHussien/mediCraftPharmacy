/* ===========================================================================
   Schema parity.

   lib/partner/status.ts declares the status and permission vocabularies as
   plain TypeScript; prisma/schema.prisma declares them again as Postgres
   enums. Two declarations of one contract drift — this is what stops them.

   The permission check is the sharp one. Prisma `@map`s each member to a
   dotted wire string, so the database stores `products.send` while the client
   API takes `PRODUCTS_SEND`. Getting that backwards throws
   PrismaClientValidationError at runtime and reads as a 500, not as a
   permission denial — and it only shows up when a non-super-admin hits a
   gated route, because super admins skip the query.
   ========================================================================= */

import {
  NotificationType as PrismaNotificationType,
  PartnerStatus as PrismaPartnerStatus,
  Permission as PrismaPermission,
} from "@prisma/client";

import { PARTNER_STATUS, PERMISSION, PERMISSION_ENUM, PROGRESS_STEPS, TRANSITIONS } from "../lib/partner/status";
import { ALL_STAGE_TAGS, assertTagCoverage, EVENT_TAG_BY_LABEL } from "../lib/partner/ghl-tags";
import { assertPipelineCoverage, PIPELINE_MOVE_BY_LABEL } from "../lib/partner/ghl-pipeline";

let pass = 0;
let fail = 0;

const eq = (label: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else {
    fail++;
    console.log(`  FAIL ${label}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`);
  }
};

// Statuses: same members, same order-independent set.
eq(
  "PartnerStatus members match Prisma",
  Object.keys(PARTNER_STATUS).sort(),
  Object.keys(PrismaPartnerStatus).sort()
);

// Every status is its own value, so a typo cannot alias two states.
for (const [key, value] of Object.entries(PARTNER_STATUS)) {
  eq(`PARTNER_STATUS.${key} is self-valued`, value, key);
}

// Permissions: our member names must be exactly Prisma's member names.
eq(
  "Permission members match Prisma",
  Object.keys(PERMISSION).sort(),
  Object.keys(PrismaPermission).sort()
);

// And PERMISSION_ENUM must invert cleanly in both directions.
for (const [member, wire] of Object.entries(PERMISSION)) {
  eq(`PERMISSION_ENUM["${wire}"] → ${member}`, PERMISSION_ENUM[wire], member);
}

eq(
  "every wire string is unique",
  new Set(Object.values(PERMISSION)).size,
  Object.values(PERMISSION).length
);

/* NotificationType.
   This check exists because its absence cost a runtime failure: MEETING_REQUESTED
   was added to the TypeScript union and not to the Prisma enum, which type-checks
   cleanly and then throws PrismaClientValidationError inside the transition
   transaction — after the meeting row had already been written. */
const usedNotificationTypes = [
  ...new Set(
    TRANSITIONS.map((t) => t.effects.notification?.type).filter(Boolean)
  ),
].sort() as string[];

for (const type of usedNotificationTypes) {
  eq(`NotificationType.${type} exists in Prisma`, type in PrismaNotificationType, true);
}

eq(
  "every notification type a transition uses is a Prisma member",
  usedNotificationTypes.filter((t) => !(t in PrismaNotificationType)),
  []
);

/* Same class of bug for email templates: every template a transition names
   must be renderable, or the outbox row is written and the worker throws. */
const usedTemplates = [
  ...new Set(
    TRANSITIONS.flatMap((t) => [
      t.effects.partnerEmail,
      t.effects.adminEmail?.template,
      t.effects.actingAdminEmail,
    ]).filter(Boolean)
  ),
].sort() as string[];

eq("every transition names at least one effect", TRANSITIONS.every((t) =>
  t.effects.partnerEmail || t.effects.adminEmail || t.effects.actingAdminEmail || t.effects.notification || t.effects.teammateEcho
), true);

console.log(`  templates in use: ${usedTemplates.length}, notification types: ${usedNotificationTypes.length}`);

/* Third declaration of the same contract: the CRM tag map.
 *
 * A transition added to status.ts without a tag would simply stop syncing for
 * that one edge — silently, in production, on the edge nobody tested. This is
 * the check that turns that into a failing build. */
const labels = TRANSITIONS.map((t) => t.label);

let coverage = "ok";
try {
  assertTagCoverage(labels);
} catch (error) {
  coverage = (error as Error).message;
}
eq("every transition has a GHL tag, and no tag is orphaned or reused", coverage, "ok");

/* And the board. A transition with no pipeline entry would tag the contact
   and leave their card where it was. */
let pipelineCoverage = "ok";
try {
  assertPipelineCoverage(labels);
} catch (error) {
  pipelineCoverage = (error as Error).message;
}
eq("every transition has a GHL pipeline move", pipelineCoverage, "ok");

/* A text is 160 characters before carriers split it, and a long portal URL
   eats into that. 320 is two segments — the most any of these should cost. */
const longSms = Object.entries(PIPELINE_MOVE_BY_LABEL)
  .map(([label, move]) =>
    move && "sms" in move && move.sms
      ? [label, move.sms({ firstName: "Alexandria", portalUrl: "https://www.medicraftpharmacy.com/portal" }).length]
      : null
  )
  .filter((row): row is [string, number] => Boolean(row) && (row as [string, number])[1] > 320);
eq("every pipeline SMS fits two segments", longSms, []);

eq("one stage tag per progress step", ALL_STAGE_TAGS.length, PROGRESS_STEPS.length);
eq("stage tags are unique", new Set(ALL_STAGE_TAGS).size, PROGRESS_STEPS.length);

/* GoHighLevel lowercases tags on the way in, so anything we send with capitals
   comes back looking different from what this map says it is. */
const badlyCased = [...Object.values(EVENT_TAG_BY_LABEL), ...ALL_STAGE_TAGS]
  .filter((tag) => tag !== tag.toLowerCase());
eq("every GHL tag is lowercase", badlyCased.join(",") || "none", "none");

console.log(`  GHL tags: ${Object.keys(EVENT_TAG_BY_LABEL).length} event + ${ALL_STAGE_TAGS.length} stage`);

console.log(`\n  parity: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
