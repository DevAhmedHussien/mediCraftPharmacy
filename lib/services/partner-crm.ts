import "server-only";

import { db } from "@/lib/db";
import {
  eventTagFor,
  SOURCE_TAGS,
  stageTagFor,
  stageTagsToRemove,
} from "@/lib/partner/ghl-tags";
import type { PartnerStatus } from "@/lib/partner/status";
import { movePartnerOpportunity } from "@/lib/services/crm-pipeline";
import {
  addGhlTags,
  ghlConfigured,
  removeGhlTags,
  updateGhlContact,
  upsertGhlContact,
} from "@/lib/services/ghl";

/* ===========================================================================
   Mirroring the partner pipeline into GoHighLevel.

   Called from `applyTransition` once the database transaction has committed,
   which is the only place a partner's status is allowed to change. Hooking in
   there rather than at each call site means a transition added later is synced
   without anyone remembering to wire it up.

   AFTER THE COMMIT, NOT INSIDE IT
   -------------------------------
   An HTTP call has no business inside a database transaction: it would hold
   row locks open for the length of a third-party round trip, and a GHL timeout
   would roll back a status change that genuinely happened. The status is the
   source of truth; the CRM is a mirror of it.

   EVERY FAILURE IS SWALLOWED
   --------------------------
   A partner being unable to submit their documents because LeadConnector is
   having an afternoon is not a trade anyone would make. Failures are logged
   with GHL's own reason and nothing of the person's, and the next transition
   will re-upsert anyway — so a missed sync is self-healing rather than
   permanent.
   ========================================================================= */

/**
 * Does this failure mean the contact we remember no longer exists?
 *
 * GoHighLevel answers a tag call on a deleted or merged contact with a 400 or
 * 404 whose body names the id. Treating that as "retry later" would be wrong:
 * the id is dead and will never work again, so the stored one has to be thrown
 * away and the contact recreated.
 */
function isMissingContact(reason: string): boolean {
  return /contact not found/i.test(reason) || /HTTP 40[04]\b/.test(reason);
}

/**
 * Set the partner's phone number, if this GoHighLevel location will take it.
 *
 * Phone is set here rather than in the upsert so that it can never become the
 * key identity matches on — see `updateGhlContact`. The consequence is that
 * when a location has "do not allow duplicated contacts" enabled, as this one
 * does, GHL refuses the number outright if another contact already holds it:
 * two prescribers sharing a practice switchboard, which is ordinary.
 *
 * That refusal is an expected outcome, not a fault. The contact is already
 * correct on the things that matter — email, practice, and the full tag trail
 * — so this records what happened and moves on rather than retrying or
 * surfacing an error the operator cannot act on.
 */
async function setPhoneIfAllowed(
  contactId: string,
  phone: string | null | undefined,
  partnerId: string
): Promise<void> {
  if (!phone) return;

  const result = await updateGhlContact(contactId, { phone });
  if (result.ok) return;

  if (/duplicated contacts/i.test(result.reason)) {
    console.info(
      `[crm] partner ${partnerId}: phone not set — another contact in this GHL location already holds it`
    );
    return;
  }
  console.error(`[crm] partner ${partnerId}: could not set phone — ${result.reason}`);
}

type SyncInput = {
  partnerId: string;
  /** The transition's label — the key the tag map is built on. */
  label: string;
  /** The status the partner has just moved into. */
  status: PartnerStatus;
};

/**
 * Push one transition to the CRM.
 *
 * Returns an error string on failure so the worker can decide whether to
 * retry; never throws.
 */
export async function syncPartnerToCrm({
  partnerId,
  label,
  status,
}: SyncInput): Promise<string | null> {
  if (!ghlConfigured) return null;

  const eventTag = eventTagFor(label);
  if (!eventTag) {
    // A gap in the map, not a transport failure — retrying cannot fix it.
    return null;
  }

  try {
    const partner = await db.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        phone: true,
        ghlContactId: true,
        user: { select: { email: true } },
      },
    });
    if (!partner) return null;

    const stageTag = stageTagFor(status);
    let contactId = partner.ghlContactId;

    /* First sync for this partner: upsert on their signup email so an existing
       contact — someone who used the contact form months ago — gains the
       partner tags rather than becoming a second record. */
    if (!contactId) {
      const [firstName, ...rest] = (partner.contactName ?? "").trim().split(/\s+/);

      const result = await upsertGhlContact({
        firstName: firstName || undefined,
        lastName: rest.join(" ") || undefined,
        email: partner.user.email,
        companyName: partner.companyName,
        source: "Provider application",
        tags: [SOURCE_TAGS.partnerApplication, eventTag, stageTag],
      });

      if (!result.ok) return result.reason;
      if (result.skipped) return null;

      contactId = result.contactId;
      await db.partner.update({ where: { id: partnerId }, data: { ghlContactId: contactId } });

      await setPhoneIfAllowed(contactId, partner.phone, partnerId);
    } else {
      const added = await addGhlTags(contactId, [eventTag, stageTag]);

      if (!added.ok && isMissingContact(added.reason)) {
        /* The contact was deleted or merged in GoHighLevel. Without this the
           stored id would keep failing forever and the partner would silently
           stop syncing — so forget it and build a fresh contact from the
           partner we still hold. */
        console.info(`[crm] partner ${partnerId}: stored contact gone, recreating`);
        await db.partner.update({ where: { id: partnerId }, data: { ghlContactId: null } });

        const [firstName, ...rest] = (partner.contactName ?? "").trim().split(/\s+/);
        const rebuilt = await upsertGhlContact({
          firstName: firstName || undefined,
          lastName: rest.join(" ") || undefined,
          email: partner.user.email,
          companyName: partner.companyName,
          source: "Provider application",
          tags: [SOURCE_TAGS.partnerApplication, eventTag, stageTag],
        });

        if (!rebuilt.ok) return rebuilt.reason;
        if (rebuilt.skipped) return null;

        contactId = rebuilt.contactId;
        await db.partner.update({ where: { id: partnerId }, data: { ghlContactId: contactId } });
        await setPhoneIfAllowed(contactId, partner.phone, partnerId);
      } else if (!added.ok) {
        return added.reason;
      }
    }

    /* Retire the stage tags they have moved past, so exactly one `stage_*`
       survives and a GHL smart list can answer "who is here now". */
    const stale = stageTagsToRemove(stageTag);
    const removed = await removeGhlTags(contactId, stale);
    if (!removed.ok) return removed.reason;

    /* Last, because its own tail — the note and the text — must not repeat on
       a retry. Everything above is safe to run twice. */
    return await movePartnerOpportunity({
      partnerId,
      contactId,
      label,
      companyName: partner.companyName,
      contactName: partner.contactName,
      hasPhone: Boolean(partner.phone),
    });
  } catch (error) {
    return (error as Error)?.message ?? "unknown error";
  }
}

/* --- The worker ---------------------------------------------------------- */

/** How many times a sync is retried before it is parked as FAILED. */
const MAX_ATTEMPTS = 5;
/** Rows per drain. Small, so one slow CRM cannot stall the whole cron run. */
const BATCH = 20;

/**
 * Deliver queued CRM mirrors.
 *
 * Drained by the same scheduled job as the email outbox. Rows are retried with
 * exponential backoff and parked after MAX_ATTEMPTS, so a CRM outage delays
 * the mirror rather than losing it — which is the whole reason the queue
 * exists rather than an inline call.
 */
export async function processCrmOutbox(): Promise<{ sent: number; failed: number }> {
  if (!ghlConfigured) return { sent: 0, failed: 0 };

  const due = await db.crmOutbox.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  let sent = 0;
  let failed = 0;

  for (const row of due) {
    const error = await syncPartnerToCrm({
      partnerId: row.partnerId,
      label: row.label,
      status: row.toStatus,
    });

    if (!error) {
      await db.crmOutbox.update({
        where: { id: row.id },
        data: { status: "SENT", processedAt: new Date(), attempts: { increment: 1 } },
      });
      sent += 1;
      continue;
    }

    const attempts = row.attempts + 1;
    const exhausted = attempts >= MAX_ATTEMPTS;
    // 1, 2, 4, 8 minutes — long enough to outlast a brief CRM outage.
    const backoffMs = 60_000 * 2 ** (attempts - 1);

    await db.crmOutbox.update({
      where: { id: row.id },
      data: {
        status: exhausted ? "FAILED" : "PENDING",
        attempts,
        lastError: error.slice(0, 500),
        nextAttemptAt: new Date(Date.now() + backoffMs),
        ...(exhausted ? { processedAt: new Date() } : {}),
      },
    });
    failed += 1;
  }

  return { sent, failed };
}
