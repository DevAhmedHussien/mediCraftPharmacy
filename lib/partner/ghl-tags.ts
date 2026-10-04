import { PROGRESS_STEPS, progressStep, type ProgressStep } from "@/lib/partner/status";

/* ===========================================================================
   The CRM vocabulary.

   Two kinds of tag, doing two different jobs:

   EVENT TAGS accumulate. One per transition, never removed, so a contact in
   GoHighLevel carries the whole story: applied, identity verified, pricing
   sent, another round requested, approved, signed. This is the history sales
   reads before picking up the phone.

   STAGE TAGS are a pointer. Exactly one `stage_*` is on a contact at any time
   and the previous one is removed as they move, so a GHL smart list can ask
   "who is sitting in pricing right now" — a question the event trail cannot
   answer, because it only records that someone *reached* a step, never that
   they left it.

   KEYED BY LABEL, DELIBERATELY. The label is already the audit log's `action`
   and is unique across all 26 transitions. Keying on it means the tag map and
   the transition table cannot drift apart silently: `assertTagCoverage` below
   fails the test suite the moment a transition exists without a tag.

   Lowercase snake_case throughout — GoHighLevel normalises tags to lowercase,
   so anything else would come back looking different from what we sent.
   ========================================================================= */

/**
 * Where a contact came from. Applied once, on the creation edge.
 *
 * Plain constants, with no `process.env` read: this module is imported by the
 * parity test, which must not drag server-only validated env in behind it. The
 * contact form's tag is overridable at the call site via `GHL_CONTACT_TAG`;
 * this is the default that variable defaults to.
 */
export const SOURCE_TAGS = {
  contactForm: "contact_us_form",
  partnerApplication: "partner_application",
} as const;

/** One tag per transition, keyed by the transition's own label. */
export const EVENT_TAG_BY_LABEL: Record<string, string> = {
  // ---- Partner moves ----
  "Application submitted": "partner_applied",
  "Identity submitted": "partner_identity_submitted",
  "Meeting requested": "partner_meeting_requested",
  "Applicant picked a time": "partner_meeting_booked",
  "List pricing accepted without negotiation": "partner_accepted_list_pricing",
  "Negotiated pricing accepted": "partner_accepted_negotiated_pricing",
  "Another pricing round requested": "partner_requested_new_pricing_round",
  "Account details completed": "partner_account_details_done",
  "Documents submitted": "partner_documents_submitted",
  "Onboarding resubmitted": "partner_onboarding_resubmitted",

  // ---- Admin decisions, approvals and refusals alike ----
  "Identity verified — send the formulary": "admin_identity_verified",
  "Identity changes requested": "admin_identity_changes_requested",
  "Meeting scheduled": "admin_meeting_scheduled",
  "Negotiated pricing sent": "admin_pricing_sent",
  "Revised pricing sent": "admin_pricing_revised",
  "Onboarding approved": "admin_onboarding_approved",
  "Onboarding changes requested": "admin_onboarding_changes_requested",
  "MSA sent": "admin_msa_sent",
  "MSA re-sent after decline": "admin_msa_resent",
  "Application rejected": "admin_application_rejected",
  "Partner suspended": "admin_partner_suspended",
  "Partner reactivated": "admin_partner_reactivated",

  // ---- System ----
  "Onboarding started": "system_onboarding_started",
  "MSA signed": "partner_msa_signed",
  "Partner verified": "partner_verified",
  "MSA declined": "partner_msa_declined",
  "MSA envelope voided": "system_msa_voided",
};

/**
 * Formulary change orders.
 *
 * A separate map because these are not status transitions. An amendment runs
 * its own small lifecycle against a partner who is already ACTIVE and whose
 * `status` never moves, so these labels are deliberately absent from the
 * transition table — and `assertTagCoverage` would otherwise flag every one of
 * them as a tag for a transition that does not exist.
 *
 * They still belong in the CRM: the brief asks for *every* action between a
 * partner and an admin to be tagged, and "asked to add six preparations" is
 * exactly the kind of thing sales wants to see before calling.
 *
 * These are event tags — they accumulate and are never removed. The stage
 * pointer is untouched, because an amendment does not move the partner
 * anywhere.
 */
export const AMENDMENT_TAG_BY_LABEL: Record<string, string> = {
  // ---- Partner moves ----
  "Formulary change requested": "partner_formulary_change_requested",
  "Formulary change round requested": "partner_formulary_change_round_requested",
  "Formulary change call requested": "partner_formulary_change_call_requested",
  "Formulary change call booked": "partner_formulary_change_call_booked",
  "Formulary change pricing accepted": "partner_formulary_change_accepted",
  "Formulary change signed": "partner_formulary_change_signed",

  // ---- Admin decisions, approvals and refusals alike ----
  "Formulary change under review": "admin_formulary_change_under_review",
  "Formulary change pricing sent": "admin_formulary_change_pricing_sent",
  "Formulary change edits requested": "admin_formulary_change_edits_requested",
  "Formulary change order sent": "admin_formulary_change_order_sent",
  "Formulary change declined": "admin_formulary_change_declined",
};

/** The mutually exclusive stage pointer, one per progress step. */
export const STAGE_TAG_BY_STEP: Record<ProgressStep, string> = {
  Application: "stage_application",
  Pricing: "stage_pricing",
  Onboarding: "stage_onboarding",
  Agreement: "stage_agreement",
  Verified: "stage_verified",
};

/** Every stage tag, so the others can be removed when one is applied. */
export const ALL_STAGE_TAGS: string[] = PROGRESS_STEPS.map((s) => STAGE_TAG_BY_STEP[s]);

export function eventTagFor(label: string): string | undefined {
  return EVENT_TAG_BY_LABEL[label] ?? AMENDMENT_TAG_BY_LABEL[label];
}

export function stageTagFor(status: Parameters<typeof progressStep>[0]): string {
  return STAGE_TAG_BY_STEP[progressStep(status)];
}

/**
 * Which stage tags must come off when this one goes on.
 *
 * GoHighLevel's upsert merges tags and never removes them, so without this a
 * contact would end up carrying every stage they have ever been in and the
 * pointer would mean nothing.
 */
export function stageTagsToRemove(keep: string): string[] {
  return ALL_STAGE_TAGS.filter((tag) => tag !== keep);
}

/**
 * Fails if any transition has no tag, or any tag is used twice.
 *
 * Called from the test suite. A new transition added to status.ts without a
 * tag here would otherwise just stop syncing, silently, for that one edge.
 */
export function assertTagCoverage(labels: string[]): void {
  const missing = labels.filter((label) => !EVENT_TAG_BY_LABEL[label]);
  if (missing.length) {
    throw new Error(
      `Transitions with no GHL tag: ${missing.join(", ")}. Add them to EVENT_TAG_BY_LABEL.`
    );
  }

  /* Across both maps: an amendment tag colliding with a transition tag would
     make a GHL smart list silently wrong, and nothing else would catch it. */
  const used = [
    ...Object.values(EVENT_TAG_BY_LABEL),
    ...Object.values(AMENDMENT_TAG_BY_LABEL),
  ];
  const duplicated = used.filter((tag, i) => used.indexOf(tag) !== i);
  if (duplicated.length) {
    throw new Error(`The same GHL tag is used twice: ${[...new Set(duplicated)].join(", ")}`);
  }

  const stray = Object.keys(EVENT_TAG_BY_LABEL).filter((label) => !labels.includes(label));
  if (stray.length) {
    throw new Error(`Tags for transitions that no longer exist: ${stray.join(", ")}`);
  }
}
