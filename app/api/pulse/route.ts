import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/* ===========================================================================
   "Has anything changed?"

   One small endpoint the browser asks every few seconds. When the answer
   differs from what the page was rendered with, the client calls
   `router.refresh()` and the server components re-run — so an admin releasing
   a formulary shows up on the partner's screen without either of them
   reloading, and the work of deciding what changed stays on the server where
   the data is.

   WHY POLLING AND NOT A SOCKET
   ----------------------------
   A websocket or an in-process EventEmitter would need every instance to share
   a bus, and behind more than one instance the second instance never hears the
   event — the update silently stops working for half the users, which is worse
   than a five-second delay. This works anywhere, survives a dropped
   connection with no reconnect logic, and costs two indexed counts.

   The response is deliberately tiny and carries no content: it is a cache key,
   not a payload. What changed is answered by re-rendering.
   ========================================================================= */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const unread = await db.notification.count({
    where: { recipientId: session.user.id, readAt: null, archivedAt: null },
  });

  /* A version token that changes when anything this user would want to see
     changes. For a partner that is their own row; for staff it is the pipeline
     as a whole, because they are watching a queue rather than one record. */
  let version: string;

  if (session.user.role === "PARTNER") {
    const partner = await db.partner.findUnique({
      where: { userId: session.user.id },
      select: { status: true, statusChangedAt: true },
    });
    version = `${partner?.status ?? "none"}:${partner?.statusChangedAt?.getTime() ?? 0}`;
  } else {
    const latest = await db.statusHistory.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const pending = await db.partnerDocument.count({ where: { status: "PENDING_REVIEW" } });
    version = `${latest?.id ?? "none"}:${pending}`;
  }

  return NextResponse.json(
    { unread, version },
    { headers: { "Cache-Control": "no-store" } }
  );
}
