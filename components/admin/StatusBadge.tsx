import { Pill, type Tone } from "@/components/admin/ui";

/* ===========================================================================
   One badge, one vocabulary, every status in the system.

   WHAT THIS REPLACES
   ------------------
   Nine files rendered a status with `status.replace(/_/g, " ").toLowerCase()`
   and six of them carried their own `Record<string, Tone>` beside it. The
   same partner status therefore appeared as "onboarding submitted" in amber
   on one screen and "onboarding submitted" in grey on another, and a new
   status needed seven edits before every screen agreed about it. A status
   that looks different in two places is a status people stop trusting.

   So: one map, one component, every screen. Adding a status is one line here.

   TWO THINGS EVERY ENTRY CARRIES
   ------------------------------
   A TONE, from a fixed semantic set — the same six a dashboard has always
   used: neutral (nothing is happening), info (in motion, ours), warn (someone
   is waiting), good (done), bad (stopped). A status is never assigned a
   colour for looking nice; it is assigned the colour of what it means.

   A LABEL IN PROSE. `ONBOARDING_CHANGES_REQUESTED` de-underscored reads
   "onboarding changes requested", which is a database column read aloud.
   "Corrections asked for" is the same fact in the reader's language, and the
   label is deliberately written from the ADMIN's side — this is their
   console. The portal passes its own labels where the partner's side of the
   same fact differs.
   ========================================================================= */

type Entry = { label: string; tone: Tone };

/** Where a partner is in the pipeline. */
const PARTNER: Record<string, Entry> = {
  APPLICATION_SUBMITTED: { label: "Application in", tone: "info" },
  IDENTITY_SUBMITTED: { label: "ID to check", tone: "warn" },
  PRODUCT_LIST_SENT: { label: "Formulary sent", tone: "info" },
  MEETING_REQUESTED: { label: "Call asked for", tone: "warn" },
  PRICING_MEETING: { label: "Call booked", tone: "info" },
  PRICING_SUBMITTED: { label: "Price list in", tone: "warn" },
  PRICING_CHANGES_REQUESTED: { label: "Another round asked for", tone: "warn" },
  NEGOTIATED_PRICING_SENT: { label: "Pricing with them", tone: "info" },
  PRICING_ADMIN_APPROVED: { label: "Pricing approved", tone: "info" },
  PRICING_PARTNER_ACCEPTED: { label: "Prices agreed", tone: "warn" },
  ONBOARDING_IN_PROGRESS: { label: "Filling in details", tone: "info" },
  DOCUMENTS_PENDING: { label: "Documents due", tone: "info" },
  ONBOARDING_SUBMITTED: { label: "Details to review", tone: "warn" },
  ONBOARDING_CHANGES_REQUESTED: { label: "Corrections asked for", tone: "info" },
  ONBOARDING_APPROVED: { label: "Details approved", tone: "info" },
  MSA_SENT: { label: "Agreement out", tone: "info" },
  MSA_SIGNED: { label: "Signed — verify them", tone: "warn" },
  VERIFIED: { label: "Verified", tone: "good" },
  REJECTED: { label: "Rejected", tone: "bad" },
  MSA_DECLINED: { label: "Agreement declined", tone: "bad" },
  SUSPENDED: { label: "Suspended", tone: "bad" },
};

/** Where a formulary change order is. */
const AMENDMENT: Record<string, Entry> = {
  REQUESTED: { label: "Needs pricing", tone: "warn" },
  UNDER_REVIEW: { label: "Being priced", tone: "info" },
  PRICING_SENT: { label: "With the partner", tone: "info" },
  CHANGES_REQUESTED: { label: "Another round asked for", tone: "warn" },
  MEETING_REQUESTED: { label: "Call asked for", tone: "warn" },
  MEETING_SCHEDULED: { label: "Call booked", tone: "info" },
  ACCEPTED: { label: "Prices agreed", tone: "warn" },
  CHANGE_ORDER_SENT: { label: "Out for signature", tone: "info" },
  SIGNED: { label: "Signed", tone: "good" },
  DECLINED: { label: "Declined", tone: "bad" },
};

/** An uploaded licence or photo ID. */
const DOCUMENT: Record<string, Entry> = {
  PENDING_REVIEW: { label: "To review", tone: "warn" },
  ACCEPTED: { label: "Accepted", tone: "good" },
  REJECTED: { label: "Rejected", tone: "bad" },
};

/** A version of a negotiated price list. */
const PRICE_LIST: Record<string, Entry> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SENT: { label: "With the partner", tone: "info" },
  CHANGES_REQUESTED: { label: "Another round asked for", tone: "warn" },
  ACCEPTED: { label: "Accepted", tone: "good" },
  SUPERSEDED: { label: "Superseded", tone: "neutral" },
};

/** An e-signature envelope. */
const ENVELOPE: Record<string, Entry> = {
  CREATED: { label: "Not sent", tone: "neutral" },
  SENT: { label: "Out for signature", tone: "info" },
  DELIVERED: { label: "Opened", tone: "info" },
  COMPLETED: { label: "Signed", tone: "good" },
  DECLINED: { label: "Declined", tone: "bad" },
  VOIDED: { label: "Voided", tone: "neutral" },
};

const MAPS = {
  partner: PARTNER,
  amendment: AMENDMENT,
  document: DOCUMENT,
  priceList: PRICE_LIST,
  envelope: ENVELOPE,
} as const;

export type StatusKind = keyof typeof MAPS;

/** The label and tone for a status, without rendering anything. */
export function statusEntry(kind: StatusKind, status: string): Entry {
  return (
    MAPS[kind][status] ?? {
      /* An unmapped status is a new enum member nobody has written a label
         for. Shown, de-underscored, in the neutral tone — visible enough that
         it gets noticed, quiet enough that it does not claim to be urgent. */
      label: status.replace(/_/g, " ").toLowerCase(),
      tone: "neutral" as Tone,
    }
  );
}

export function StatusBadge({
  kind,
  status,
  /** Overrides the label where a screen says the same fact differently. */
  label,
}: {
  kind: StatusKind;
  status: string;
  label?: string;
}) {
  const entry = statusEntry(kind, status);
  return <Pill tone={entry.tone}>{label ?? entry.label}</Pill>;
}
