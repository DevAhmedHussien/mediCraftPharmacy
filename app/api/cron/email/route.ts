import { NextResponse } from "next/server";

import { handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { processOutbox } from "@/lib/services/email";
import { processCrmOutbox } from "@/lib/services/partner-crm";
import { isDev } from "@/lib/env";

/**
 * Drain the email outbox.
 *
 * Two callers: a scheduled job in production, and an admin clicking a button
 * in development. Both go through the same function — a dev-only shortcut
 * that bypasses the worker would mean the path exercised in testing is not
 * the path that runs in production.
 *
 * Auth: a signed-in admin, or a cron secret. In development the guard is
 * relaxed to a signed-in admin only, because there is no scheduler.
 */
export const dynamic = "force-dynamic";

async function drain() {
  /* Both queues, one scheduler.
   *
   * The CRM mirror is enqueued in the same transaction as the status change it
   * reflects, for the same reason the emails are: neither belongs on the
   * request path, and neither may be lost if the third party is down. Draining
   * them together means one cron entry rather than two that can drift apart.
   *
   * Sequential rather than parallel — a cron run that hammers two external
   * services at once is how a rate limit gets hit on both. */
  const email = await processOutbox();
  const crm = await processCrmOutbox();
  return NextResponse.json({ ok: true, email, crm });
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-cron-secret");
    const expected = process.env.CRON_SECRET;

    // A configured secret is sufficient on its own — a scheduler has no session.
    if (expected && secret === expected) return await drain();

    await requireAdmin();
    return await drain();
  } catch (error) {
    return handleError(error);
  }
}

/** GET is the same thing, for a scheduler that can only issue GETs. */
export async function GET(request: Request) {
  if (!isDev && !process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED", message: "Set CRON_SECRET to drain by GET." } },
      { status: 503 }
    );
  }
  return POST(request);
}
