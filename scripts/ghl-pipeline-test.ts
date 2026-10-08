/**
 * Walk one partner through the whole pipeline and show what reaches GHL.
 *
 * Drives the SAME functions the forms and the admin console call —
 * `applyTransition` for every step — so what it exercises is the real
 * pipeline: the outbox rows written inside each transaction, the immediate
 * drain, the stage tag swap, and the two emails that are allowed to send.
 *
 * It is not a unit test and asserts nothing. It is a demonstration, for
 * watching a contact move through GoHighLevel stage by stage.
 *
 *   npx tsx scripts/ghl-pipeline-test.ts <email> [--cleanup]
 */
import { db } from "@/lib/db";
import { PARTNER_STATUS } from "@/lib/partner/status";
import { applyTransition } from "@/lib/services/transition";
import { stageTagFor } from "@/lib/partner/ghl-tags";

const EMAIL = process.argv[2] ?? "test@ghlAutomation.com";
const CLEANUP = process.argv.includes("--cleanup");

/* The happy path, end to end. Every entry is a real transition from
   lib/partner/status.ts — an invalid one would be refused by the engine,
   which is the point of going through it rather than writing statuses. */
const WALK = [
  { to: PARTNER_STATUS.IDENTITY_SUBMITTED,       actor: "PARTNER", note: "Identity documents uploaded" },
  { to: PARTNER_STATUS.PRODUCT_LIST_SENT,        actor: "ADMIN",   note: "Formulary sent for selection" },
  { to: PARTNER_STATUS.MEETING_REQUESTED,        actor: "PARTNER", note: "Asked to talk pricing through" },
  { to: PARTNER_STATUS.PRICING_MEETING,          actor: "PARTNER", note: "Picked a time from the slots offered" },
  { to: PARTNER_STATUS.NEGOTIATED_PRICING_SENT,  actor: "ADMIN",   note: "Negotiated pricing sent" },
  { to: PARTNER_STATUS.PRICING_PARTNER_ACCEPTED, actor: "PARTNER", note: "Pricing accepted" },
  { to: PARTNER_STATUS.ONBOARDING_IN_PROGRESS,   actor: "SYSTEM",  note: "Onboarding opened" },
  { to: PARTNER_STATUS.DOCUMENTS_PENDING,        actor: "PARTNER", note: "Account details filled in" },
  { to: PARTNER_STATUS.ONBOARDING_SUBMITTED,     actor: "PARTNER", note: "Documents submitted" },
  { to: PARTNER_STATUS.ONBOARDING_APPROVED,      actor: "ADMIN",   note: "Details approved" },
  { to: PARTNER_STATUS.MSA_SENT,                 actor: "ADMIN",   note: "Agreement sent" },
  { to: PARTNER_STATUS.MSA_SIGNED,               actor: "SYSTEM",  note: "Agreement signed" },
  { to: PARTNER_STATUS.VERIFIED,                 actor: "SYSTEM",  note: "Partner verified" },
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cleanup() {
  const user = await db.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (!user) return console.log(`  nothing to remove for ${EMAIL}`);
  // Partner cascades to its fifteen child tables; the User does not go with it.
  await db.partner.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  console.log(`  removed ${EMAIL} and its partner record`);
}

async function main() {
  if (CLEANUP) return cleanup();

  await cleanup(); // idempotent: a re-run starts from nothing

  console.log(`\n  Creating ${EMAIL} the way the public form does\n`);
  const partnerId = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: EMAIL, name: "GHL Automation Test", role: "PARTNER", passwordHash: "!not-a-login!" },
    });
    const partner = await tx.partner.create({
      data: {
        userId: user.id,
        companyName: "GHL Automation Test Practice",
        businessType: "SMALL_PHARMACY",
        contactName: "GHL Automation Test",
        phone: "+17273096666",
        status: PARTNER_STATUS.APPLICATION_SUBMITTED,
      },
    });
    await tx.partnerApplication.create({
      data: {
        partnerId: partner.id,
        practiceName: "GHL Automation Test Practice",
        practicePhone: "+17273096666",
        officeContactName: "GHL Automation Test",
        officeContactEmail: EMAIL,
        officeContactPhone: "+17273096666",
        contactRole: "Owner",
        orgType: "INDEPENDENT_PRACTICE",
      },
    });
    return partner.id;
  });

  console.log(`  partner ${partnerId}`);
  console.log(`  status  APPLICATION_SUBMITTED -> ${stageTagFor(PARTNER_STATUS.APPLICATION_SUBMITTED as never)}\n`);

  for (const step of WALK) {
    try {
      const t = await applyTransition({
        partnerId,
        to: step.to as never,
        actor: step.actor as never,
        note: step.note,
        /* Admin moves are permission-gated — `applications.review`,
           `pricing.manage` and so on. The console passes the signed-in
           admin's grants; a script has no session, so it stands in as a
           super admin, which is the same bypass the engine already gives
           the real one. The guard itself is exercised either way: an
           invalid TRANSITION is still refused, which is what this walk is
           checking. */
        isSuperAdmin: step.actor === "ADMIN",
      });
      console.log(`  ${String(step.actor).padEnd(7)} ${String(step.to).padEnd(28)} ${stageTagFor(step.to as never).padEnd(18)} ${t.label}`);
    } catch (error) {
      console.log(`  ${String(step.actor).padEnd(7)} ${String(step.to).padEnd(28)} REFUSED — ${(error as Error).message}`);
    }
    // The drain is fire-and-forget; give it a moment before the next step.
    await sleep(1200);
  }

  /* Drain explicitly rather than waiting on the kick.
  
     `kickOutboxes()` is fire-and-forget by design — the point is that a
     partner pressing a button never waits on GoHighLevel. In a script that
     exits as soon as the walk finishes, those floating promises are racing
     `process.exit`, so the result would be a timing accident rather than a
     measurement. Calling the same processor directly is what the cron does
     and gives a number that means something. */
  /* Drain until THIS partner's rows are done.
  
     `processCrmOutbox` takes a batch at a time, oldest first, across every
     partner — so on a database with a backlog the first pass can be entirely
     other people's rows. Looping until ours are clear is what the cron
     achieves over several runs.
  
     The pause matters: GoHighLevel answers 429 under a burst, and thirteen
     transitions in a few seconds is a burst by its standards. */
  console.log("\n  Draining…");
  const { processCrmOutbox } = await import("@/lib/services/partner-crm");
  for (let pass = 1; pass <= 8; pass++) {
    const left = await db.crmOutbox.count({ where: { partnerId, status: "PENDING" } });
    if (left === 0) break;
    const r = await processCrmOutbox();
    console.log(`    pass ${pass}: ${r.sent} sent, ${r.failed} failed — ${left} of ours still queued`);
    await sleep(2500);
  }

  const crm = await db.crmOutbox.findMany({
    where: { partnerId },
    orderBy: { createdAt: "asc" },
    select: { label: true, toStatus: true, status: true, attempts: true, lastError: true },
  });
  console.log(`\n  CRM OUTBOX — ${crm.length} rows`);
  for (const r of crm) {
    console.log(`    ${String(r.status).padEnd(8)} ${String(r.toStatus).padEnd(26)} ${r.label}${r.lastError ? `  !! ${r.lastError.slice(0, 60)}` : ""}`);
  }

  const mail = await db.emailOutbox.findMany({
    where: { props: { path: ["partnerId"], equals: partnerId } },
    select: { template: true, to: true, status: true },
  }).catch(() => []);
  const allMail = await db.emailOutbox.findMany({
    where: { to: EMAIL },
    select: { template: true, status: true },
  });
  console.log(`\n  EMAIL TO THE PARTNER — ${allMail.length} rows (only two templates may send)`);
  for (const m of allMail) console.log(`    ${String(m.status).padEnd(8)} ${m.template}`);

  const partner = await db.partner.findUnique({
    where: { id: partnerId },
    select: { status: true, ghlContactId: true },
  });
  console.log(`\n  FINAL`);
  console.log(`    status        ${partner?.status}`);
  console.log(`    stage tag     ${stageTagFor(partner?.status as never)}`);
  console.log(`    ghlContactId  ${partner?.ghlContactId ?? "(none — sync did not reach GHL)"}`);
  console.log(`\n  Remove with: npx tsx scripts/ghl-pipeline-test.ts ${EMAIL} --cleanup\n`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
