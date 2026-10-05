"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/guard";
import { recordAudit } from "@/lib/services/audit";
import { openInquiry, setInquiryStatus } from "@/lib/services/inquiries";

/* Reading and triaging a public-form submission.

   Opening one is audited. These contain protected health information, and an
   access log that only records writes answers the wrong question — "who read
   this patient's refill request" is the one that gets asked. */

export async function readInquiry(id: string) {
  const session = await requireAdmin();
  const inquiry = await openInquiry(id);
  if (!inquiry) return { ok: false as const, message: "That submission no longer exists." };

  if (inquiry.isPhi) {
    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email ?? null,
      action: "inquiry.read",
      entityType: "SiteInquiry",
      entityId: id,
      // The metadata says a PHI record was opened, not what was in it.
      metadata: { kind: inquiry.kind, phi: true },
    });
  }

  return { ok: true as const, inquiry };
}

export async function triageInquiry(id: string, status: "NEW" | "HANDLED" | "SPAM") {
  const session = await requireAdmin();
  await setInquiryStatus(id, status, session.user.id);

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: `inquiry.${status.toLowerCase()}`,
    entityType: "SiteInquiry",
    entityId: id,
    metadata: {},
  });

  revalidatePath("/admin/inquiries");
  return { ok: true as const };
}
