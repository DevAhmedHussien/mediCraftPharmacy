import "server-only";

import { db } from "@/lib/db";
import { PARTNER_STATUS } from "@/lib/partner/status";
import { agreementText, signature } from "@/lib/services/signature";
import { applyTransition } from "@/lib/services/transition";

/* ===========================================================================
   Sending the agreement.

   MSA_SENT used to be a status change and nothing else: the partner's portal
   then looked for an envelope that did not exist and told them there was no
   agreement awaiting their signature. The envelope and the status are one
   act, so they belong in one function rather than in whichever call site
   happens to remember.

   ORDER MATTERS. The envelope is created FIRST and the status moves second.
   The other way round leaves a partner who has been emailed "your agreement
   is ready" looking at an empty page if envelope creation fails; this way a
   failure leaves them at ONBOARDING_APPROVED, which is true, and the admin
   can press the button again.
   ========================================================================= */

export class MsaError extends Error {
  constructor(
    message: string,
    readonly httpStatus = 400
  ) {
    super(message);
    this.name = "MsaError";
  }
}

export type Actor = {
  id?: string;
  email?: string;
  role?: "SUPER_ADMIN" | "ADMIN" | "PARTNER";
  isSuperAdmin?: boolean;
  permissions?: readonly string[];
};

/**
 * Create the envelope and move the partner to MSA_SENT.
 *
 * Idempotent in the way that matters: an envelope already out for signature is
 * reused rather than duplicated, so a double-clicked button does not leave two
 * agreements with two different hashes and no way to say which one is binding.
 */
export async function sendAgreement(partnerId: string, actor: Actor) {
  const partner = await db.partner.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      companyName: true,
      contactName: true,
      user: { select: { email: true } },
      onboarding: { select: { signerName: true, signerEmail: true } },
      msaEnvelopes: {
        where: { status: { in: ["SENT", "DELIVERED"] } },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!partner) throw new MsaError("Partner not found.", 404);

  /* The signer comes from the account details, not from the login. The person
     who filled in the form is often an office manager; the person who may bind
     the practice is whoever they named. Falling back to the account holder is
     a last resort so this cannot fail on missing data, and the agreement page
     shows the name so a wrong one is visible before anyone signs. */
  const signerName = partner.onboarding?.signerName || partner.contactName;
  const signerEmail = partner.onboarding?.signerEmail || partner.user.email;

  if (partner.msaEnvelopes.length === 0) {
    await signature.create({
      partnerId: partner.id,
      signerName,
      signerEmail,
      agreementText: agreementText(partner.companyName),
    });
  }

  return applyTransition({
    partnerId,
    to: PARTNER_STATUS.MSA_SENT,
    actor: "ADMIN",
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    isSuperAdmin: actor.isSuperAdmin,
    permissions: actor.permissions,
    note: `Agreement sent to ${signerName}.`,
  });
}

/**
 * Approve the onboarding file and send the agreement, as one click.
 *
 * They are two edges in the state machine and stay two edges — two facts, two
 * audit rows, two emails — but there is no decision between them. An admin who
 * has just approved a file has never wanted to stop and press a second button,
 * and the gap between the two is a partner sitting at ONBOARDING_APPROVED
 * wondering where their agreement is.
 */
export async function approveAndSendAgreement(partnerId: string, actor: Actor, note?: string) {
  await applyTransition({
    partnerId,
    to: PARTNER_STATUS.ONBOARDING_APPROVED,
    actor: "ADMIN",
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    isSuperAdmin: actor.isSuperAdmin,
    permissions: actor.permissions,
    note,
  });

  return sendAgreement(partnerId, actor);
}
