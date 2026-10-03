import "server-only";

import { db } from "@/lib/db";
import { PERMISSION_ENUM, type NotificationType, type Permission } from "@/lib/partner/status";

/* ===========================================================================
   Notifications, and the bell that shows them.

   Every transition has been writing these since the pipeline was built and
   nothing has ever displayed one — the table has a `link` column whose comment
   says "where the bell click goes", and there was no bell. This is that.

   PARTNERS GET THEM TOO. The effects table only ever addressed admins, so a
   partner whose pricing arrived learned about it by email or by reloading.
   `notifyPartner` is called from the same transaction as the status change, so
   a notification cannot exist for a move that did not happen.
   ========================================================================= */

export type NotificationCard = {
  id: string;
  type: string;
  priority: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const FEED_LIMIT = 20;

export async function listNotifications(userId: string): Promise<{
  items: NotificationCard[];
  unread: number;
}> {
  const [rows, unread] = await Promise.all([
    db.notification.findMany({
      where: { recipientId: userId, archivedAt: null },
      orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
      take: FEED_LIMIT,
      select: {
        id: true,
        type: true,
        priority: true,
        title: true,
        body: true,
        link: true,
        readAt: true,
        createdAt: true,
      },
    }),
    db.notification.count({ where: { recipientId: userId, readAt: null, archivedAt: null } }),
  ]);

  return {
    items: rows.map((row) => ({
      ...row,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    unread,
  };
}

/** Just the count, for the poll that keeps the badge live. */
export async function countUnread(userId: string) {
  return db.notification.count({ where: { recipientId: userId, readAt: null, archivedAt: null } });
}

/**
 * Mark one read.
 *
 * Scoped by recipient in the WHERE rather than checked afterwards: an id from
 * a click is client input, and `updateMany` on a non-matching row is a no-op
 * instead of an error that reveals the row exists.
 */
export async function markRead(userId: string, notificationId: string) {
  await db.notification.updateMany({
    where: { id: notificationId, recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({
    where: { recipientId: userId, readAt: null, archivedAt: null },
    data: { readAt: new Date() },
  });
}


/* --- Events that are not transitions -------------------------------------- */

/**
 * Tell the admins who hold a permission that something happened.
 *
 * `applyTransition` does this for every status change, and for a status
 * change that is the right place — the notification, the email and the audit
 * row belong in one database transaction so none of them can exist without
 * the others.
 *
 * A formulary change request is not a status change. The partner stays
 * verified, nothing moves on the pipeline, and there is no `StatusHistory`
 * row to hang an idempotency key off. So it needs this: the same audience
 * resolution, the same in-app card, without inventing a transition to carry
 * it.
 *
 * Super admins are unioned in rather than expected to hold an explicit
 * grant, exactly as `resolveAudience` does it — the two must not disagree
 * about who "whoever reviews pricing" means.
 */
export async function notifyPermissionHolders(input: {
  permission: Permission;
  type: NotificationType;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  title: string;
  body: string;
  partnerId?: string;
  link?: string;
}): Promise<string[]> {
  const [granted, supers] = await Promise.all([
    db.adminPermission.findMany({
      where: {
        permission: PERMISSION_ENUM[input.permission] as never,
        user: { isActive: true, role: "ADMIN" },
      },
      select: { user: { select: { id: true, email: true } } },
    }),
    db.user.findMany({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { id: true, email: true },
    }),
  ]);

  const recipients = new Map<string, string>();
  for (const g of granted) recipients.set(g.user.id, g.user.email);
  for (const s of supers) recipients.set(s.id, s.email);

  if (recipients.size === 0) return [];

  await db.notification.createMany({
    data: [...recipients.keys()].map((recipientId) => ({
      recipientId,
      type: input.type as never,
      priority: (input.priority ?? "NORMAL") as never,
      title: input.title,
      body: input.body,
      partnerId: input.partnerId ?? null,
      link: input.link ?? (input.partnerId ? `/admin/partners/${input.partnerId}` : null),
    })),
    skipDuplicates: true,
  });

  return [...recipients.values()];
}
