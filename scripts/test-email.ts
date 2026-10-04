/* ===========================================================================
   Send one real email, through the app's own service.

     npm run email:test -- someone@example.com [template]

   WHY IT GOES THROUGH `sendEmail` AND NOT STRAIGHT TO RESEND
   -----------------------------------------------------------
   A script that POSTs to api.resend.com proves the key works and nothing
   else. It would not exercise the template renderer, the From header the app
   actually builds, the reply-to, the driver switch, or the EmailLog write —
   which is the whole of what can be misconfigured. A green raw-API call next
   to a broken application path is the worst possible result, because it
   reads as success.

   So this calls the same function every server action calls, then reads the
   row back out of the database and prints it. If this passes, the live flows
   pass for the same reasons.

   It prints the Resend message id. It never prints the key.
   ========================================================================= */

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/services/email";
import type { EmailTemplate } from "@/lib/partner/status";

const DEFAULT_TEMPLATE: EmailTemplate = "auth/login-code";

async function main() {
  const to = process.argv[2];
  const template = (process.argv[3] as EmailTemplate | undefined) ?? DEFAULT_TEMPLATE;

  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    console.error("Usage: npx tsx scripts/test-email.ts <address> [template]");
    process.exit(1);
  }

  console.log("driver:   ", env.EMAIL_DRIVER);
  console.log("from:     ", env.EMAIL_FROM);
  console.log("reply-to: ", env.EMAIL_REPLY_TO);
  console.log("key:      ", env.RESEND_API_KEY ? "set" : "MISSING");
  console.log("template: ", template);
  console.log("to:       ", to);
  console.log("");

  if (env.EMAIL_DRIVER !== "resend") {
    console.warn(
      `EMAIL_DRIVER is "${env.EMAIL_DRIVER}", so this writes to .mail/ instead of sending.\n` +
        "Set EMAIL_DRIVER=resend in .env for a real send.\n"
    );
  }

  const before = new Date();

  try {
    await sendEmail(template, to, {
      // Enough props for any template to render without a blank in it.
      contactName: "Ahmed",
      companyName: "MediCraft test",
      code: "123456",
      changeOrderNumber: 1,
      itemCount: 1,
      requestNotes: "A test message sent by scripts/test-email.ts.",
    });
    console.log("send: OK");
  } catch (error) {
    console.error("send: FAILED —", error instanceof Error ? error.message : error);
  }

  /* Read the record back rather than trusting the return. The point of the
     script is to prove the log row exists and says the right thing. */
  const log = await db.emailLog.findFirst({
    where: { to, template, createdAt: { gte: before } },
    orderBy: { createdAt: "desc" },
  });

  console.log("\nEmailLog row:");
  console.log(
    log
      ? {
          id: log.id,
          status: log.status,
          providerMessageId: log.providerMessageId,
          error: log.error,
          createdAt: log.createdAt.toISOString(),
        }
      : "NONE — the send never reached the logging step."
  );

  /* A failed direct send should have been queued for retry. Showing it here
     is how we know that safety net is wired, not just written. */
  const queued = await db.emailOutbox.findFirst({
    where: { to, template, createdAt: { gte: before } },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, attempts: true, lastError: true, nextAttemptAt: true },
  });
  if (queued) {
    console.log("\nqueued for retry:", queued);
  }

  process.exit(log?.status === "SENT" ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
