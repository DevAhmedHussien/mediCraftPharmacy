import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";

/* ===========================================================================
   The applicant's step tracker.

   One list, derived from the status, used by the tracker component and by
   every per-step page to decide whether the applicant may be there at all.
   Deriving both from the same table is what stops a page being reachable that
   the tracker draws as locked.

   A step is COMPLETE if the applicant is past it, CURRENT if they are in it,
   and LOCKED otherwise. "Waiting on us" is a property of the current step,
   not a fourth state — the applicant needs to know that the ball is in our
   court, which a greyed-out step cannot say.
   ========================================================================= */

export type StepId =
  | "application"
  | "identity"
  | "review"
  | "pricing"
  | "meeting"
  | "negotiation"
  | "onboarding"
  | "documents"
  | "agreement"
  | "verified";

export type StepState = "complete" | "current" | "locked";

export type Step = {
  id: StepId;
  label: string;
  /** What the applicant does here, or what we are doing. */
  blurb: string;
  /** The route, when the step is reachable. */
  href?: string;
  /**
   * The same step explained to someone who has not applied yet, for the
   * public "how this works" section.
   *
   * It lives here rather than in the marketing copy so the page cannot
   * describe a pipeline the product does not have: adding a step to STEPS
   * forces a sentence for it, and removing one removes it from the site.
   */
  publicDetail: string;
  /** Which third of the journey this belongs to, for the public grouping. */
  phase: "Application" | "Pricing" | "Onboarding";
  /**
   * The step's name on the public page, where it differs.
   *
   * The tracker's own labels are written for someone already inside the
   * portal, where "Pricing" sits under a heading that gives it context. On the
   * marketing page the same word is both the phase and the step, so that one
   * reads as "Formulary" instead. Renaming `label` outright broke the portal
   * tracker, which is what this field exists to avoid.
   */
  publicLabel?: string;
};

export const STEPS: Step[] = [
  {
    id: "application",
    label: "Application",
    blurb: "Your details",
    phase: "Application",
    publicDetail:
      "Tell us who you are and how your practice operates. No licences, no signatures and no card details at this stage.",
  },
  {
    id: "identity",
    label: "Identity",
    blurb: "Who is asking",
    href: "/portal/identity",
    phase: "Application",
    publicDetail:
      "Upload a photo ID and your practice details. We confirm who is asking before any pricing leaves the building.",
  },
  {
    id: "review",
    label: "Review",
    blurb: "We check them",
    phase: "Application",
    publicDetail:
      "We verify your identity against your practice. Usually within one business day — you do not need to chase us.",
  },
  {
    id: "pricing",
    label: "Pricing",
    publicLabel: "Formulary",
    blurb: "Our formulary",
    href: "/portal/pricing",
    phase: "Pricing",
    publicDetail:
      "We open our formulary to you with pricing attached. Filter by category, search by name, and tick the preparations your practice actually dispenses.",
  },
  {
    id: "meeting",
    label: "Negotiation",
    blurb: "Optional call",
    phase: "Pricing",
    publicDetail:
      "Optional. If the rates do not work at your volumes, ask for a call and tell us which lines matter most.",
  },
  {
    id: "negotiation",
    label: "Your prices",
    blurb: "Agreed rates",
    href: "/portal/pricing",
    phase: "Pricing",
    publicDetail:
      "We come back with revised pricing on the medications you selected. Accept it and those rates lock to your account.",
  },
  {
    id: "onboarding",
    label: "Account details",
    blurb: "Prescribers and practice",
    href: "/portal/onboarding",
    phase: "Onboarding",
    publicDetail:
      "The longer form: your prescribers and their DEA and NPI numbers, plus your shipping and billing contacts.",
  },
  {
    id: "documents",
    label: "Documents",
    blurb: "Licences and photo ID",
    href: "/portal/documents",
    phase: "Onboarding",
    publicDetail:
      "Your state licence, DEA registration and photo ID, uploaded straight into the portal rather than emailed around.",
  },
  {
    id: "agreement",
    label: "Agreement",
    blurb: "Sign the MSA",
    href: "/portal/agreement",
    phase: "Onboarding",
    publicDetail:
      "Read and sign the Master Service Agreement, with the price schedule you agreed bound into it as your own Schedule A.",
  },
  {
    id: "verified",
    label: "Verified",
    blurb: "You're a partner",
    href: "/portal/welcome",
    phase: "Onboarding",
    publicDetail:
      "Your account is live and your pricing is in force. Start sending prescriptions.",
  },
];

/** The public steps, grouped into the three phases, numbered continuously. */
export const PUBLIC_PHASES = (["Application", "Pricing", "Onboarding"] as const).map(
  (phase) => ({
    phase,
    steps: STEPS.map((step, index) => ({ ...step, number: index + 1 })).filter(
      (step) => step.phase === phase
    ),
  })
);

/**
 * How far along each status is.
 *
 * The index is the step the applicant is CURRENTLY in. Everything below is
 * complete; everything above is locked. Exhaustive over PartnerStatus, so a
 * new status is a compile error here rather than a blank tracker in
 * production.
 */
const STEP_INDEX: Record<PartnerStatus, number> = {
  // The enquiry is in and the applicant must now say who they are.
  APPLICATION_SUBMITTED: 1,
  IDENTITY_SUBMITTED: 2, // submitted; we are checking who it is
  PRODUCT_LIST_SENT: 3,
  MEETING_REQUESTED: 4,
  PRICING_MEETING: 4,
  NEGOTIATED_PRICING_SENT: 5,
  PRICING_CHANGES_REQUESTED: 5,
  PRICING_PARTNER_ACCEPTED: 6,
  ONBOARDING_IN_PROGRESS: 6,
  DOCUMENTS_PENDING: 7,
  // Sent back for corrections sits on DOCUMENTS, not ACCOUNT DETAILS: both
  // halves reopen, and the tracker should point at the later of the two so
  // the applicant does not think they have lost the work they already did.
  ONBOARDING_CHANGES_REQUESTED: 7,
  ONBOARDING_SUBMITTED: 7,
  ONBOARDING_APPROVED: 8,
  MSA_SENT: 8,
  MSA_SIGNED: 8,
  VERIFIED: 9,

  // Retired statuses — unreachable, but the Record must be total.
  PRICING_SUBMITTED: 5,
  PRICING_ADMIN_APPROVED: 5,

  // Side states sit at the step they stalled in.
  REJECTED: 2,
  MSA_DECLINED: 8,
  SUSPENDED: 9,
};

/** Statuses where nothing is expected of the applicant. */
const WAITING_ON_US: PartnerStatus[] = [
  PARTNER_STATUS.IDENTITY_SUBMITTED,
  PARTNER_STATUS.MEETING_REQUESTED,
  PARTNER_STATUS.PRICING_MEETING,
  PARTNER_STATUS.PRICING_CHANGES_REQUESTED,
  PARTNER_STATUS.ONBOARDING_SUBMITTED,
  PARTNER_STATUS.MSA_SIGNED,
];

export function isWaitingOnUs(status: PartnerStatus): boolean {
  return WAITING_ON_US.includes(status);
}

export function stepStates(status: PartnerStatus): (Step & { state: StepState })[] {
  const current = STEP_INDEX[status];

  return STEPS.map((step, index) => ({
    ...step,
    state: index < current ? "complete" : index === current ? "current" : "locked",
  }));
}

/**
 * May the applicant open this step's page?
 *
 * Used by every per-step route. A step is reachable once it has been reached
 * — a verified partner can still look at their agreed prices — but never
 * before, which is the "a stage cannot be skipped" requirement enforced in
 * one place rather than repeated per page.
 */
export function canAccess(status: PartnerStatus, step: StepId): boolean {
  const target = STEPS.findIndex((s) => s.id === step);
  if (target === -1) return false;
  return STEP_INDEX[status] >= target;
}

/** Where to send an applicant who lands on a step they cannot open. */
export function currentStepHref(status: PartnerStatus): string {
  const step = STEPS[STEP_INDEX[status]];
  return step?.href ?? "/portal";
}

/**
 * What the applicant is being asked to do right now, in their own terms.
 *
 * Returns null when the ball is in our court. Derived from the status rather
 * than written on each page, so the button on the dashboard and the step the
 * tracker highlights cannot disagree — which they did, the first time this was
 * a bare "Continue" link pointing at whatever `currentStepHref` happened to
 * return.
 */
export function nextAction(status: PartnerStatus): { label: string; href: string } | null {
  if (isWaitingOnUs(status)) return null;

  switch (status) {
    case PARTNER_STATUS.APPLICATION_SUBMITTED:
      return { label: "Confirm who you are", href: "/portal/identity" };

    case PARTNER_STATUS.PRODUCT_LIST_SENT:
    case PARTNER_STATUS.NEGOTIATED_PRICING_SENT:
      return { label: "Review your pricing", href: "/portal/pricing" };

    case PARTNER_STATUS.PRICING_PARTNER_ACCEPTED:
    case PARTNER_STATUS.ONBOARDING_IN_PROGRESS:
      return { label: "Complete your account details", href: "/portal/onboarding" };

    case PARTNER_STATUS.DOCUMENTS_PENDING:
      return { label: "Upload your documents", href: "/portal/documents" };

    case PARTNER_STATUS.ONBOARDING_CHANGES_REQUESTED:
      return { label: "Make the requested corrections", href: "/portal/documents" };

    case PARTNER_STATUS.ONBOARDING_APPROVED:
    case PARTNER_STATUS.MSA_SENT:
      return { label: "Sign your agreement", href: "/portal/agreement" };

    case PARTNER_STATUS.VERIFIED:
      return { label: "See what happens next", href: "/portal/welcome" };

    default:
      return null;
  }
}

/** "Step 6 of 9", for a progress readout that does not need the whole rail. */
export function stepPosition(status: PartnerStatus): { current: number; total: number } {
  return { current: Math.min(STEP_INDEX[status] + 1, STEPS.length), total: STEPS.length };
}
