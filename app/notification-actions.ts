"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { markAllRead, markRead } from "@/lib/services/notifications";

/* Marking a notification read. Both actions resolve the recipient from the
   session — an id arrives from a click and is therefore client input, so it is
   scoped in the WHERE rather than trusted. */

export async function readNotification(notificationId: string) {
  const session = await auth();
  if (!session?.user) return { ok: false as const };

  await markRead(session.user.id, notificationId);
  revalidatePath("/");
  return { ok: true as const };
}

export async function readAllNotifications() {
  const session = await auth();
  if (!session?.user) return { ok: false as const };

  await markAllRead(session.user.id);
  revalidatePath("/");
  return { ok: true as const };
}
