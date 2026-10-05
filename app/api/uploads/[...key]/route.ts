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

/** Cover images for published articles. Public to read, staff to write. */
const BLOG_MEDIA_PREFIX = /^blog\//;

/**
 * Content types we are willing to serve INLINE, by extension.
 *
 * Images only, and raster images at that. No SVG: an SVG is a document that
 * can carry script, so rendering one inline from our own origin is
 * stored XSS. It stays on the attachment path with everything else.
 */
const INLINE_TYPES: Record<string, string> = {
  webp: "image/webp",
  avif: "image/avif",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};

function inlineTypeFor(key: string): string | null {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return INLINE_TYPES[ext] ?? null;
}

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
  /* Blog covers are public to READ and staff-only to write.
   *
   * Everything else under this route is a private document, so the rule was
   * "a session, or nothing" — which is right for a licence and wrong for an
   * article's cover photograph. A published post is a public page; an image
   * on it that 403s to anyone not signed in is a broken page for every
   * visitor the article was written for.
   *
   * Narrow on purpose: the `blog/` prefix only, reads only. Writes still
   * need staff, so nobody can publish an image by choosing a key. The
   * bucket stays private and the bytes still pass through this route, which
   * is what keeps one rule for how objects leave storage. */
  if (mode === "read" && BLOG_MEDIA_PREFIX.test(key)) return true;

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

  /* --- Blog media is a public asset and has to be served like one ---------
     This route was written for partner documents, and those rules were being
     applied to article cover photographs as well: `attachment`, so a browser
     asked to download rather than display; `application/octet-stream`,
     because the content type came from a PartnerDocument row that does not
     exist for blog media; and `private, no-store`, so the file was fetched
     again on every single page view by every visitor, forever.

     It still rendered, because next/image fetches the bytes server-side and
     re-serves them — which is exactly why nobody noticed. The cost just moved:
     every optimizer miss meant our own server pulling 130KB back out of S3.

     Narrow on purpose. The inline path needs BOTH a public prefix and a
     raster image extension; anything else falls through to the attachment
     path below, unchanged. */
  const publicImage = BLOG_MEDIA_PREFIX.test(key) ? inlineTypeFor(key) : null;

  if (publicImage) {
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Disposition": "inline",
        "Content-Type": publicImage,
        "Content-Length": String(body.byteLength),
        /* Immutable, and safe to be: these keys carry a dated path and a
           replaced cover is uploaded under a new one. If that ever stops
           being true, the key has to change — not this header. */
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      // `attachment`, always, for anything private. An uploaded SVG or PDF
      // rendered inline is script execution on our own origin; forcing a
      // download is the difference.
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
