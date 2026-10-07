/* ===========================================================================
   The CRM pipeline map.

   Tags tell sales what happened; the pipeline tells them where everyone is,
   on a board they can drag. GoHighLevel workflows could move the cards off
   the tags, but a "Tag Added" trigger fires only the first time a contact
   gains a tag — and event tags are never removed — so a second pricing round
   or a re-sent MSA would never move anything. Moving the opportunity from the
   same worker that sends the tags has no such hole: every transition moves it.

   KEYED BY LABEL, LIKE THE TAGS. The parity test fails if a transition exists
   with no entry here, so a new edge cannot silently stop moving the board.

   BY NAME, NOT BY ID. Pipeline and stage ids belong to one GHL sub-account;
   names are what an operator sees and builds. The worker resolves them once
   and caches the ids. Renaming a stage in GHL therefore needs the matching
   rename here — the worker logs exactly which name it could not find.

   Plain data and pure functions, with no env read: the parity test imports
   this module.
   ========================================================================= */

export const PIPELINE_NAMES = {
  partner: "Partner Registration",
  contact: "Contact Us",
} as const;

/** The Partner Registration stages, exactly as named in GoHighLevel. */
export const PARTNER_STAGE = {
  applied: "Applied – Awaiting ID",
  identityReview: "Identity Review",
  formularySent: "Formulary Sent",
  negotiationRequested: "Negotiation Requested",
  pricingSent: "Negotiated Pricing Sent",
  accountDetails: "Account Details",
  onboardingReview: "Onboarding Review",
  msaSent: "MSA Sent",
  msaSigned: "MSA Signed",
  verified: "Verified partner",
} as const;

export const CONTACT_STAGE = {
  newInquiry: "New Inquiry",
} as const;

export type OpportunityStatus = "open" | "won" | "lost" | "abandoned";

/** What an SMS template is given. */
export type SmsContext = { firstName: string; portalUrl: string };

const SIGN_OFF = " – MediCraft Pharmacy";

export type PipelineMove =
  /** Put the card in this stage. Status defaults to open. */
  | {
      stage: (typeof PARTNER_STAGE)[keyof typeof PARTNER_STAGE];
      status?: "open" | "won";
      sms?: (c: SmsContext) => string;
    }
  /**
   * Close the card where it already stands. A rejection can arrive from more
   * than one stage, so naming a stage would put the card somewhere it never was.
   */
  | { closeAs: "lost" | "abandoned" };

const hi = (c: SmsContext) => (c.firstName ? `Hi ${c.firstName}, ` : "Hi, ");

/**
 * One entry per transition label. `null` means the transition deliberately
 * leaves the board alone — it still gets its tag.
 */
export const PIPELINE_MOVE_BY_LABEL: Record<string, PipelineMove | null> = {
  // ---- Application ----
  "Application submitted": {
    stage: PARTNER_STAGE.applied,
    sms: (c) =>
      `${hi(c)}thanks for applying to partner with MediCraft. Next step: confirm your identity in the portal: ${c.portalUrl}${SIGN_OFF}`,
  },
  "Identity changes requested": {
    stage: PARTNER_STAGE.applied,
    sms: (c) =>
      `${hi(c)}we need a few changes to your ID details before we can continue. Please check the portal: ${c.portalUrl}${SIGN_OFF}`,
  },
  "Identity submitted": {
    stage: PARTNER_STAGE.identityReview,
    sms: (c) =>
      `${hi(c)}we've received your ID and are reviewing it, usually within one business day. Nothing needed from you.${SIGN_OFF}`,
  },
  "Identity verified — send the formulary": {
    stage: PARTNER_STAGE.formularySent,
    sms: (c) =>
      `${hi(c)}you're verified. Your formulary and pricing are ready to review: ${c.portalUrl}${SIGN_OFF}`,
  },

  // ---- Pricing ----
  "Meeting requested": {
    stage: PARTNER_STAGE.negotiationRequested,
    sms: (c) =>
      `${hi(c)}we've got your request for a pricing call. We'll be in touch to set a time.${SIGN_OFF}`,
  },
  // An admin recorded a time, perhaps agreed on the phone.
  "Meeting scheduled": {
    stage: PARTNER_STAGE.negotiationRequested,
    sms: (c) =>
      `${hi(c)}your pricing call is booked. The details are in your portal: ${c.portalUrl}${SIGN_OFF}`,
  },
  // They picked it themselves and saw it confirmed on screen.
  "Applicant picked a time": { stage: PARTNER_STAGE.negotiationRequested },
  "Another pricing round requested": {
    stage: PARTNER_STAGE.negotiationRequested,
    sms: (c) => `${hi(c)}thanks, we're preparing another round of pricing for you.${SIGN_OFF}`,
  },
  "Negotiated pricing sent": {
    stage: PARTNER_STAGE.pricingSent,
    sms: (c) =>
      `${hi(c)}your updated pricing is ready to review and accept: ${c.portalUrl}${SIGN_OFF}`,
  },
  "Revised pricing sent": {
    stage: PARTNER_STAGE.pricingSent,
    sms: (c) =>
      `${hi(c)}your revised pricing is ready to review and accept: ${c.portalUrl}${SIGN_OFF}`,
  },

  // ---- Onboarding ----
  "List pricing accepted without negotiation": {
    stage: PARTNER_STAGE.accountDetails,
    sms: (c) =>
      `${hi(c)}your pricing is locked in. Next: add your prescribers and practice details: ${c.portalUrl}${SIGN_OFF}`,
  },
  "Negotiated pricing accepted": {
    stage: PARTNER_STAGE.accountDetails,
    sms: (c) =>
      `${hi(c)}your pricing is locked in. Next: add your prescribers and practice details: ${c.portalUrl}${SIGN_OFF}`,
  },
  // Follows an acceptance within the same flow — a second text would be noise.
  "Onboarding started": { stage: PARTNER_STAGE.accountDetails },
  "Account details completed": {
    stage: PARTNER_STAGE.accountDetails,
    sms: (c) =>
      `${hi(c)}account details saved. Last step before review: upload your licences and photo ID: ${c.portalUrl}${SIGN_OFF}`,
  },
  "Onboarding changes requested": {
    stage: PARTNER_STAGE.accountDetails,
    sms: (c) =>
      `${hi(c)}we need a few corrections to your onboarding details or documents. Please check the portal: ${c.portalUrl}${SIGN_OFF}`,
  },
  "Documents submitted": {
    stage: PARTNER_STAGE.onboardingReview,
    sms: (c) => `${hi(c)}we've received your documents and are reviewing them now.${SIGN_OFF}`,
  },
  "Onboarding resubmitted": {
    stage: PARTNER_STAGE.onboardingReview,
    sms: (c) => `${hi(c)}thanks for the corrections. We're reviewing them now.${SIGN_OFF}`,
  },

  // ---- Agreement ----
  // The MSA is sent straight after approval; that transition carries the text.
  "Onboarding approved": { stage: PARTNER_STAGE.msaSent },
  "MSA sent": {
    stage: PARTNER_STAGE.msaSent,
    sms: (c) =>
      `${hi(c)}you're approved! Your Master Service Agreement is ready to sign: ${c.portalUrl}${SIGN_OFF}`,
  },
  "MSA re-sent after decline": {
    stage: PARTNER_STAGE.msaSent,
    sms: (c) =>
      `${hi(c)}we've sent your Master Service Agreement again. It's ready to sign: ${c.portalUrl}${SIGN_OFF}`,
  },
  "MSA signed": {
    stage: PARTNER_STAGE.msaSigned,
    sms: (c) => `${hi(c)}thanks for signing. We're activating your account now.${SIGN_OFF}`,
  },
  "Partner verified": {
    stage: PARTNER_STAGE.verified,
    status: "won",
    sms: (c) =>
      `${hi(c)}welcome aboard! Your MediCraft partner account is live and your pricing is in force: ${c.portalUrl}${SIGN_OFF}`,
  },

  // ---- Side outcomes: closed where they stand, no text (the email says it) ----
  "Application rejected": { closeAs: "lost" },
  "Partner suspended": { closeAs: "lost" },
  "MSA declined": { closeAs: "abandoned" },
  "Partner reactivated": {
    stage: PARTNER_STAGE.verified,
    status: "won",
    sms: (c) =>
      `${hi(c)}your MediCraft partner account is active again: ${c.portalUrl}${SIGN_OFF}`,
  },

  // The envelope is replaced; the partner is still in MSA Sent.
  "MSA envelope voided": null,
};

export const contactInquirySms = (c: Pick<SmsContext, "firstName">) =>
  `${c.firstName ? `Hi ${c.firstName}, t` : "T"}hanks for contacting MediCraft Pharmacy. We'll be in touch within one business day.`;

/** Names compared loosely: case, spacing and dash style are not meaningful. */
export function sameName(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[‒-―\-]/g, "-").replace(/\s+/g, " ").trim();
  return norm(a) === norm(b);
}

/** Fails if a transition has no pipeline entry, or an entry has no transition. */
export function assertPipelineCoverage(labels: string[]): void {
  const missing = labels.filter((label) => !(label in PIPELINE_MOVE_BY_LABEL));
  if (missing.length) {
    throw new Error(
      `Transitions with no pipeline move: ${missing.join(", ")}. Add them to PIPELINE_MOVE_BY_LABEL (null to leave the board alone).`
    );
  }
  const stray = Object.keys(PIPELINE_MOVE_BY_LABEL).filter((label) => !labels.includes(label));
  if (stray.length) {
    throw new Error(`Pipeline moves for transitions that no longer exist: ${stray.join(", ")}`);
  }
}
