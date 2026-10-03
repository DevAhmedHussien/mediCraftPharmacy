import Link from "next/link";
import { LogOut } from "lucide-react";

import { NotificationBell } from "@/components/NotificationBell";
import type { NotificationCard } from "@/lib/services/notifications";

/**
 * Who is signed in, and what has happened since.
 *
 * The bell used to float on its own above the page with nothing beside it —
 * no practice name, no account, no way out except a "Sign out" link at the
 * very bottom of the document. This is the bar that was missing: the account
 * it belongs to on the left, notifications and sign-out on the right.
 */
export function AccountBar({
  practiceName,
  email,
  notifications,
}: {
  practiceName: string;
  email: string;
  notifications: { items: NotificationCard[]; unread: number };
}) {
  const initials =
    practiceName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "·";

  return (
    <div className="mb-10 flex items-center justify-between gap-4 border-b border-line pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-sand font-mono text-caption font-bold text-ink-soft"
        >
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-meta font-bold leading-tight text-ink">
            {practiceName}
          </span>
          <span className="block truncate font-mono text-caption text-ink-muted">{email}</span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <NotificationBell items={notifications.items} unread={notifications.unread} />

        <Link
          href="/api/auth/signout"
          aria-label="Sign out"
          title="Sign out"
          className="grid size-9 place-items-center rounded-[0.5rem] text-ink-soft transition-colors hover:bg-sand hover:text-ink"
        >
          <LogOut className="size-[1.05rem]" strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
