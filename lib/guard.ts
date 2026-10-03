import "server-only";

import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import type { Session } from "next-auth";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PERMISSION_ENUM, type Permission } from "@/lib/partner/status";

/* ===========================================================================
   Server-side authorisation. The only place a permission is ever decided.

   TWO TIERS ON PURPOSE
   --------------------
   `requireRole` reads the JWT. It is cheap and correct for deciding whether
   to render an admin page at all.

   `requirePermission` re-reads the grant from the database. It costs one
   indexed query and it is what every mutating route must use, because a
   permission revoked five minutes ago is still sitting in the holder's token.
   Rendering a stale page is a cosmetic problem; honouring a revoked
   permission on a write is a security one.

   Super admins bypass the permission check and only that check. They are
   still subject to `requireRole`, and they still cannot drive a SYSTEM
   transition — see lib/partner/status.ts.
   ========================================================================= */

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
    readonly httpStatus: 401 | 403
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const unauthenticated = () => new AuthError("Sign in to continue.", "UNAUTHENTICATED", 401);
const forbidden = (m: string) => new AuthError(m, "FORBIDDEN", 403);

/** The session, or throw. Use where a caller must be signed in as anyone. */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) throw unauthenticated();
  return session;
}

/** Signed in AND holding one of these roles. */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw forbidden("Your account does not have access to this area.");
  }
  return session;
}

/** Any staff member. The gate on /admin as a whole. */
export const requireAdmin = () => requireRole("SUPER_ADMIN", "ADMIN");

export const requireSuperAdmin = () => requireRole("SUPER_ADMIN");

/**
 * Staff, holding this permission right now.
 *
 * Deliberately re-queries rather than reading `session.user.permissions`. The
 * token is a render-time convenience; this is the authority.
 */
export async function requirePermission(permission: Permission): Promise<Session> {
  const session = await requireAdmin();
  if (session.user.role === "SUPER_ADMIN") return session;

  const grant = await db.adminPermission.findFirst({
    where: {
      userId: session.user.id,
      // Member name, not the dotted wire string — see PERMISSION_ENUM.
      permission: PERMISSION_ENUM[permission] as never,
      // A deactivated admin keeps their grants in the table but must not be
      // able to use them — deactivation has to be immediate, not a cleanup job.
      user: { isActive: true },
    },
    select: { id: true },
  });

  if (!grant) throw forbidden(`Requires the ${permission} permission.`);
  return session;
}

/**
 * Non-throwing variant, for deciding whether to render a button.
 * Never use this to protect a write — use `requirePermission`.
 */
export function hasPermission(session: Session, permission: Permission): boolean {
  return session.user.role === "SUPER_ADMIN" || session.user.permissions.includes(permission);
}

/* --- Page guards ---------------------------------------------------------
   The functions above THROW, which is correct for a route handler or a server
   action: the error mapper turns them into a 401/403 with a JSON body.

   A page is different. A layout that throws renders Next's error overlay — a
   stack trace — at someone who has simply opened the wrong URL. A partner who
   lands on /admin should be sent to their own area, not shown
   `Error: Your account does not have access to this area.`

   So pages use these instead. Same checks, different failure: a redirect.
   ---------------------------------------------------------------------- */

/** Where a signed-in user belongs, by role. */
export function homeFor(role: Role): string {
  return role === "PARTNER" ? "/portal" : "/admin";
}

/**
 * Staff-only page guard.
 *
 * Anonymous → /login carrying the path they wanted, so they land there after
 * signing in. A partner → their own portal. Neither is an error.
 */
export async function requireAdminPage(currentPath = "/admin"): Promise<Session> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }
  if (session.user.role === "PARTNER") {
    redirect("/portal");
  }

  return session;
}

/**
 * Permission-gated page guard.
 *
 * An admin without the grant is sent back to the admin home with the missing
 * permission named, so the UI can say "you need products.send for that"
 * rather than crashing or, worse, silently doing nothing. Re-queries the
 * database for the same reason `requirePermission` does: a revoked grant must
 * take effect now, not at the holder's next sign-in.
 */
export async function requirePermissionPage(permission: Permission): Promise<Session> {
  const session = await requireAdminPage();
  if (session.user.role === "SUPER_ADMIN") return session;

  const grant = await db.adminPermission.findFirst({
    where: {
      userId: session.user.id,
      permission: PERMISSION_ENUM[permission] as never,
      user: { isActive: true },
    },
    select: { id: true },
  });

  if (!grant) redirect(`/admin?denied=${encodeURIComponent(permission)}`);
  return session;
}

/** Partner-only page guard, mirroring the above. */
export async function requirePartnerPage(currentPath = "/portal"): Promise<Session> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }
  if (session.user.role !== "PARTNER") {
    redirect("/admin");
  }

  return session;
}

/**
 * The partner record belonging to the caller.
 *
 * Every partner-facing query starts here rather than taking an id from the
 * request. A route that reads `params.partnerId` and trusts it is one
 * incremented integer away from handing someone else's DEA number to a
 * stranger; there is no parameter to tamper with if the id comes from the
 * session.
 */
export async function requireOwnPartner(): Promise<{ session: Session; partnerId: string }> {
  const session = await requireRole("PARTNER");

  const partner = await db.partner.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!partner) throw forbidden("No partner record is linked to this account.");
  return { session, partnerId: partner.id };
}
