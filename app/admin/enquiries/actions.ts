"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/guard";
import { recordAudit } from "@/lib/services/audit";
import { openEnquiry, setEnquiryStatus } from "@/lib/services/enquiries";

/* Reading and triaging a public-form submission.

   Opening one is audited. These contain protected health information, and an
   access log that only records writes answers the wrong question — "who read
   this patient's refill request" is the one that gets asked. */

export async function readEnquiry(id: string) {
  const session = await requireAdmin();
  const enquiry = await openEnquiry(id);
  if (!enquiry) return { ok: false as const, message: "That submission no longer exists." };

  if (enquiry.isPhi) {
    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email ?? null,
      action: "enquiry.read",
      entityType: "SiteEnquiry",
      entityId: id,
      // The metadata says a PHI record was opened, not what was in it.
      metadata: { kind: enquiry.kind, phi: true },
    });
  }

  return { ok: true as const, enquiry };
}

export async function triageEnquiry(id: string, status: "NEW" | "HANDLED" | "SPAM") {
  const session = await requireAdmin();
  await setEnquiryStatus(id, status, session.user.id);

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: `enquiry.${status.toLowerCase()}`,
    entityType: "SiteEnquiry",
    entityId: id,
    metadata: {},
  });

  revalidatePath("/admin/enquiries");
  return { ok: true as const };
}
