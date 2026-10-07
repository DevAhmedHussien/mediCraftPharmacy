import "server-only";

import type { SiteInquiryKind } from "@prisma/client";

import { db } from "@/lib/db";
import { site } from "@/lib/site";

/* ===========================================================================
   Telling staff a form was submitted, without telling them what it said.

   The notification is not the submission. A refill names a patient and their
   medication; putting that in an email makes every inbox it touches part of
   the PHI footprint, and the partner pipeline already follows the rule that an
   email carries a name, a status and a link and nothing else.

   So this enqueues a message that says which kind of form arrived and where to
   read it, and the content stays sealed in the database until a signed-in
   member of staff opens that one record.
   ========================================================================= */

const SUBJECTS: Record<SiteInquiryKind, { subject: string; body: string }> = {
  REFILL: {
    subject: "A patient refill request arrived",
    body: "A refill request is waiting in the admin. The details are protected health information and are not included here — open the record to read them.",
  },
  CONTACT: {
    subject: "A website inquiry arrived",
    body: "Someone used the contact form on the website.",
  },
  CAREER: {
    subject: "A job application arrived",
    body: "Someone applied through the careers page.",
  },
};

/**
 * Queue the heads-up.
 *
 * Goes through EmailOutbox like everything else, so a provider outage retries
 * with backoff instead of losing the alert — and a failure here never rolls
 * back the submission, which is already safely stored by the time this runs.
 */
export async function notifyStaffOfInquiry(inquiryId: string, kind: SiteInquiryKind) {
  const copy = SUBJECTS[kind];
  const link = `${site.url}/admin/inquiries?open=${inquiryId}`;

  const recipients = await db.user.findMany({
    where: { isActive: true, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { email: true },
  });

  if (recipients.length === 0) return;

  await db.emailOutbox.createMany({
    data: recipients.map((recipient) => ({
      // No historyId — this is not a pipeline transition. The inquiry id plus
      // the recipient is the natural key, and it keeps a retry idempotent.
      idempotencyKey: `inquiry:${inquiryId}:${recipient.email}`,
      template: "admin/site-inquiry",
      to: recipient.email,
      props: { kind, subject: copy.subject, body: copy.body, link },
    })),
    skipDuplicates: true,
  });

  /* And send it now, rather than within five minutes.
   *
   * Same reasoning as applyTransition: the row is the durability guarantee
   * and the cron is the retry, but a staff alert about a patient asking a
   * question is worth little if it arrives after the question has gone cold.
   * Not awaited — the visitor is waiting on a form response, not on our mail
   * host. The fuller note is in lib/services/transition.ts. */
  void import("@/lib/services/email")
    .then(({ processOutbox }) => processOutbox())
    .catch(() => {
      /* The cron retries it. A failure here must never surface to the
         visitor, whose submission is already stored. */
    });
}
