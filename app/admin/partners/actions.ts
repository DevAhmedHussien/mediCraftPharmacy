"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { requireAdmin } from "@/lib/guard";
import {
  findTransition,
  PARTNER_STATUS,
  type PartnerStatus,
} from "@/lib/partner/status";
import { approveAndSendAgreement, sendAgreement } from "@/lib/services/msa";
import { applyTransition } from "@/lib/services/transition";

/* Pipeline actions.

   Every one funnels into `applyTransition`, which re-derives the edge from the
   state machine and re-checks the permission the edge declares. This file
   deliberately holds no permission list of its own — a second copy would be a
   second thing to keep in sync, and the one that drifts is the one that
   silently grants access. */

export async function movePartner(
  partnerId: string,
  to: PartnerStatus,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const session = await requireAdmin();
  const note = String(data.get("note") ?? "").trim() || undefined;

  // Reject/suspend without a reason is how a partner ends up with an email
  // that explains nothing and an admin who cannot remember why.
  if ((to === PARTNER_STATUS.REJECTED || to === PARTNER_STATUS.SUSPENDED) && !note) {
    return { ok: false, errors: { note: "A reason is required." } };
  }

  const actor = {
    id: session.user.id,
    email: session.user.email ?? undefined,
    role: session.user.role,
    isSuperAdmin: session.user.role === "SUPER_ADMIN",
    permissions: session.user.permissions,
  };

  try {
    /* MSA_SENT is not just a status. The envelope has to exist before the
       partner is told their agreement is ready, or they open the page and are
       told there is nothing to sign — see lib/services/msa.ts. */
    const transition =
      to === PARTNER_STATUS.MSA_SENT
        ? await sendAgreement(partnerId, actor)
        : await applyTransition({
            partnerId,
            to,
            actor: "ADMIN",
            actorId: actor.id,
            actorEmail: actor.email,
            actorRole: actor.role,
            isSuperAdmin: actor.isSuperAdmin,
            permissions: actor.permissions,
            note,
          });

    /* Record WHO verified the requester, not just that someone did. The
       transition history says an admin released the formulary; this says which
       admin looked at the photo ID, which is the part that matters if it later
       turns out to have been the wrong person. */
    if (to === PARTNER_STATUS.PRODUCT_LIST_SENT) {
      await db.partnerApplication.updateMany({
        where: { partnerId, identityVerifiedAt: null },
        data: { identityVerifiedAt: new Date(), identityVerifiedById: session.user.id },
      });
    }

    revalidatePath(`/admin/partners/${partnerId}`);
    revalidatePath("/admin/partners");
    revalidatePath("/admin");

    return { ok: true, message: `${transition.label}.` };
  } catch (error) {
    // The state machine's own errors carry a readable message and a status;
    // anything else is ours and must not be echoed to the client.
    if (error instanceof Error && "httpStatus" in error) {
      return { ok: false, message: error.message };
    }
    console.error("[partners] transition failed", error);
    return { ok: false, message: "That change could not be applied." };
  }
}

/** The moves this admin may make from the partner's current status. */
export async function availableMoves(from: PartnerStatus) {
  const session = await requireAdmin();
  const isSuper = session.user.role === "SUPER_ADMIN";

  return (["ADMIN"] as const).flatMap(() =>
    Object.values(PARTNER_STATUS)
      .map((to) => findTransition(from, to))
      .filter((t): t is NonNullable<typeof t> => Boolean(t) && t!.actor === "ADMIN")
      .filter((t) => isSuper || !t.permission || session.user.permissions.includes(t.permission))
  );
}

/**
 * Approve the onboarding file and send the agreement together.
 *
 * The two edges stay separate in the state machine — see
 * `approveAndSendAgreement` — but there is no decision to make between them,
 * so there is no reason to make an admin press twice.
 */
export async function approveAndSend(
  partnerId: string,
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const session = await requireAdmin();
  const note = String(data.get("note") ?? "").trim() || undefined;

  try {
    await approveAndSendAgreement(
      partnerId,
      {
        id: session.user.id,
        email: session.user.email ?? undefined,
        role: session.user.role,
        isSuperAdmin: session.user.role === "SUPER_ADMIN",
        permissions: session.user.permissions,
      },
      note
    );

    revalidatePath(`/admin/partners/${partnerId}`);
    revalidatePath("/admin/partners");
    revalidatePath("/admin");

    return { ok: true, message: "Approved, and the agreement is on its way." };
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return { ok: false, message: error.message };
    }
    console.error("[partners] approve-and-send failed", error);
    return { ok: false, message: "That change could not be applied." };
  }
}
