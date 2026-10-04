import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/* ===========================================================================
   Is this instance able to serve?

   WHY A DEDICATED ROUTE AND NOT /api/pulse
   ----------------------------------------
   The Dockerfile's HEALTHCHECK points at /api/pulse on the reasoning that a
   real route is a better test than a stub. That holds for a container check
   on localhost, but not for a load balancer: /api/pulse calls `auth()` and
   answers 401 to anyone without a session, and App Runner's health check
   carries no cookies. Pointed there, every instance is marked unhealthy and
   the deployment rolls back — the failure looks like a broken app rather
   than a misread status code.

   So: unauthenticated, and cheap enough to be hit every few seconds.

   WHAT IT ACTUALLY CHECKS
   -----------------------
   `SELECT 1`. An instance that cannot reach Postgres can serve static assets
   and nothing else, which for this app is indistinguishable from down — every
   page is behind a query. Checking the process is alive without checking the
   database would keep a useless instance in rotation.

   It does NOT check Resend, S3 or GoHighLevel. A health check that fails
   because a third party is down takes the whole service out over something
   it can still work around; those belong in monitoring, not in the signal
   that decides whether to route traffic here.
   ========================================================================= */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { ok: true, service: "medicraft", database: "up" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    /* No error detail in the body. This endpoint is public, and a connection
       string or a host name in a 503 is a free map of the infrastructure. The
       detail is in the logs. */
    return NextResponse.json(
      { ok: false, service: "medicraft", database: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
