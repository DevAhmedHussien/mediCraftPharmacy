import "server-only";

import { headers } from "next/headers";

import { db } from "@/lib/db";

/* ===========================================================================
   Audit log.

   Called from every admin mutation. Two details that matter:

   · `actorEmail` is denormalised alongside `actorId`. The id is a foreign key
     that goes null when an admin is deleted; the email is what makes the row
     still mean something in a year.

   · It never throws. An audit write that fails must not roll back the action
     it was recording — losing the log line is bad, losing the price change
     the user just made is worse. Failures go to stderr, where a log drain
     picks them up.
   ========================================================================= */

export async function recordAudit(input: {
  actorId: string;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const h = headers();
    // `x-forwarded-for` is a list; the client is the first entry. Trusting
    // the last would record our own load balancer on every row.
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null;

    await db.auditLog.create({
      data: {
        actorId: input.actorId,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: (input.metadata ?? {}) as never,
        ip,
        userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record", input.action, error);
  }
}
