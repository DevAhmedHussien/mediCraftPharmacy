import type { Role } from "@prisma/client";

/**
 * Where a signed-in account belongs.
 *
 * One answer, used by the login redirect, the login action and the header, so
 * those three cannot disagree about where "your account" is. Pure, so the
 * client navbar can call it without importing a server guard.
 */
export function homeForRole(role: Role | string | null | undefined): string {
  return role === "PARTNER" ? "/portal" : "/admin";
}

/** What the header calls the link, once we know who is signed in. */
export function homeLabelForRole(role: Role | string | null | undefined): string {
  return role === "PARTNER" ? "Your portal" : "Admin";
}
