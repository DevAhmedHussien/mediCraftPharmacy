/* ===========================================================================
   The partner status state machine — the single source of truth.

   Every status change in the system goes through `assertTransition` and then
   through one `applyTransition` service. Nothing anywhere else may write
   `partner.status`. That is the rule the rest of the design leans on:

     · A transition cannot happen without its audit row, because the service
       writes both in one database transaction.
     · A transition cannot happen without its emails and notifications,
       because `effects` is a REQUIRED field of `Transition`. Adding a
       transition without deciding who hears about it is a type error, which
       is the brief's "the build must fail" requirement expressed in the type
       system rather than in a test that someone can forget to run.
     · The emails and the notifications cannot drift apart, because they are
       declared side by side in the same literal.

   WHY THIS FILE HAS NO IMPORTS
   ----------------------------
   It declares its own enums rather than importing `@prisma/client`, so it
   stays usable from the edge runtime and from a plain `tsx` script with no
   generated client on disk. The duplication is checked, not trusted:
   tests/parity.test.ts asserts these members match the Prisma enums exactly,
   including the dotted-wire-string mapping that PERMISSION_ENUM bridges.

   READ THE OPEN QUESTIONS AT THE BOTTOM. Seven edges in the brief are drawn
   as a straight line but are ambiguous in practice; each is resolved here
   with a stated default and flagged rather than quietly decided.
   ========================================================================= */

/* --- Vocabulary ---------------------------------------------------------- */

export const PARTNER_STATUS = {
  APPLICATION_SUBMITTED: "APPLICATION_SUBMITTED",
  IDENTITY_SUBMITTED: "IDENTITY_SUBMITTED",
  PRODUCT_LIST_SENT: "PRODUCT_LIST_SENT",
  MEETING_REQUESTED: "MEETING_REQUESTED",
  PRICING_MEETING: "PRICING_MEETING",
  PRICING_SUBMITTED: "PRICING_SUBMITTED",
  PRICING_CHANGES_REQUESTED: "PRICING_CHANGES_REQUESTED",
  NEGOTIATED_PRICING_SENT: "NEGOTIATED_PRICING_SENT",
  PRICING_ADMIN_APPROVED: "PRICING_ADMIN_APPROVED",
  PRICING_PARTNER_ACCEPTED: "PRICING_PARTNER_ACCEPTED",
  ONBOARDING_IN_PROGRESS: "ONBOARDING_IN_PROGRESS",
  DOCUMENTS_PENDING: "DOCUMENTS_PENDING",
  ONBOARDING_SUBMITTED: "ONBOARDING_SUBMITTED",
  ONBOARDING_CHANGES_REQUESTED: "ONBOARDING_CHANGES_REQUESTED",
  ONBOARDING_APPROVED: "ONBOARDING_APPROVED",
  MSA_SENT: "MSA_SENT",
  MSA_SIGNED: "MSA_SIGNED",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  MSA_DECLINED: "MSA_DECLINED",
  SUSPENDED: "SUSPENDED",
} as const;

export type PartnerStatus = (typeof PARTNER_STATUS)[keyof typeof PARTNER_STATUS];

/** Dotted wire strings, matching `requirePermission("pricing.review")`. */
export const PERMISSION = {
  APPLICATIONS_VIEW: "applications.view",
  APPLICATIONS_REVIEW: "applications.review",
  PRODUCTS_SEND: "products.send",
  PRICING_REVIEW: "pricing.review",
  ONBOARDING_REVIEW: "onboarding.review",
  MSA_SEND: "msa.send",
  PARTNERS_VIEW: "partners.view",
  PARTNERS_MANAGE: "partners.manage",
} as const;

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

/**
 * Dotted wire string → Prisma enum member name.
 *
 * The schema `@map`s each member to its dotted form, so POSTGRES stores
 * `products.send` — but the Prisma CLIENT API takes the member NAME,
 * `PRODUCTS_SEND`. Passing the wire string straight into a `where` clause
 * throws PrismaClientValidationError, which surfaces as a 500 rather than as
 * a permission denial. That failure is invisible in testing until a
 * non-super-admin hits a gated route, because super admins bypass the query
 * entirely.
 *
 * Derived by inverting PERMISSION so the two can never drift.
 */
export const PERMISSION_ENUM = Object.fromEntries(
  Object.entries(PERMISSION).map(([member, wire]) => [wire, member])
) as Record<Permission, string>;

/**
 * Who is allowed to drive a given edge.
 *
 * `SYSTEM` means no human may trigger it through the API — it is reached only
 * from a verified DocuSign webhook or an internal service call. Keeping it in
 * the same table as the human edges is what stops someone adding a
 * `POST /api/partner/verify-me` route later: there is no actor value that
 * would let it through.
 */
export type Actor = "PARTNER" | "ADMIN" | "SYSTEM";

/* --- Effects ------------------------------------------------------------- */

/**
 * Who an admin-side effect goes to. Resolved at send time, never stored, so
 * revoking `pricing.review` from an admin stops their notifications
 * immediately rather than at the next deploy.
 */
export type Audience =
  | { kind: "permission"; permission: Permission }
  | { kind: "allAdmins" }
  | { kind: "superAdmins" }
  /** The specific admin who asked for changes, so a resubmission lands on the
   *  desk of the person already holding the thread. */
  | { kind: "changesRequestedReviewer" };

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type NotificationType =
  | "APPLICATION_SUBMITTED"
  | "IDENTITY_SUBMITTED"
  | "PRICING_SUBMITTED"
  | "MEETING_REQUESTED"
  | "AMENDMENT_REQUESTED"
  | "PRICING_PARTNER_ACCEPTED"
  | "ONBOARDING_SUBMITTED"
  | "DOCUMENTS_SUBMITTED"
  | "PARTNER_RESUBMITTED"
  | "MSA_SIGNED"
  | "PARTNER_VERIFIED"
  | "MSA_DECLINED"
  | "INTEGRATION_FAILURE"
  | "STATUS_CHANGED_BY_TEAMMATE"
  | "ACCOUNT_PERMISSIONS_CHANGED"
  | "APPLICATION_STALE";

/** React Email components, one per name. The mapping is checked in tests. */
export type EmailTemplate =
  | "partner/application-received"
  | "partner/identity-received"
  | "partner/identity-changes-requested"
  | "partner/product-list"
  | "partner/meeting-requested"
  | "partner/meeting-times-offered"
  | "partner/meeting-scheduled"
  | "partner/pricing-meeting"
  | "partner/negotiated-pricing"
  | "partner/pricing-received"
  | "partner/pricing-changes-requested"
  | "partner/pricing-ready-to-accept"
  | "partner/pricing-confirmed"
  | "partner/onboarding-start"
  | "partner/documents-requested"
  | "partner/onboarding-received"
  | "partner/onboarding-changes-requested"
  | "partner/onboarding-approved"
  | "partner/msa-sign-request"
  | "partner/msa-signed"
  | "partner/welcome-verified"
  | "partner/application-rejected"
  | "partner/msa-declined"
  | "partner/account-suspended"
  | "partner/account-reactivated"
  | "admin/new-application"
  | "admin/identity-submitted"
  | "admin/site-enquiry"
  | "admin/product-list-sent"
  | "admin/meeting-requested"
  | "admin/meeting-confirmed"
  | "auth/login-code"
  | "admin/amendment-requested"
  | "partner/amendment-pricing-ready"
  | "partner/change-order-ready"
  | "admin/pricing-meeting"
  | "admin/negotiated-pricing-sent"
  | "admin/pricing-another-round"
  | "admin/pricing-submitted"
  | "admin/pricing-approved"
  | "admin/pricing-accepted"
  | "admin/onboarding-submitted"
  | "admin/documents-submitted"
  | "admin/onboarding-approved"
  | "admin/msa-sent"
  | "admin/msa-signed"
  | "admin/partner-verified"
  | "admin/partner-rejected"
  | "admin/msa-declined"
  | "admin/partner-suspended"
  | "admin/partner-reactivated"
  | "admin/changes-requested-confirmation";

export type Effects = {
  /** Sent to the partner's account email. `null` only where the brief has no
   *  partner-facing message for the edge. */
  partnerEmail: EmailTemplate | null;
  /** Broadcast to an admin audience. */
  adminEmail: { template: EmailTemplate; audiences: Audience[] } | null;
  /** Receipt to the admin who performed the action, where the brief asks for
   *  one instead of a broadcast. */
  actingAdminEmail: EmailTemplate | null;
  /** In-app card. Recipients are filtered so the actor never sees their own. */
  notification: {
    type: NotificationType;
    priority: NotificationPriority;
    audiences: Audience[];
  } | null;
  /**
   * Low-priority "someone else handled this" card for teammates holding the
   * same permission. Only meaningful on admin-driven edges.
   */
  teammateEcho: boolean;
};

export type Transition = {
  /** `null` is the creation edge — no partner row existed before it. */
  from: PartnerStatus | null;
  to: PartnerStatus;
  actor: Actor;
  /** Required of an ADMIN actor. Super admins bypass the check. */
  permission?: Permission;
  /** Shown in the admin timeline and in the audit log's `action`. */
  label: string;
  effects: Effects;
};

/* --- Shorthands ---------------------------------------------------------- */

const byPermission = (permission: Permission): Audience => ({ kind: "permission", permission });
const ALL_ADMINS: Audience = { kind: "allAdmins" };
const SUPER_ADMINS: Audience = { kind: "superAdmins" };
const REVIEWER: Audience = { kind: "changesRequestedReviewer" };

/** Every state a partner can be rejected out of — anything before VERIFIED. */
const PRE_VERIFIED_STATUSES: PartnerStatus[] = [
  PARTNER_STATUS.APPLICATION_SUBMITTED,
  PARTNER_STATUS.IDENTITY_SUBMITTED,
  PARTNER_STATUS.PRODUCT_LIST_SENT,
  PARTNER_STATUS.MEETING_REQUESTED,
  PARTNER_STATUS.PRICING_MEETING,
  PARTNER_STATUS.PRICING_SUBMITTED,
  PARTNER_STATUS.PRICING_CHANGES_REQUESTED,
  PARTNER_STATUS.NEGOTIATED_PRICING_SENT,
  PARTNER_STATUS.PRICING_ADMIN_APPROVED,
  PARTNER_STATUS.PRICING_PARTNER_ACCEPTED,
  PARTNER_STATUS.ONBOARDING_IN_PROGRESS,
  PARTNER_STATUS.DOCUMENTS_PENDING,
  PARTNER_STATUS.ONBOARDING_SUBMITTED,
  PARTNER_STATUS.ONBOARDING_CHANGES_REQUESTED,
  PARTNER_STATUS.ONBOARDING_APPROVED,
  PARTNER_STATUS.MSA_SENT,
  PARTNER_STATUS.MSA_DECLINED,
];

const REJECTION_EFFECTS: Effects = {
  partnerEmail: "partner/application-rejected",
  adminEmail: { template: "admin/partner-rejected", audiences: [byPermission(PERMISSION.APPLICATIONS_REVIEW)] },
  actingAdminEmail: null,
  notification: null,
  teammateEcho: true,
};

/* --- The table ----------------------------------------------------------- */

export const TRANSITIONS: readonly Transition[] = [
  // ---- Step 1: application ------------------------------------------------
  {
    from: null,
    to: PARTNER_STATUS.APPLICATION_SUBMITTED,
    actor: "PARTNER",
    label: "Application submitted",
    effects: {
      partnerEmail: "partner/application-received",
      adminEmail: { template: "admin/new-application", audiences: [byPermission(PERMISSION.APPLICATIONS_REVIEW)] },
      actingAdminEmail: null,
      notification: {
        type: "APPLICATION_SUBMITTED",
        priority: "HIGH",
        audiences: [byPermission(PERMISSION.APPLICATIONS_REVIEW)],
      },
      teammateEcho: false,
    },
  },
  {
    /* The applicant says who they are and uploads a photo ID.
     *
     * This sits between the enquiry and the formulary because Provider Cost is
     * confidential under MSA §11 and the enquiry form is fourteen fields
     * anyone can fill in. Releasing a price list to whoever typed an email
     * address is the gap this closes. */
    from: PARTNER_STATUS.APPLICATION_SUBMITTED,
    to: PARTNER_STATUS.IDENTITY_SUBMITTED,
    actor: "PARTNER",
    label: "Identity submitted",
    effects: {
      // Silenced: "we have your ID and are checking it". Nothing for them
      // to do, and the next mail they get either releases the formulary or
      // asks for a correction.
      partnerEmail: null,
      adminEmail: {
        template: "admin/identity-submitted",
        audiences: [byPermission(PERMISSION.APPLICATIONS_REVIEW)],
      },
      actingAdminEmail: null,
      notification: {
        type: "IDENTITY_SUBMITTED",
        priority: "HIGH",
        audiences: [byPermission(PERMISSION.APPLICATIONS_REVIEW)],
      },
      teammateEcho: false,
    },
  },
  {
    /* The ID did not match, or something is missing. Back to the applicant
       with a reason rather than a silent rejection. */
    from: PARTNER_STATUS.IDENTITY_SUBMITTED,
    to: PARTNER_STATUS.APPLICATION_SUBMITTED,
    actor: "ADMIN",
    permission: PERMISSION.APPLICATIONS_REVIEW,
    label: "Identity changes requested",
    effects: {
      partnerEmail: "partner/identity-changes-requested",
      adminEmail: null,
      actingAdminEmail: null,
      notification: null,
      teammateEcho: true,
    },
  },
  {
    // Verifying the requester and releasing the price list are the same act:
    // the applicant's next screen IS the formulary. Splitting them into two
    // admin clicks would create a status where a verified applicant can see
    // nothing.
    from: PARTNER_STATUS.IDENTITY_SUBMITTED,
    to: PARTNER_STATUS.PRODUCT_LIST_SENT,
    actor: "ADMIN",
    permission: PERMISSION.APPLICATIONS_REVIEW,
    label: "Identity verified — send the formulary",
    effects: {
      partnerEmail: "partner/product-list",
      adminEmail: null,
      actingAdminEmail: "admin/product-list-sent",
      notification: null,
      teammateEcho: true,
    },
  },

  // ---- Step 2: negotiation ------------------------------------------------
  {
    // The applicant has the price list and wants to talk about it. The reason
    // is required — see the Meeting model.
    from: PARTNER_STATUS.PRODUCT_LIST_SENT,
    to: PARTNER_STATUS.MEETING_REQUESTED,
    actor: "PARTNER",
    label: "Meeting requested",
    effects: {
      // Silenced: acknowledging a call request they just made. The mail
      // that matters is the one offering times, sent when there are times.
      partnerEmail: null,
      adminEmail: {
        template: "admin/meeting-requested",
        audiences: [byPermission(PERMISSION.PRICING_REVIEW)],
      },
      actingAdminEmail: null,
      notification: {
        type: "MEETING_REQUESTED",
        priority: "HIGH",
        audiences: [byPermission(PERMISSION.PRICING_REVIEW)],
      },
      teammateEcho: false,
    },
  },
  {
    // Admin puts a date on it. The applicant's status page flips from "we
    // have your request" to the actual time.
    from: PARTNER_STATUS.MEETING_REQUESTED,
    to: PARTNER_STATUS.PRICING_MEETING,
    actor: "ADMIN",
    permission: PERMISSION.PRICING_REVIEW,
    label: "Meeting scheduled",
    effects: {
      // Silenced: the partner booked the slot themselves and saw it
      // confirmed on screen. A mail telling them what they just chose is
      // the definition of noise.
      partnerEmail: null,
      adminEmail: null,
      actingAdminEmail: null,
      notification: null,
      teammateEcho: true,
    },
  },
  {
    /* The applicant picks one of the times an admin offered.
     *
     * Same edge, different actor, and both are legitimate: an admin can still
     * record a time agreed on the phone. What makes this one safe without a
     * permission is that the applicant cannot invent a time — the service
     * rejects anything that is not in `proposedSlots`, so the only thing they
     * can do here is accept an offer an admin already made.
     *
     * No `teammateEcho`: the echo exists to tell admins that a COLLEAGUE
     * moved a partner they were holding. This move came from outside the
     * team, so the admin email below is the right channel and the echo would
     * be a second card saying the same thing. */
    from: PARTNER_STATUS.MEETING_REQUESTED,
    to: PARTNER_STATUS.PRICING_MEETING,
    actor: "PARTNER",
    label: "Applicant picked a time",
    effects: {
      // Silenced: the partner booked the slot themselves and saw it
      // confirmed on screen. A mail telling them what they just chose is
      // the definition of noise.
      partnerEmail: null,
      adminEmail: {
        template: "admin/meeting-confirmed",
        audiences: [byPermission(PERMISSION.PRICING_REVIEW)],
      },
      actingAdminEmail: null,
      notification: {
        type: "MEETING_REQUESTED",
        priority: "NORMAL",
        audiences: [byPermission(PERMISSION.PRICING_REVIEW)],
      },
      teammateEcho: false,
    },
  },
  {
    // An applicant who is happy with list pricing can skip the meeting
    // entirely rather than being forced to request one they do not want.
    from: PARTNER_STATUS.PRODUCT_LIST_SENT,
    to: PARTNER_STATUS.PRICING_PARTNER_ACCEPTED,
    actor: "PARTNER",
    label: "List pricing accepted without negotiation",
    effects: {
      // Silenced: "pricing agreed, account details next" is immediately
      // followed by onboarding-start, which says the same thing and
      // carries the link.
      partnerEmail: null,
      adminEmail: {
        template: "admin/pricing-accepted",
        audiences: [byPermission(PERMISSION.PRICING_REVIEW)],
      },
      actingAdminEmail: null,
      notification: {
        type: "PRICING_PARTNER_ACCEPTED",
        priority: "NORMAL",
        audiences: [byPermission(PERMISSION.PRICING_REVIEW)],
      },
      teammateEcho: false,
    },
  },
  {
    // After the meeting the admin builds a partner-specific list and sends it.
    from: PARTNER_STATUS.PRICING_MEETING,
    to: PARTNER_STATUS.NEGOTIATED_PRICING_SENT,
    actor: "ADMIN",
    permission: PERMISSION.PRICING_REVIEW,
    label: "Negotiated pricing sent",
    effects: {
      partnerEmail: "partner/negotiated-pricing",
      adminEmail: {
        template: "admin/negotiated-pricing-sent",
        audiences: [byPermission(PERMISSION.PRICING_REVIEW)],
      },
      actingAdminEmail: null,
      notification: null,
      teammateEcho: true,
    },
  },
  {
    from: PARTNER_STATUS.NEGOTIATED_PRICING_SENT,
    to: PARTNER_STATUS.PRICING_PARTNER_ACCEPTED,
    actor: "PARTNER",
    label: "Negotiated pricing accepted",
    effects: {
      // Silenced: "pricing agreed, account details next" is immediately
      // followed by onboarding-start, which says the same thing and
      // carries the link.
      partnerEmail: null,
      adminEmail: {
        template: "admin/pricing-accepted",
        audiences: [byPermission(PERMISSION.PRICING_REVIEW)],
      },
      actingAdminEmail: null,
      notification: {
        type: "PRICING_PARTNER_ACCEPTED",
        priority: "NORMAL",
        audiences: [byPermission(PERMISSION.PRICING_REVIEW)],
      },
      teammateEcho: false,
    },
  },
  {
    // "Request another round" loops back to the admin's editor rather than to
    // the meeting: the conversation already happened, what is in dispute is
    // the numbers. A second meeting is still reachable by rejecting and
    // re-approving, which is rare enough not to deserve its own edge.
    from: PARTNER_STATUS.NEGOTIATED_PRICING_SENT,
    to: PARTNER_STATUS.PRICING_CHANGES_REQUESTED,
    actor: "PARTNER",
    label: "Another pricing round requested",
    effects: {
      partnerEmail: null,
      adminEmail: {
        template: "admin/pricing-another-round",
        audiences: [byPermission(PERMISSION.PRICING_REVIEW)],
      },
      actingAdminEmail: null,
      notification: {
        type: "PARTNER_RESUBMITTED",
        priority: "HIGH",
        audiences: [REVIEWER, byPermission(PERMISSION.PRICING_REVIEW)],
      },
      teammateEcho: false,
    },
  },
  {
    // The admin revises and sends again.
    from: PARTNER_STATUS.PRICING_CHANGES_REQUESTED,
    to: PARTNER_STATUS.NEGOTIATED_PRICING_SENT,
    actor: "ADMIN",
    permission: PERMISSION.PRICING_REVIEW,
    label: "Revised pricing sent",
    effects: {
      partnerEmail: "partner/negotiated-pricing",
      adminEmail: null,
      actingAdminEmail: null,
      notification: null,
      teammateEcho: true,
    },
  },

  /* The partner-submitted price list flow (PRICING_SUBMITTED →
     PRICING_ADMIN_APPROVED → PRICING_PARTNER_ACCEPTED) was removed when the
     negotiation moved to an admin-built list. Those three statuses remain in
     the Prisma enum — dropping enum values is a destructive migration that
     buys nothing — but no edge reaches them, so `assertTransition` refuses
     any attempt to enter one. */


  // ---- Step 3: onboarding -------------------------------------------------
  {
    // SYSTEM, fired by the first autosave — see open question 3.
    from: PARTNER_STATUS.PRICING_PARTNER_ACCEPTED,
    to: PARTNER_STATUS.ONBOARDING_IN_PROGRESS,
    actor: "SYSTEM",
    label: "Onboarding started",
    effects: {
      partnerEmail: "partner/onboarding-start",
      adminEmail: null,
      actingAdminEmail: null,
      notification: null,
      teammateEcho: false,
    },
  },
  {
    /* Account details are in. This does NOT go to review: the licences and
       photo ID are still missing, and a reviewer opening a half-finished file
       wastes the one pass they were going to make on it. */
    from: PARTNER_STATUS.ONBOARDING_IN_PROGRESS,
    to: PARTNER_STATUS.DOCUMENTS_PENDING,
    actor: "PARTNER",
    label: "Account details completed",
    effects: {
      partnerEmail: "partner/documents-requested",
      adminEmail: null,
      actingAdminEmail: null,
      notification: null,
      teammateEcho: false,
    },
  },
  {
    /* Documents uploaded — now there is a complete file to review. */
    from: PARTNER_STATUS.DOCUMENTS_PENDING,
    to: PARTNER_STATUS.ONBOARDING_SUBMITTED,
    actor: "PARTNER",
    label: "Documents submitted",
    effects: {
      // Silenced: "we are reviewing your details". Waiting is not news.
      partnerEmail: null,
      adminEmail: { template: "admin/documents-submitted", audiences: [byPermission(PERMISSION.ONBOARDING_REVIEW)] },
      actingAdminEmail: null,
      notification: {
        type: "DOCUMENTS_SUBMITTED",
        priority: "HIGH",
        audiences: [byPermission(PERMISSION.ONBOARDING_REVIEW)],
      },
      teammateEcho: false,
    },
  },
  {
    from: PARTNER_STATUS.ONBOARDING_SUBMITTED,
    to: PARTNER_STATUS.ONBOARDING_CHANGES_REQUESTED,
    actor: "ADMIN",
    permission: PERMISSION.ONBOARDING_REVIEW,
    label: "Onboarding changes requested",
    effects: {
      partnerEmail: "partner/onboarding-changes-requested",
      adminEmail: null,
      actingAdminEmail: "admin/changes-requested-confirmation",
      notification: null,
      teammateEcho: true,
    },
  },
  {
    /* Corrections can touch either half of the file, so a sent-back applicant
       can reopen BOTH the details form and the document list — the step
       tracker allows it (see STEP_INDEX) without needing a status change.
       They come back out of this state the same way they went into review. */
    from: PARTNER_STATUS.ONBOARDING_CHANGES_REQUESTED,
    to: PARTNER_STATUS.ONBOARDING_SUBMITTED,
    actor: "PARTNER",
    label: "Onboarding resubmitted",
    effects: {
      // Silenced: "we are reviewing your details". Waiting is not news.
      partnerEmail: null,
      adminEmail: { template: "admin/onboarding-submitted", audiences: [byPermission(PERMISSION.ONBOARDING_REVIEW)] },
      actingAdminEmail: null,
      notification: {
        type: "PARTNER_RESUBMITTED",
        priority: "HIGH",
        audiences: [REVIEWER, byPermission(PERMISSION.ONBOARDING_REVIEW)],
      },
      teammateEcho: false,
    },
  },
  {
    from: PARTNER_STATUS.ONBOARDING_SUBMITTED,
    to: PARTNER_STATUS.ONBOARDING_APPROVED,
    actor: "ADMIN",
    permission: PERMISSION.ONBOARDING_REVIEW,
    label: "Onboarding approved",
    effects: {
      // Silenced: "your agreement is on its way" is followed within the
      // minute by the agreement itself.
      partnerEmail: null,
      adminEmail: { template: "admin/onboarding-approved", audiences: [byPermission(PERMISSION.MSA_SEND)] },
      actingAdminEmail: null,
      notification: null,
      teammateEcho: true,
    },
  },

  // ---- Step 4: MSA --------------------------------------------------------
  {
    from: PARTNER_STATUS.ONBOARDING_APPROVED,
    to: PARTNER_STATUS.MSA_SENT,
    actor: "ADMIN",
    permission: PERMISSION.MSA_SEND,
    label: "MSA sent",
    effects: {
      partnerEmail: "partner/msa-sign-request",
      adminEmail: { template: "admin/msa-sent", audiences: [byPermission(PERMISSION.MSA_SEND)] },
      actingAdminEmail: null,
      notification: null,
      teammateEcho: true,
    },
  },
  {
    // Webhook only. The signing redirect never reaches this edge.
    from: PARTNER_STATUS.MSA_SENT,
    to: PARTNER_STATUS.MSA_SIGNED,
    actor: "SYSTEM",
    label: "MSA signed",
    effects: {
      // Silenced: they signed it seconds ago and were redirected to a
      // confirmation. welcome-verified follows when the account is live.
      partnerEmail: null,
      adminEmail: { template: "admin/msa-signed", audiences: [byPermission(PERMISSION.MSA_SEND)] },
      actingAdminEmail: null,
      notification: {
        type: "MSA_SIGNED",
        priority: "NORMAL",
        audiences: [byPermission(PERMISSION.MSA_SEND)],
      },
      teammateEcho: false,
    },
  },
  {
    // Chained immediately after MSA_SIGNED in the same webhook handler, as two
    // transitions rather than one — see open question 4.
    from: PARTNER_STATUS.MSA_SIGNED,
    to: PARTNER_STATUS.VERIFIED,
    actor: "SYSTEM",
    label: "Partner verified",
    effects: {
      partnerEmail: "partner/welcome-verified",
      adminEmail: { template: "admin/partner-verified", audiences: [ALL_ADMINS] },
      actingAdminEmail: null,
      notification: {
        type: "PARTNER_VERIFIED",
        priority: "NORMAL",
        audiences: [ALL_ADMINS],
      },
      teammateEcho: false,
    },
  },
  {
    from: PARTNER_STATUS.MSA_SENT,
    to: PARTNER_STATUS.MSA_DECLINED,
    actor: "SYSTEM",
    label: "MSA declined",
    effects: {
      partnerEmail: "partner/msa-declined",
      adminEmail: { template: "admin/msa-declined", audiences: [byPermission(PERMISSION.MSA_SEND), SUPER_ADMINS] },
      actingAdminEmail: null,
      notification: {
        type: "MSA_DECLINED",
        priority: "URGENT",
        audiences: [byPermission(PERMISSION.MSA_SEND), SUPER_ADMINS],
      },
      teammateEcho: false,
    },
  },
  {
    // Recovery edge — see open question 5.
    from: PARTNER_STATUS.MSA_DECLINED,
    to: PARTNER_STATUS.MSA_SENT,
    actor: "ADMIN",
    permission: PERMISSION.MSA_SEND,
    label: "MSA re-sent after decline",
    effects: {
      partnerEmail: "partner/msa-sign-request",
      adminEmail: { template: "admin/msa-sent", audiences: [byPermission(PERMISSION.MSA_SEND)] },
      actingAdminEmail: null,
      notification: null,
      teammateEcho: true,
    },
  },
  {
    // DocuSign `voided`. Returns the partner to the pre-send state so an admin
    // can issue a fresh envelope — see open question 6.
    from: PARTNER_STATUS.MSA_SENT,
    to: PARTNER_STATUS.ONBOARDING_APPROVED,
    actor: "SYSTEM",
    label: "MSA envelope voided",
    effects: {
      partnerEmail: null,
      adminEmail: null,
      actingAdminEmail: null,
      notification: {
        type: "INTEGRATION_FAILURE",
        priority: "URGENT",
        audiences: [byPermission(PERMISSION.MSA_SEND), SUPER_ADMINS],
      },
      teammateEcho: false,
    },
  },

  // ---- Side states --------------------------------------------------------
  ...PRE_VERIFIED_STATUSES.map(
    (from): Transition => ({
      from,
      to: PARTNER_STATUS.REJECTED,
      actor: "ADMIN",
      permission: PERMISSION.APPLICATIONS_REVIEW,
      label: "Application rejected",
      effects: REJECTION_EFFECTS,
    })
  ),
  {
    from: PARTNER_STATUS.VERIFIED,
    to: PARTNER_STATUS.SUSPENDED,
    actor: "ADMIN",
    permission: PERMISSION.PARTNERS_MANAGE,
    label: "Partner suspended",
    effects: {
      partnerEmail: "partner/account-suspended",
      adminEmail: { template: "admin/partner-suspended", audiences: [ALL_ADMINS] },
      actingAdminEmail: null,
      notification: null,
      teammateEcho: true,
    },
  },
  {
    // Reactivation. The brief's email table has no row for it — see open
    // question 2; the template below is proposed, not specified.
    from: PARTNER_STATUS.SUSPENDED,
    to: PARTNER_STATUS.VERIFIED,
    actor: "ADMIN",
    permission: PERMISSION.PARTNERS_MANAGE,
    label: "Partner reactivated",
    effects: {
      partnerEmail: "partner/account-reactivated",
      adminEmail: { template: "admin/partner-reactivated", audiences: [ALL_ADMINS] },
      actingAdminEmail: null,
      notification: null,
      teammateEcho: true,
    },
  },
];

/* --- Lookups ------------------------------------------------------------- */

const key = (from: PartnerStatus | null, to: PartnerStatus) => `${from ?? "NEW"}->${to}`;

const BY_KEY = new Map<string, Transition>(TRANSITIONS.map((t) => [key(t.from, t.to), t]));

export class InvalidTransitionError extends Error {
  readonly code = "INVALID_TRANSITION";
  /** Surfaced as HTTP 409, per the brief. */
  readonly httpStatus = 409;

  constructor(
    readonly from: PartnerStatus | null,
    readonly to: PartnerStatus
  ) {
    super(`A partner in ${from ?? "no"} status cannot move to ${to}.`);
    this.name = "InvalidTransitionError";
  }
}

export class TransitionForbiddenError extends Error {
  readonly code = "TRANSITION_FORBIDDEN";
  readonly httpStatus = 403;

  constructor(message: string) {
    super(message);
    this.name = "TransitionForbiddenError";
  }
}

/** The edge, or `null` if there isn't one. Use in read paths and UI guards. */
export function findTransition(
  from: PartnerStatus | null,
  to: PartnerStatus
): Transition | null {
  return BY_KEY.get(key(from, to)) ?? null;
}

/** Every status this partner can currently be moved to by the given actor. */
export function allowedTransitions(
  from: PartnerStatus | null,
  actor?: Actor
): Transition[] {
  return TRANSITIONS.filter((t) => t.from === from && (!actor || t.actor === actor));
}

/**
 * The gate every write path goes through.
 *
 * Checks the edge exists, that this actor kind owns it, and that an admin
 * carries the permission. Super admins bypass the permission check only — they
 * still cannot drive a `SYSTEM` edge, because "the webhook said so" is the
 * whole evidentiary value of `VERIFIED`.
 */
export function assertTransition(input: {
  from: PartnerStatus | null;
  to: PartnerStatus;
  actor: Actor;
  isSuperAdmin?: boolean;
  permissions?: readonly Permission[];
}): Transition {
  const t = findTransition(input.from, input.to);
  if (!t) throw new InvalidTransitionError(input.from, input.to);

  if (t.actor !== input.actor) {
    throw new TransitionForbiddenError(
      `${input.to} is driven by ${t.actor}, not ${input.actor}.`
    );
  }

  if (t.actor === "ADMIN" && t.permission && !input.isSuperAdmin) {
    const held = input.permissions ?? [];
    if (!held.includes(t.permission)) {
      throw new TransitionForbiddenError(`Requires the ${t.permission} permission.`);
    }
  }

  return t;
}

/* --- Derived helpers ----------------------------------------------------- */

/** Statuses a partner can sit in and still be waiting on an admin. */
export const ADMIN_ACTIONABLE_STATUSES: readonly PartnerStatus[] = [
  PARTNER_STATUS.IDENTITY_SUBMITTED,
  PARTNER_STATUS.MEETING_REQUESTED,
  PARTNER_STATUS.PRICING_SUBMITTED,
  PARTNER_STATUS.PRICING_CHANGES_REQUESTED,
  PARTNER_STATUS.PRICING_PARTNER_ACCEPTED,
  PARTNER_STATUS.ONBOARDING_SUBMITTED,
  PARTNER_STATUS.MSA_SIGNED,
];

/**
 * The five-step bar drawn in every partner email and on the status page.
 * A status maps to the step it is *within*, not the step it has finished.
 */
export const PROGRESS_STEPS = ["Application", "Pricing", "Onboarding", "Agreement", "Verified"] as const;
export type ProgressStep = (typeof PROGRESS_STEPS)[number];

const PROGRESS_BY_STATUS: Record<PartnerStatus, ProgressStep> = {
  APPLICATION_SUBMITTED: "Application",
  IDENTITY_SUBMITTED: "Application",
  PRODUCT_LIST_SENT: "Pricing",
  MEETING_REQUESTED: "Pricing",
  PRICING_MEETING: "Pricing",
  PRICING_SUBMITTED: "Pricing",
  PRICING_CHANGES_REQUESTED: "Pricing",
  NEGOTIATED_PRICING_SENT: "Pricing",
  PRICING_ADMIN_APPROVED: "Pricing",
  PRICING_PARTNER_ACCEPTED: "Pricing",
  ONBOARDING_IN_PROGRESS: "Onboarding",
  DOCUMENTS_PENDING: "Onboarding",
  ONBOARDING_SUBMITTED: "Onboarding",
  ONBOARDING_CHANGES_REQUESTED: "Onboarding",
  ONBOARDING_APPROVED: "Onboarding",
  MSA_SENT: "Agreement",
  MSA_SIGNED: "Agreement",
  VERIFIED: "Verified",
  // Side states show the step they stalled in.
  REJECTED: "Application",
  MSA_DECLINED: "Agreement",
  SUSPENDED: "Verified",
};

export function progressStep(status: PartnerStatus): ProgressStep {
  return PROGRESS_BY_STATUS[status];
}

/* ===========================================================================
   OPEN QUESTIONS — defaults are implemented above, decisions are yours
   ---------------------------------------------------------------------------
   1. PRODUCT_LIST_SENT is a dead end for the partner. The brief draws the
      flow as one chain, so a partner who has been sent the catalog still has
      to be moved to PRICING_MEETING by an admin before they can submit a
      price list. If a partner should be able to price straight off the
      emailed catalog without a meeting, add
      PRODUCT_LIST_SENT → PRICING_SUBMITTED.

   2. Reactivation has no email in §5.1. SUSPENDED → VERIFIED is implemented
      with a proposed `partner/account-reactivated`. Confirm the copy, or say
      reactivation should be silent.

   3. ONBOARDING_IN_PROGRESS is entered by SYSTEM on the partner's first
      autosave. The alternative is entering it immediately on
      PRICING_PARTNER_ACCEPTED, which makes the two statuses redundant and
      fires the "complete your onboarding" email twice in a minute. Flagging
      because the brief labels it "(partner fills step 3)", which reads either
      way.

   4. MSA_SIGNED → VERIFIED chains inside one webhook, so a single DocuSign
      callback sends FOUR emails (partner signed, admin signed, partner
      welcome, admin verified) within a second. §5.1 asks for all four. Say if
      you would rather suppress the MSA_SIGNED pair and send only the welcome.

   5. MSA_DECLINED → MSA_SENT (re-send) is not in the brief but a decline with
      no recovery path strands the partner permanently. Implemented, reusing
      the MSA templates.

   6. DocuSign `voided` has no status in the brief. Implemented as a return to
      ONBOARDING_APPROVED plus an URGENT notification, so an admin can issue a
      new envelope. Confirm, or name a dedicated status.

   7. There is no partner-side rejection of final pricing. Once an admin
      approves, the partner can only accept — PRICING_ADMIN_APPROVED has no
      edge back to PRICING_CHANGES_REQUESTED. If a partner should be able to
      push back on the admin's approved prices, that edge is needed.
   ========================================================================= */
