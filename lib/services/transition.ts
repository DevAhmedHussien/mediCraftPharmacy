import "server-only";

import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import {
  assertTransition,
  PERMISSION_ENUM,
  type Actor,
  type Audience,
  type PartnerStatus,
  type Transition,
  type NotificationType,
} from "@/lib/partner/status";

/* ===========================================================================
   The one place a partner's status changes.

   Everything the state machine promises is enforced here, inside a single
   database transaction:

     · the status update
     · the StatusHistory row (which is what makes the effects idempotent)
     · the audit entry
     · an EmailOutbox row per recipient
     · a Notification row per admin recipient

   All of it commits together or none of it does. That ordering is the point:
   an email enqueued outside the transaction can be sent for a change that got
   rolled back, and a status written without its outbox row is a partner who
   never hears that anything happened.

   DELIVERY IS A SEPARATE CONCERN. This enqueues; a worker sends. With
   EMAIL_DRIVER unset there is no worker yet, so the rows accumulate in
   EmailOutbox — which is the correct state, not a silent failure: the record
   of what should be sent exists and is queryable.
   ========================================================================= */

export type TransitionInput = {
  partnerId: string;
  to: PartnerStatus;
  actor: Actor;
  actorId?: string;
  actorEmail?: string;
  actorRole?: "SUPER_ADMIN" | "ADMIN" | "PARTNER";
  isSuperAdmin?: boolean;
  permissions?: readonly string[];
  /** Shown on the timeline; also the rejection/suspension reason. */
  note?: string;
  /** Extra values for this transition's templates — a meeting time, say. */
  emailProps?: Record<string, unknown>;
  /**
   * Use the `from: null` edge instead of the partner's current status.
   *
   * Only for the opening transition of a partner that was created moments ago;
   * ignored unless the partner has no status history. See applyTransition.
   */
  initial?: boolean;
};

/**
 * Resolve an audience to user ids.
 *
 * Done at transition time rather than stored, so an admin who lost
 * `pricing.review` this morning stops receiving pricing notifications this
 * afternoon. The acting admin is filtered out by the caller — nobody needs a
 * notification about their own click.
 */
async function resolveAudience(
  tx: Prisma.TransactionClient,
  audience: Audience,
  partnerId: string
): Promise<string[]> {
  switch (audience.kind) {
    case "allAdmins": {
      const users = await tx.user.findMany({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    case "superAdmins": {
      const users = await tx.user.findMany({
        where: { role: "SUPER_ADMIN", isActive: true },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    case "permission": {
      // Super admins hold every permission implicitly, so they are unioned in
      // rather than expected to carry an explicit grant.
      const [granted, supers] = await Promise.all([
        tx.adminPermission.findMany({
          where: {
            permission: PERMISSION_ENUM[audience.permission] as never,
            user: { isActive: true, role: "ADMIN" },
          },
          select: { userId: true },
        }),
        tx.user.findMany({ where: { role: "SUPER_ADMIN", isActive: true }, select: { id: true } }),
      ]);
      return [...granted.map((g) => g.userId), ...supers.map((s) => s.id)];
    }

    case "changesRequestedReviewer": {
      // The admin who most recently asked this partner for changes.
      const last = await tx.statusHistory.findFirst({
        where: {
          partnerId,
          toStatus: { in: ["PRICING_CHANGES_REQUESTED", "ONBOARDING_CHANGES_REQUESTED"] },
        },
        orderBy: { createdAt: "desc" },
        select: { actorId: true },
      });
      return last?.actorId ? [last.actorId] : [];
    }
  }
}


/**
 * Where a partner's notification takes them.
 *
 * The same table the step tracker uses would be circular — steps import
 * status — so this is the small subset that differs from "your application".
 */
function partnerLink(to: PartnerStatus): string {
  switch (to) {
    case "PRODUCT_LIST_SENT":
    case "NEGOTIATED_PRICING_SENT":
      return "/portal/pricing";
    case "APPLICATION_SUBMITTED":
      return "/portal/identity";
    case "ONBOARDING_IN_PROGRESS":
      return "/portal/onboarding";
    case "DOCUMENTS_PENDING":
    case "ONBOARDING_CHANGES_REQUESTED":
      return "/portal/documents";
    case "MSA_SENT":
      return "/portal/agreement";
    case "VERIFIED":
      return "/portal/welcome";
    default:
      return "/portal";
  }
}

/** A sentence for the card when the transition carried no note. */
function partnerBody(to: PartnerStatus): string {
  switch (to) {
    case "PRODUCT_LIST_SENT":
      return "Your formulary and pricing are open. Choose the medications you dispense.";
    case "NEGOTIATED_PRICING_SENT":
      return "Your negotiated pricing is ready to review.";
    case "DOCUMENTS_PENDING":
      return "One step left — your licences and photo ID.";
    case "MSA_SENT":
      return "Your Master Service Agreement is ready to sign.";
    case "VERIFIED":
      return "Your account is verified and open.";
    default:
      return "Open your portal to see where things stand.";
  }
}

/** Partner-side card type. Falls back where the enum has no closer match. */
const PARTNER_NOTIFICATION_TYPE: Partial<Record<PartnerStatus, NotificationType>> = {
  IDENTITY_SUBMITTED: "IDENTITY_SUBMITTED",
  PRICING_PARTNER_ACCEPTED: "PRICING_PARTNER_ACCEPTED",
  ONBOARDING_SUBMITTED: "ONBOARDING_SUBMITTED",
  MSA_SIGNED: "MSA_SIGNED",
  MSA_DECLINED: "MSA_DECLINED",
  VERIFIED: "PARTNER_VERIFIED",
};

export class TransitionError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus: number
  ) {
    super(message);
    this.name = "TransitionError";
  }
}

/**
 * Move a partner to a new status, with every side effect the edge declares.
 *
 * Returns the transition that ran, so a caller can report what happened
 * without re-deriving it.
 */
export async function applyTransition(input: TransitionInput): Promise<Transition> {
  const partner = await db.partner.findUnique({
    where: { id: input.partnerId },
    select: {
      id: true,
      status: true,
      companyName: true,
      contactName: true,
      user: { select: { id: true, email: true } },
      _count: { select: { statusHistory: true } },
    },
  });

  if (!partner) {
    throw new TransitionError("Partner not found.", "NOT_FOUND", 404);
  }

  /* The `from: null` edge, for a partner that has only just been created.
   *
   * A row has to exist before it can have effects attached to it, so intake
   * writes the user, the partner and the application first and then asks for
   * the opening transition. Without this the caller would have to hand-roll
   * the history row, the audit row, the two emails and the admin notification
   * — which is exactly what it used to do, and why the welcome emails were
   * never actually sent.
   *
   * `initial` is not taken on trust: it is honoured only while the partner has
   * no history at all, so it cannot be used to rewind a live account to the
   * top of the pipeline. */
  const isInitial = input.initial === true && partner._count.statusHistory === 0;
  const from = isInitial ? null : partner.status;

  // Throws InvalidTransitionError (409) or TransitionForbiddenError (403).
  const transition = assertTransition({
    from,
    to: input.to,
    actor: input.actor,
    isSuperAdmin: input.isSuperAdmin,
    permissions: input.permissions as never,
  });

  const requestHeaders = headers();
  const ip = (requestHeaders.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null;

  await db.$transaction(async (tx) => {
    await tx.partner.update({
      where: { id: partner.id },
      data: {
        status: input.to,
        statusChangedAt: new Date(),
        ...(input.to === "VERIFIED" ? { verifiedAt: new Date() } : {}),
        ...(input.to === "REJECTED" ? { rejectedReason: input.note ?? null } : {}),
        ...(input.to === "SUSPENDED" ? { suspendedReason: input.note ?? null } : {}),
      },
    });

    // The history row's id is the idempotency anchor for everything below.
    const history = await tx.statusHistory.create({
      data: {
        partnerId: partner.id,
        fromStatus: from,
        toStatus: input.to,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        actorRole: input.actorRole ?? null,
        note: input.note ?? null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: `partner.${input.to.toLowerCase()}`,
        entityType: "Partner",
        entityId: partner.id,
        metadata: {
          from,
          to: input.to,
          label: transition.label,
          ...(input.note ? { note: input.note } : {}),
        },
        ip,
        userAgent: requestHeaders.get("user-agent")?.slice(0, 500) ?? null,
      },
    });

    /* Queue the CRM mirror in the same transaction as the status change.
     *
     * Calling GoHighLevel inline from here put a third-party round trip on the
     * critical path of every transition, including a visitor submitting the
     * public inquiry form — a slow CRM became a slow submit and then a lost
     * sync. Writing a row instead makes the mirror atomic with the transition
     * and leaves the worker to deliver it. */
    await tx.crmOutbox.create({
      data: {
        idempotencyKey: history.id,
        partnerId: partner.id,
        label: transition.label,
        toStatus: input.to,
      },
    });

    const { effects } = transition;

    // Built once and shared: a greeting that says "Hi Acme Pharmacy" instead
    // of "Hi Dana" is the symptom of every template assembling its own props.
    const props = {
      partnerId: partner.id,
      companyName: partner.companyName,
      contactName: partner.contactName,
      status: input.to,
      note: input.note ?? null,
      ...(input.emailProps ?? {}),
    };

    const outbox: Prisma.EmailOutboxCreateManyInput[] = [];

    if (effects.partnerEmail) {
      outbox.push({
        idempotencyKey: `${history.id}:${effects.partnerEmail}:${partner.user.email}`,
        historyId: history.id,
        template: effects.partnerEmail,
        to: partner.user.email,
        props,
      });
    }

    if (effects.adminEmail) {
      const ids = new Set<string>();
      for (const audience of effects.adminEmail.audiences) {
        for (const id of await resolveAudience(tx, audience, partner.id)) ids.add(id);
      }
      // Never email someone about their own action.
      if (input.actorId) ids.delete(input.actorId);

      if (ids.size > 0) {
        const recipients = await tx.user.findMany({
          where: { id: { in: [...ids] } },
          select: { email: true },
        });
        for (const r of recipients) {
          outbox.push({
            idempotencyKey: `${history.id}:${effects.adminEmail.template}:${r.email}`,
            historyId: history.id,
            template: effects.adminEmail.template,
            to: r.email,
            props,
          });
        }
      }
    }

    if (effects.actingAdminEmail && input.actorEmail) {
      outbox.push({
        idempotencyKey: `${history.id}:${effects.actingAdminEmail}:${input.actorEmail}`,
        historyId: history.id,
        template: effects.actingAdminEmail,
        to: input.actorEmail,
        props,
      });
    }

    if (outbox.length > 0) {
      // `skipDuplicates` makes a retried transition a no-op rather than a
      // second send — the idempotency key is unique.
      await tx.emailOutbox.createMany({ data: outbox, skipDuplicates: true });
    }

    /* The partner gets one too.
     *
     * The effects table only ever addressed admins, so a partner whose pricing
     * had just arrived found out by email or by reloading. Written from inside
     * the same transaction as the status change, and keyed the same way, so a
     * retried transition cannot deal a second card.
     *
     * The label is already written for a human — it is what the timeline and
     * the confirmation email both say — so it is reused rather than a third
     * phrasing of the same event. */
    if (partner.user.id) {
      await tx.notification.createMany({
        data: [
          {
            recipientId: partner.user.id,
            type: (PARTNER_NOTIFICATION_TYPE[input.to] ?? "STATUS_CHANGED_BY_TEAMMATE") as never,
            priority: input.to === "REJECTED" ? "URGENT" : "NORMAL",
            title: transition.label,
            body: input.note ?? partnerBody(input.to),
            partnerId: partner.id,
            link: partnerLink(input.to),
            historyId: history.id,
          },
        ],
        skipDuplicates: true,
      });
    }

    if (effects.notification) {
      const ids = new Set<string>();
      for (const audience of effects.notification.audiences) {
        for (const id of await resolveAudience(tx, audience, partner.id)) ids.add(id);
      }
      if (input.actorId) ids.delete(input.actorId);

      if (ids.size > 0) {
        await tx.notification.createMany({
          data: [...ids].map((recipientId) => ({
            recipientId,
            type: effects.notification!.type as never,
            priority: effects.notification!.priority as never,
            title: `${partner.companyName} — ${transition.label}`,
            body: input.note ?? transition.label,
            partnerId: partner.id,
            link: `/admin/partners/${partner.id}`,
            historyId: history.id,
          })),
          skipDuplicates: true,
        });
      }
    }
  });

  return transition;
}

/** Full timeline for a partner, newest first. */
export async function getStatusHistory(partnerId: string) {
  return db.statusHistory.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      actorEmail: true,
      actorRole: true,
      note: true,
      createdAt: true,
    },
  });
}
