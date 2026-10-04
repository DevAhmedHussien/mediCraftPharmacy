"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/forms";
import { requireSuperAdmin } from "@/lib/guard";
import { recordAudit } from "@/lib/services/audit";
import {
  AdminError,
  createAdmin,
  resetAdminPassword,
  setAdminActive,
  setAdminPermissions,
  setAdminRole,
} from "@/lib/services/admins";

/* ===========================================================================
   Staff accounts, super admin only.

   `requireSuperAdmin()` on every one, not `requirePermission`. There is no
   permission that grants this and there must not be: a permission that can
   create accounts and assign permissions is a permission that can grant
   itself everything else, so the only gate that means anything here is the
   role.

   Every one of these is audited. Creating an operator, moving a grant and
   resetting a password are the three actions in this system that change who
   can see Provider Cost, and "who did that" has to be answerable later.
   ========================================================================= */

function fail(message: string): FormState {
  return { ok: false, message };
}

/** Turns a thrown AdminError into a form message; rethrows anything else. */
function asFormError(error: unknown): FormState {
  if (error instanceof AdminError) return fail(error.message);
  throw error;
}

export async function createAdminAction(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const session = await requireSuperAdmin();

  const email = String(data.get("email") ?? "");
  const name = String(data.get("name") ?? "");
  const password = String(data.get("password") ?? "");
  const confirm = String(data.get("confirmPassword") ?? "");
  const role = String(data.get("role") ?? "ADMIN") === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
  const permissions = data.getAll("permissions").map(String);

  if (password !== confirm) {
    return { ok: false, errors: { confirmPassword: "The two passwords do not match." } };
  }

  let created;
  try {
    created = await createAdmin({
      email,
      name,
      password,
      role,
      permissions,
      grantedById: session.user.id,
    });
  } catch (error) {
    return asFormError(error);
  }

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "admin.create",
    entityType: "User",
    entityId: created.id,
    // The password is never logged, hashed or otherwise. What matters for the
    // trail is who was created, as what, with what reach.
    metadata: { email: created.email, role, permissions },
  });

  revalidatePath("/admin/team");
  return {
    ok: true,
    message: `${created.email} can sign in now. Send them the password out of band — it is not emailed.`,
  };
}

export async function setPermissionsAction(
  userId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const session = await requireSuperAdmin();
  const permissions = data.getAll("permissions").map(String);

  try {
    await setAdminPermissions({ userId, permissions, grantedById: session.user.id });
  } catch (error) {
    return asFormError(error);
  }

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "admin.permissions",
    entityType: "User",
    entityId: userId,
    metadata: { permissions },
  });

  revalidatePath("/admin/team");
  return { ok: true, message: `Saved ${permissions.length} permissions.` };
}

export async function setActiveAction(
  userId: string,
  isActive: boolean,
  _prev: FormState
): Promise<FormState> {
  const session = await requireSuperAdmin();

  try {
    await setAdminActive({ userId, isActive, actingUserId: session.user.id });
  } catch (error) {
    return asFormError(error);
  }

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: isActive ? "admin.reactivate" : "admin.deactivate",
    entityType: "User",
    entityId: userId,
  });

  revalidatePath("/admin/team");
  return { ok: true, message: isActive ? "Account reactivated." : "Account switched off." };
}

export async function setRoleAction(
  userId: string,
  role: "ADMIN" | "SUPER_ADMIN",
  _prev: FormState
): Promise<FormState> {
  const session = await requireSuperAdmin();

  try {
    await setAdminRole({ userId, role, actingUserId: session.user.id });
  } catch (error) {
    return asFormError(error);
  }

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "admin.role",
    entityType: "User",
    entityId: userId,
    metadata: { role },
  });

  revalidatePath("/admin/team");
  return { ok: true, message: role === "SUPER_ADMIN" ? "Promoted." : "Demoted to admin." };
}

export async function resetPasswordAction(
  userId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const session = await requireSuperAdmin();

  const password = String(data.get("password") ?? "");
  const confirm = String(data.get("confirmPassword") ?? "");
  if (password !== confirm) {
    return { ok: false, errors: { confirmPassword: "The two passwords do not match." } };
  }

  try {
    await resetAdminPassword(userId, password);
  } catch (error) {
    return asFormError(error);
  }

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "admin.password-reset",
    entityType: "User",
    entityId: userId,
  });

  revalidatePath("/admin/team");
  return { ok: true, message: "Password set. Tell them out of band." };
}
