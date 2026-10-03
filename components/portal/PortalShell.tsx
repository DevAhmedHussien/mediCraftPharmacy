import Link from "next/link";
import type { ReactNode } from "react";

import { AccountBar } from "@/components/portal/AccountBar";
import { StepTracker } from "@/components/portal/StepTracker";
import type { PartnerStatus } from "@/lib/partner/status";
import { listNotifications } from "@/lib/services/notifications";
import { auth } from "@/lib/auth";

/**
 * The frame every applicant screen shares.
 *
 * The tracker sits above the content on every step rather than only on the
 * home screen, so the applicant never loses the shape of the process while
 * they are inside one part of it.
 */
export async function PortalShell({
  title,
  /** The practice, for the account bar. Falls back to the page title. */
  accountName,
  eyebrow,
  status,
  welcome,
  back,
  children,
}: {
  title: string;
  accountName?: string;
  eyebrow?: string;
  status: PartnerStatus;
  welcome?: boolean;
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  /* The bell and the live poll live in the shell, so every portal screen is
     current without each page remembering to ask. */
  const session = await auth();
  const notifications = session?.user
    ? await listNotifications(session.user.id)
    : { items: [], unread: 0 };

  return (
    <section className="section">
      <div className="container-narrow">
        <AccountBar
          practiceName={accountName ?? title}
          email={session?.user?.email ?? ""}
          notifications={notifications}
        />

        {welcome && (
          <p
            role="status"
            className="mb-8 rounded-tile border border-emerald-200 bg-emerald-50 px-4 py-3 text-meta text-emerald-900"
          >
            Your application has been received and you are signed in. This page is where you
            track it from here.
          </p>
        )}

        <div className="mb-10">
          <StepTracker status={status} />
        </div>

        {back && (
          <Link
            href={back.href}
            className="mb-4 block w-fit text-meta text-ink-soft transition-colors hover:text-brand-600"
          >
            ← {back.label}
          </Link>
        )}

        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-3 text-display-md font-black leading-tight text-ink text-balance">
          {title}
        </h1>

        <div className="mt-6">{children}</div>

      </div>
    </section>
  );
}
