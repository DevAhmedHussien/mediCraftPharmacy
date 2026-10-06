import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

import { StepTracker } from "@/components/portal/StepTracker";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";

/**
 * The header every portal screen shares.
 *
 * WHAT MOVED OUT OF IT
 * --------------------
 * This used to be the whole frame: it rendered the account bar (avatar, email,
 * notification bell, sign out), fetched the session and the notifications
 * itself, and wrapped everything in the marketing page's narrow container.
 * All of that now lives in app/portal/layout.tsx, which does it once for the
 * subtree instead of once per page — and, being a layout, keeps the rail and
 * the top bar mounted as the partner moves between sections.
 *
 * What is left is genuinely per-page: the title, the back link, and the step
 * tracker.
 *
 * WHY THE TRACKER DISAPPEARS WHEN VERIFIED
 * ----------------------------------------
 * A progress bar reading "Step 10 of 10" on every screen, forever, is not
 * progress — it is furniture that stopped meaning anything the moment the
 * process finished. It is shown while there is still a process to track, and
 * the rail takes over afterwards.
 */
export function PortalShell({
  title,
  eyebrow,
  status,
  bare,
  welcome,
  back,
  children,
}: {
  title: string;
  /**
   * Kept for the pages that still pass it. The practice name is in the rail
   * and the top bar now, so this is not rendered here.
   */
  accountName?: string;
  eyebrow?: string;
  status: PartnerStatus;
  /**
   * The page draws its own header and tracker, so this one steps aside.
   *
   * Only /portal sets it. The redesigned overview carries the practice name,
   * the step readout, the h1 and a phase-grouped tracker in one component —
   * rendering the shell's title and `StepTracker` behind it would give the
   * page two h1s and two trackers disagreeing about the same status.
   *
   * The shell still provides what is genuinely shared: the welcome banner,
   * the back link and the page wrapper.
   */
  bare?: boolean;
  welcome?: boolean;
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  const finished = status === PARTNER_STATUS.VERIFIED;

  return (
    <div className="dashboard">
      {welcome && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[0.875rem] text-emerald-900"
        >
          Your application has been received and you are signed in. This is where you
          track it from here.
        </p>
      )}

      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1 text-[0.8125rem] text-[color:var(--admin-ink-50)] transition-colors hover:text-[color:var(--admin-ink)]"
        >
          <ChevronLeft className="size-3.5" strokeWidth={2.2} aria-hidden />
          {back.label}
        </Link>
      )}

      {!bare && (
      <div className="mb-5">
        {eyebrow && (
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-ink-50)]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-[1.5rem] font-black leading-tight tracking-tight text-[color:var(--admin-ink)] text-balance">
          {title}
        </h1>
      </div>
      )}

      {!bare && !finished && (
        <div className="admin-panel mb-5 px-5 py-4">
          <StepTracker status={status} />
        </div>
      )}

      {children}
    </div>
  );
}
