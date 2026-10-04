import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/guard";
import { recordAudit } from "@/lib/services/audit";
import { buildAgreementFor, buildChangeOrderFor } from "@/lib/services/agreement";

/* ===========================================================================
   The partner's agreement, as a PDF.

   Generated per request rather than stored: the document is a function of the
   partner's record and their price book, and a cached copy is a copy that goes
   stale the moment either changes. It is a few hundred milliseconds of pdf-lib
   against a 1.6 MB template, which is cheaper than the class of bug where two
   people are looking at different versions of a contract.

   OWNERSHIP IS CHECKED HERE, not inferred from the link. A partner may fetch
   their own; staff need `partners.view`. The same rule the uploaded documents
   follow.
   ========================================================================= */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { partnerId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (session.user.role === "PARTNER") {
    const own = await db.partner.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (own?.id !== params.partnerId) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
  } else if (!hasPermission(session, "partners.view")) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  /* Which one. A partner with change orders has several agreements, and the
     history list on their products page links to each by id. Ownership is
     already settled above, so an id here can only select among that partner's
     own envelopes. */
  const envelopeId = new URL(request.url).searchParams.get("envelope") ?? undefined;

  /* A change order is a different document, not the MSA with a different
     signature on it. Tried first, and only when an envelope was named: the
     bare URL always means "my agreement". */
  const agreement =
    (envelopeId ? await buildChangeOrderFor(params.partnerId, envelopeId) : null) ??
    (await buildAgreementFor(params.partnerId, envelopeId));
  if (!agreement) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // A signed agreement is a record; log who took a copy of it.
  if (agreement.signed) {
    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email ?? null,
      action: "agreement.download",
      entityType: "Partner",
      entityId: params.partnerId,
      metadata: { signed: true },
    });
  }

  return new NextResponse(new Uint8Array(agreement.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      // `inline`, so the viewer can show it; the dialog offers the download.
      "Content-Disposition": `inline; filename="${agreement.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
