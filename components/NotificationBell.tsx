"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";

import { readAllNotifications, readNotification } from "@/app/notification-actions";
import { LivePulse } from "@/components/LivePulse";
import type { NotificationCard } from "@/lib/services/notifications";
import { cn } from "@/lib/utils";

/* ===========================================================================
   The bell.

   The Notification table has always had a `link` column whose comment reads
   "where the bell click goes". There was no bell, so nothing ever went
   anywhere. Clicking a card marks it read and navigates to the thing it is
   about — the partner whose documents arrived, the pricing that was sent —
   rather than dropping someone on a list to go and find it.

   Live count comes from the same poll that keeps the page current, so the
   badge and the content can never disagree.
   ========================================================================= */

function ago(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function NotificationBell({
  items,
  unread: initialUnread,
  tone = "light",
}: {
  items: NotificationCard[];
  unread: number;
  /** The admin rail is dark; the portal header is not. */
  tone?: "light" | "dark";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [, startTransition] = useTransition();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => setUnread(initialUnread), [initialUnread]);

  // Close on a click anywhere else, and on Escape.
  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openCard = (card: NotificationCard) => {
    setOpen(false);

    /* Navigate first.
     *
     * Going somewhere is the whole reason the card was clicked; marking it
     * read is bookkeeping. This used to `await readNotification()` inside the
     * transition and push afterwards, so every click paid a server round trip
     * before the page moved — on a slow connection the card appeared to do
     * nothing, which is exactly the complaint the link column exists to fix.
     *
     * The unread count drops optimistically and the write is fired without
     * being awaited. If it fails the badge is briefly wrong until the next
     * poll corrects it, which is the right thing to be wrong about. */
    if (card.link) router.push(card.link);

    if (!card.readAt) {
      setUnread((n) => Math.max(0, n - 1));
      startTransition(() => {
        void readNotification(card.id).then(() => {
          // Only the no-link case needs a refresh to show the read state;
          // a push already re-renders the tree.
          if (!card.link) router.refresh();
        });
      });
    } else if (!card.link) {
      router.refresh();
    }
  };

  return (
    <div className="relative" ref={panel}>
      <LivePulse onUnread={setUnread} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        /* The label CONTAINS the glyph on the badge.
         
           It read "Notifications, 9 unread" while the badge showed "9+", and
           axe flags that pair: a voice-control user who says "click 9+" — the
           only thing they can see — addresses nothing, because the visible
           string is not part of the accessible name. Naming the badge's own
           text first fixes it and reads no worse. */
        aria-label={
          unread > 0
            ? `Notifications: ${unread > 9 ? "9+" : unread} unread`
            : "Notifications"
        }
        className={cn(
          "relative grid size-9 place-items-center rounded-lg transition-colors",
          tone === "dark"
            ? "text-white/70 hover:bg-white/10 hover:text-white"
            : "text-ink-soft hover:bg-sand hover:text-ink"
        )}
      >
        <Bell className="size-[1.1rem]" strokeWidth={2} aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            /* On `danger` rather than #d4483b, which measured 4.38:1 against
               white at 10px bold. `danger` is 6.57:1 and is the red the rest
               of the application already uses. */
            className="absolute right-1 top-1 grid min-w-[1.05rem] place-items-center rounded-full bg-danger px-1 text-[0.625rem] font-bold leading-[1.05rem] text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-[22rem] overflow-hidden rounded-[0.6rem] border border-ink-muted/30 bg-white"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <p className="text-meta font-bold text-ink">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    setUnread(0);
                    await readAllNotifications();
                    router.refresh();
                  })
                }
                className="inline-flex items-center gap-1 text-caption font-medium text-brand-600 hover:underline"
              >
                <Check className="size-3" strokeWidth={2.6} aria-hidden />
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-caption text-ink-muted">
              Nothing yet. This is where updates land.
            </p>
          ) : (
            <ul className="max-h-[24rem] overflow-y-auto">
              {items.map((card) => (
                <li key={card.id} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openCard(card)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-sand",
                      !card.readAt && "bg-brand-50/40"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 size-1.5 shrink-0 rounded-full",
                        card.readAt ? "bg-transparent" : "bg-brand-500"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-caption font-bold leading-snug text-ink">
                        {card.title}
                      </span>
                      <span className="mt-0.5 block text-caption leading-snug text-ink-soft">
                        {card.body}
                      </span>
                      <span className="mt-1 block font-mono text-caption text-ink-muted">
                        {ago(card.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
