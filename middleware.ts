import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ===========================================================================
   Edge middleware: security headers for everything, a cheap gate on /admin.

   THE GATE HERE IS NOT THE AUTHORISATION
   --------------------------------------
   Middleware runs on the edge runtime, where Prisma cannot. All it does is
   bounce anyone without a session cookie to /login so an unauthenticated
   visitor never pays for a server render. The real check — role, permission,
   is-the-account-still-active — happens in `app/admin/layout.tsx` and again
   in every action, against the database. Treating a cookie's presence as
   authorisation would mean anyone who can set a cookie is an admin.

   The CSP is the other half of this file. `unsafe-inline` on styles is
   required by Next's style injection and by Tailwind's runtime-inserted
   rules; scripts are restricted to self plus the nonce-free inline bootstrap
   Next emits, which is why `unsafe-inline` appears there too under
   `strict-dynamic`-less CSP2 fallback semantics. Tightening this to a nonce
   is a known follow-up, noted in the handover.
   ========================================================================= */

const SECURITY_HEADERS: Record<string, string> = {
  // Clickjacking: the admin has destructive one-click actions.
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  // Full URLs leak record ids to any third party a page links to.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "on",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

/**
 * The storage origin the browser is allowed to PUT to.
 *
 * WHY THIS FUNCTION EXISTS
 * ------------------------
 * `connect-src 'self'` silently broke every document upload in production,
 * and the symptom pointed nowhere near here. A document upload is a
 * presigned PUT: the server mints a signed S3 URL, the browser PUTs the
 * bytes straight to the bucket. CSP refuses the fetch before it leaves the
 * browser, so the server action succeeded, nothing was logged, no request
 * ever reached S3 — and the uploader's catch reported "We could not reach
 * storage. Check your connection and try again." A network message, on a
 * page that was plainly online.
 *
 * It could only ever happen in production. Development runs
 * STORAGE_DRIVER=local, which PUTs to /api/uploads on this origin, and
 * `'self'` allows that.
 *
 * `img-src` already ends in `https:`, which is why looking at an uploaded
 * document worked fine and only putting one there did not — the two halves
 * of the same feature were governed by two different directives.
 *
 * Only the exact bucket origin is added, never a wildcard: this grants the
 * page the right to send bytes somewhere, and the list of somewheres should
 * be one host long.
 */
function storageOrigin(): string | null {
  if (process.env.STORAGE_DRIVER !== "s3") return null;

  // MinIO and LocalStack set an explicit endpoint; use whatever it names.
  const endpoint = process.env.S3_ENDPOINT;
  if (endpoint) {
    try {
      return new URL(endpoint).origin;
    } catch {
      return null;
    }
  }

  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  if (!bucket || !region) return null;

  return process.env.S3_FORCE_PATH_STYLE === "true"
    ? `https://s3.${region}.amazonaws.com`
    : `https://${bucket}.s3.${region}.amazonaws.com`;
}

const STORAGE_ORIGIN = storageOrigin();

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  /* Documents are shown in-page from a blob: URL — the signed agreement, an
     uploaded licence, a W-9. Without this, `frame-src` falls back to
     `default-src 'self'`, a blob: frame is refused, and the viewer renders
     Chrome's "This content is blocked. Contact the site owner to fix the
     issue." in place of the PDF.

     `blob:` only ever names bytes this origin already fetched and held in
     memory; it cannot address anything remote, so this does not widen what the
     page can reach. */
  "frame-src 'self' blob:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  ["connect-src 'self'", STORAGE_ORIGIN].filter(Boolean).join(" "),
  "upgrade-insecure-requests",
].join("; ");

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminArea = pathname.startsWith("/admin");
  // Auth.js names the cookie differently over HTTPS; check both rather than
  // branching on an env var that can be wrong behind a proxy.
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (isAdminArea && !hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(key, value);
  response.headers.set("Content-Security-Policy", CSP);
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return response;
}

export const config = {
  // Everything except static assets and image optimisation, which need no
  // headers from us and would only add latency.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|images/|fonts/|svg/).*)"],
};
