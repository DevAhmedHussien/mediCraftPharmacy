import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/guard";
import {
  assertUploadAllowed,
  MAX_DOCUMENT_BYTES,
  storage,
  StorageError,
} from "@/lib/services/storage";

/* ===========================================================================
   The local storage driver's endpoint.

   In production `STORAGE_DRIVER=s3` and nothing reaches this file: the browser
   PUTs to a presigned S3 URL and GETs from another one. Locally there is no
   bucket, so the same two operations land here instead — which is the whole
   point of the driver split. Dev and prod differ in where the bytes live,
   never in who is allowed to read them.

   SO THIS ROUTE RE-RUNS EVERY CHECK. A presign is a capability: on S3 the
   signature IS the authorisation. Here there is no signature, so the
   authorisation has to be done again from the session — anything less would
   make `/api/uploads/...` an unauthenticated read of every uploaded licence
   and photo ID on the machine.

   `public/` is not an option for any of this: Next serves that tree with no
   auth check and no content-type control, so an uploaded `.html` would be a
   stored-XSS page on our own origin.
   ========================================================================= */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PARTNER_DOCUMENT_PREFIX = /^partners\/([^/]+)\/documents\//;

/**
 * Decide whether this session may touch this key, for this operation.
 *
 * READ AND WRITE ARE NOT THE SAME PERMISSION. A reviewer needs to open a
 * partner's licence; nobody but the partner needs to replace it. Collapsing
 * the two — which the first version of this file did — meant an admin holding
 * only `partners.view` could PUT over the DEA registration they were
 * reviewing, and the audit trail would show the partner uploading it.
 *
 * Partner-document keys carry their owner's id, so ownership is structural
 * rather than a lookup. Everything else under the upload root is admin media.
 */
async function authorise(key: string, mode: "read" | "write"): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;

  const match = PARTNER_DOCUMENT_PREFIX.exec(key);

  if (match) {
    const owner = match[1]!;

    if (session.user.role !== "PARTNER") {
      // Staff may read a partner's file. Only the partner may write to it.
      return mode === "read" && hasPermission(session, "partners.view");
    }

    const partner = await db.partner.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    return partner?.id === owner;
  }

  // Blog covers, product shots and the like — staff only, either way.
  return session.user.role !== "PARTNER";
}

export async function PUT(request: Request, { params }: { params: { key: string[] } }) {
  const key = params.key.map(decodeURIComponent).join("/");

  if (!(await authorise(key, "write"))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const mime = request.headers.get("content-type") ?? "";
  const body = Buffer.from(await request.arrayBuffer());

  /* Checked against the BYTES, not against the size the client claimed. A
     header is a promise; the buffer is the fact. */
  try {
    assertUploadAllowed(mime, body.byteLength, "document");
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus });
    }
    throw error;
  }

  if (body.byteLength > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "That file is too large." }, { status: 413 });
  }

  await storage.put(key, body, mime);
  return NextResponse.json({ ok: true, key });
}

export async function GET(_request: Request, { params }: { params: { key: string[] } }) {
  const key = params.key.map(decodeURIComponent).join("/");

  if (!(await authorise(key, "read"))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const document = await db.partnerDocument.findUnique({
    where: { s3Key: key },
    select: { filename: true, mime: true },
  });

  let body: Buffer;
  try {
    body = await storage.get(key);
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      // `attachment`, always. An uploaded SVG or PDF rendered inline is script
      // execution on our own origin; forcing a download is the difference.
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        document?.filename ?? "document"
      )}"`,
      "Content-Type": document?.mime ?? "application/octet-stream",
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
