"use server";

import { headers } from "next/headers";

import bcrypt from "bcryptjs";

import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { PARTNER_STATUS } from "@/lib/partner/status";
import { clientIp, RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { leadSchema, type LeadValues } from "@/lib/schemas/lead";
import { applyTransition } from "@/lib/services/transition";

/* ===========================================================================
   The public inquiry.

   Creates the account and the lead, then hands the opening transition to the
   state machine so the confirmation email, the reviewer's email and the admin
   notification all come from the same table that drives every other stage.
   The previous version wrote its own StatusHistory row and sent nothing —
   there was a comment admitting as much.

   The client validated with this same schema. This re-parses because a server
   action is a public HTTP endpoint: anything a browser can post, curl can
   post. The client copy is for the typing experience; this one is the gate.
   ========================================================================= */

export type LeadResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
};

export async function submitInquiry(input: LeadValues): Promise<LeadResult> {
  const parsed = leadSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] ??= issue.message;
    }
    return { ok: false, message: "Some fields need attention.", fieldErrors };
  }

  const data = parsed.data;

  /* The honeypot carried a value, so this is a bot. Answer exactly as success
     would, so it learns nothing and stops retrying — and write nothing. */
  if (data.nickname) {
    return { ok: true, message: "Thank you — we have your inquiry." };
  }

  const limit = rateLimit(`register:${clientIp(headers())}`, RATE_LIMITS.register);
  if (!limit.ok) {
    return {
      ok: false,
      message: "Too many attempts from this connection. Please try again later, or call us.",
    };
  }

  const email = data.email;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return {
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: { email: "An account already exists for this email address. Sign in instead." },
    };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const contactName = `${data.firstName} ${data.lastName}`.trim();

  let partnerId: string;

  try {
    partnerId = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: contactName, role: "PARTNER", passwordHash },
      });

      const partner = await tx.partner.create({
        data: {
          userId: user.id,
          companyName: data.practiceName,
          businessType: "SMALL_PHARMACY",
          contactName,
          phone: data.phone,
          status: PARTNER_STATUS.APPLICATION_SUBMITTED,
        },
      });

      await tx.partnerApplication.create({
        data: {
          partnerId: partner.id,
          /* accountType stays null: nobody inquiring about pricing has a view
             yet on whether they are opening a new account or linking one. The
             portal form asks, once there is something to decide about. */
          practiceName: data.practiceName,
          practiceAddress: data.street || null,
          practiceCity: data.city || null,
          practiceState: data.state || null,
          practiceZip: data.zip || null,
          practicePhone: data.phone,
          officeContactName: contactName,
          officeContactEmail: email,
          officeContactPhone: data.phone,
          contactRole: data.role,
          orgType: data.orgType,
          website: data.website || null,
          medicationsOfInterest: data.medications || null,
          interestNotes: data.notes || null,
          howDidYouHearAboutUs: data.referral || null,
        },
      });

      return partner.id;
    });
  } catch (error) {
    console.error("[inquiry] failed", error);
    return {
      ok: false,
      message: "We could not save your inquiry. Please try again, or call us.",
    };
  }

  /* Outside the transaction on purpose. The account exists and is theirs; if
     queueing the mail fails, the right outcome is a partner who is signed in
     with a reviewer who has to find them manually — not a rolled-back
     registration and a password they now believe they have. */
  try {
    await applyTransition({
      partnerId,
      to: PARTNER_STATUS.APPLICATION_SUBMITTED,
      actor: "PARTNER",
      actorEmail: email,
      actorRole: "PARTNER",
      initial: true,
      note: "Inquiry submitted.",
    });
  } catch (error) {
    console.error("[inquiry] opening transition failed", error);
  }

  /* Sign them in. They chose a password fifteen seconds ago; a login wall now
     is a wall for its own sake. `redirect: false` keeps signIn from throwing
     its own redirect so the cookie is set here and the destination is ours. */
  try {
    await signIn("credentials", { email, password: data.password, redirect: false });
  } catch (error) {
    console.error("[inquiry] auto sign-in failed", error);
    return {
      ok: true,
      message: "Thank you — we have your inquiry. Please sign in to track its progress.",
      redirectTo: "/login",
    };
  }

  return {
    ok: true,
    message: "Thank you — we have your inquiry. Taking you to your portal…",
    redirectTo: "/portal?welcome=1",
  };
}
