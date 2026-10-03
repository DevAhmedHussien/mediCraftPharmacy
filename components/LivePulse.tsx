"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/* ===========================================================================
   Keeps a page current without anyone pressing reload.

   Asks /api/pulse for a version token every few seconds. When it differs from
   the last one, `router.refresh()` re-runs the server components and React
   swaps in the new markup — scroll position, focus and any typing in progress
   all survive, which a location.reload() would destroy.

   Polling pauses when the tab is hidden and fires immediately when it comes
   back, so a laptop left open overnight is not making a request every five
   seconds until morning.
   ========================================================================= */

const INTERVAL_MS = 5000;

export function LivePulse({ onUnread }: { onUnread?: (count: number) => void }) {
  const router = useRouter();
  const lastVersion = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      if (cancelled) return;

      try {
        const response = await fetch("/api/pulse", { cache: "no-store" });
        if (response.ok) {
          const { version, unread } = (await response.json()) as {
            version: string;
            unread: number;
          };

          onUnread?.(unread);

          // The first answer establishes the baseline; refreshing on it would
          // be a wasted render on every page load.
          if (lastVersion.current !== null && lastVersion.current !== version) {
            router.refresh();
          }
          lastVersion.current = version;
        }
      } catch {
        // Offline, or a deploy mid-poll. Try again on the next tick rather
        // than tearing the loop down.
      }

      if (!cancelled) timer = setTimeout(check, INTERVAL_MS);
    };

    void check();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void check();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, onUnread]);

  return null;
}
