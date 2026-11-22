"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/guard";
import { recordAudit } from "@/lib/services/audit";
import { openInquiry, setInquiryStatus } from "@/lib/services/inquiries";
import { driverFor, type StorageDriverName } from "@/lib/services/storage";

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

/** A short-lived link to the resume attached to a careers application. */
export async function inquiryResumeUrl(id: string) {
  const session = await requireAdmin();
  const inquiry = await openInquiry(id);
  const resume = inquiry?.payload.resume as
    | { name?: string; key?: string; driver?: StorageDriverName }
    | undefined;

  /* Applications sent before resumes were stored carry the file's name and
     size but no key: there is nothing to open. */
  if (!resume?.key) {
    return { ok: false as const, message: "This resume was not saved. Ask the applicant to send it again." };
  }

  await recordAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "inquiry.resume.read",
    entityType: "SiteInquiry",
    entityId: id,
    metadata: { filename: resume.name ?? null },
  });

  const url = await driverFor(resume.driver ?? "S3").presignDownload(resume.key, resume.name);
  return { ok: true as const, url };
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
