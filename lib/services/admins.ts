import "server-only";

import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { PERMISSION, PERMISSION_ENUM, type Permission } from "@/lib/partner/status";

/* ===========================================================================
   The staff accounts, and what each of them has actually done.

   Until now there was no way to add an operator. Admin users existed only
   because prisma/seed.ts created them, so onboarding a colleague meant a
   developer, a migration window and a password typed into a shell — and the
   permission rows the whole authorisation model is built on could only be
   granted the same way.

   WHY A PASSWORD IS SET HERE RATHER THAN EMAILED AS AN INVITE
   -----------------------------------------------------------
   An invite flow needs a token table, an expiry policy, a public route that
   accepts an unauthenticated password POST, and an email that must not be
   forwardable. This system already has exactly one way an operator proves who
   they are — email and password against `User.passwordHash` — and a super
   admin setting the first one, then telling the person out of band, adds no
   surface that is not already there. `PasswordResetToken` exists if the
   invite flow is wanted later; this does not foreclose it.

   WHAT "AGREEMENTS SENT" COUNTS
   -----------------------------
   There is no assignment column on Partner — nobody owns an account in this
   schema. So "how many agreements has this person done" is answered from the
   trail they actually left: the MSA_SENT transitions they drove, the partners
   they verified, the change orders they picked up, and the price lists they
   built. That is attribution from evidence rather than from a field somebody
   has to remember to set.
   ========================================================================= */

export class AdminError extends Error {
  constructor(
    message: string,
    readonly httpStatus = 400
  ) {
    super(message);
    this.name = "AdminError";
  }
}

/** Every permission, in the order the grant form shows them. */
export const ALL_PERMISSIONS = Object.values(PERMISSION) as Permission[];

/** What each permission actually lets someone do, in the admin's words. */
export const PERMISSION_BLURB: Record<Permission, string> = {
  "applications.view": "See applications and the partner pipeline.",
  "applications.review": "Approve or reject applications, and decline change orders.",
  "products.send": "Release the formulary to an applicant.",
  "pricing.review": "Build and send pricing, and run change orders.",
  "onboarding.review": "Review account details, licences and documents.",
  "msa.send": "Issue the Master Service Agreement for signature.",
  "partners.view": "Open a partner's record.",
  "partners.manage": "Suspend, reactivate and edit partner accounts.",
};

export type AdminRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  permissions: Permission[];
  /** What they have done, counted from the trail rather than an owner field. */
  work: {
    agreementsSent: number;
    partnersVerified: number;
    changeOrders: number;
    priceLists: number;
  };
};

/**
 * Every staff account with its permissions and its workload.
 *
 * Four aggregate queries rather than four per operator: a team of twelve
 * would otherwise be forty-nine round trips to render one table.
 */
export async function listAdmins(): Promise<AdminRow[]> {
  const users = await db.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      permissions: { select: { permission: true } },
    },
  });

  const ids = users.map((u) => u.id);
  if (ids.length === 0) return [];

  const [transitions, amendments, priceLists] = await Promise.all([
    db.statusHistory.groupBy({
      by: ["actorId", "toStatus"],
      where: { actorId: { in: ids }, toStatus: { in: ["MSA_SENT", "VERIFIED"] } },
      _count: { _all: true },
    }),
    db.formularyAmendment.groupBy({
      by: ["reviewedById"],
      where: { reviewedById: { in: ids } },
      _count: { _all: true },
    }),
    db.priceListVersion.groupBy({
      by: ["submittedById"],
      where: { submittedById: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const sent = new Map<string, number>();
  const verified = new Map<string, number>();
  for (const row of transitions) {
    if (!row.actorId) continue;
    const target = row.toStatus === "MSA_SENT" ? sent : verified;
    target.set(row.actorId, (target.get(row.actorId) ?? 0) + row._count._all);
  }

  const orders = new Map(
    amendments.filter((a) => a.reviewedById).map((a) => [a.reviewedById!, a._count._all])
  );
  const lists = new Map(
    priceLists.filter((v) => v.submittedById).map((v) => [v.submittedById!, v._count._all])
  );

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    /* Prisma hands back the enum MEMBER name; the app speaks the dotted wire
       string everywhere else. Mapped here so no caller has to know. */
    permissions: user.permissions.map(
      (p) => PERMISSION[p.permission as keyof typeof PERMISSION]
    ),
    work: {
      agreementsSent: sent.get(user.id) ?? 0,
      partnersVerified: verified.get(user.id) ?? 0,
      changeOrders: orders.get(user.id) ?? 0,
      priceLists: lists.get(user.id) ?? 0,
    },
  }));
}

/**
 * A password good enough to be the only thing between a stranger and every
 * partner's Provider Cost.
 *
 * Length over character classes: twelve characters of anything beats eight
 * with a digit and a capital, and a rule nobody can satisfy without a
 * generator is a rule that produces Password1!.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return "Use at least 12 characters.";
  if (password.length > 200) return "That is longer than 200 characters.";
  if (!/[a-zA-Z]/.test(password)) return "Use at least one letter.";
  if (!/[0-9\W]/.test(password)) return "Include a number or a symbol.";
  return null;
}

const normaliseEmail = (email: string) => email.trim().toLowerCase();

/** Rejects anything that is not one of the eight. */
function assertPermissions(values: string[]): Permission[] {
  const allowed = new Set<string>(ALL_PERMISSIONS);
  for (const value of values) {
    if (!allowed.has(value)) throw new AdminError(`“${value}” is not a permission.`);
  }
  return values as Permission[];
}

export async function createAdmin(input: {
  email: string;
  name: string;
  password: string;
  role: "ADMIN" | "SUPER_ADMIN";
  permissions: string[];
  grantedById: string;
}): Promise<{ id: string; email: string }> {
  const email = normaliseEmail(input.email);
  const name = input.name.trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new AdminError("That does not look like an email address.");
  }
  if (name.length < 2) throw new AdminError("Give them a name.");

  const problem = passwordProblem(input.password);
  if (problem) throw new AdminError(problem);

  const permissions = assertPermissions(input.permissions);

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new AdminError("An account already uses that email address.", 409);
  }

  // Cost 12, the same as every other hash in this codebase. Changing it here
  // would make one account slower or weaker than the rest for no reason.
  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: input.role,
      permissions: {
        /* A super admin bypasses the permission check entirely, so rows for
           one are decoration — but they are honest decoration: the grant list
           on screen should say what was granted, and demoting them later must
           not silently hand them nothing. */
        create: permissions.map((permission) => ({
          permission: PERMISSION_ENUM[permission] as never,
          grantedById: input.grantedById,
        })),
      },
    },
    select: { id: true, email: true },
  });

  return user;
}

/** Replace someone's grants with exactly this set. */
export async function setAdminPermissions(input: {
  userId: string;
  permissions: string[];
  grantedById: string;
}): Promise<void> {
  const permissions = assertPermissions(input.permissions);

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { role: true },
  });
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new AdminError("That is not a staff account.", 404);
  }

  /* Delete-then-create inside one transaction. Diffing the two sets would be
     the same result with a branch for each of revoked, kept and added — and a
     half-applied diff leaves someone holding a permission the screen says
     they do not have. */
  await db.$transaction([
    db.adminPermission.deleteMany({ where: { userId: input.userId } }),
    db.adminPermission.createMany({
      data: permissions.map((permission) => ({
        userId: input.userId,
        permission: PERMISSION_ENUM[permission] as never,
        grantedById: input.grantedById,
      })),
    }),
  ]);
}

/**
 * Switch an account off, or back on.
 *
 * Deactivating is the way out rather than deleting: `StatusHistory` and
 * `AuditLog` point at this row, and removing it would either cascade away the
 * trail or leave it orphaned. An inactive user fails the credentials check,
 * which is what "revoked" has to mean.
 */
export async function setAdminActive(input: {
  userId: string;
  isActive: boolean;
  actingUserId: string;
}): Promise<void> {
  if (input.userId === input.actingUserId && !input.isActive) {
    throw new AdminError("Locking yourself out is not a feature.");
  }

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { role: true, isActive: true },
  });
  if (!user) throw new AdminError("That account could not be found.", 404);

  /* The last working super admin may not be switched off. There is no other
     way back in: every route that could re-enable them is behind the role
     they just lost. */
  if (!input.isActive && user.role === "SUPER_ADMIN") {
    const others = await db.user.count({
      where: { role: "SUPER_ADMIN", isActive: true, id: { not: input.userId } },
    });
    if (others === 0) {
      throw new AdminError("That is the last active super admin. Promote someone first.");
    }
  }

  await db.user.update({
    where: { id: input.userId },
    data: { isActive: input.isActive },
  });
}

/** Set a new password for someone who has lost theirs. */
export async function resetAdminPassword(userId: string, password: string): Promise<void> {
  const problem = passwordProblem(password);
  if (problem) throw new AdminError(problem);

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new AdminError("That is not a staff account.", 404);
  }

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
}

/** Promote to super admin, or demote back to admin. */
export async function setAdminRole(input: {
  userId: string;
  role: "ADMIN" | "SUPER_ADMIN";
  actingUserId: string;
}): Promise<void> {
  if (input.userId === input.actingUserId && input.role !== "SUPER_ADMIN") {
    throw new AdminError("Demoting yourself would take away the page you are standing on.");
  }

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { role: true },
  });
  if (!user) throw new AdminError("That account could not be found.", 404);

  if (user.role === "SUPER_ADMIN" && input.role === "ADMIN") {
    const others = await db.user.count({
      where: { role: "SUPER_ADMIN", isActive: true, id: { not: input.userId } },
    });
    if (others === 0) {
      throw new AdminError("That is the last super admin. Promote someone first.");
    }
  }

  await db.user.update({ where: { id: input.userId }, data: { role: input.role } });
}
