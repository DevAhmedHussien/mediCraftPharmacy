import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { EmptyState, Panel, Pill, Since, type Tone } from "@/components/admin/ui";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";

/* ===========================================================================
   One queue, in the order it has to be worked.

   WHAT WAS WRONG WITH THREE LISTS
   -------------------------------
   The dashboard carried "Waiting on us" (partners), a separate change-order
   table, and a document count buried in a stat tile. Three places to look
   before knowing whether anything needed doing, three different sort orders,
   and no way to tell whether the four-day-old change order was more urgent
   than the two-day-old identity check. An operator's first question is "what
   is the oldest thing anybody is waiting on", and the page could not answer
   it because the answer was split across three panels.

   This is one list, oldest first, regardless of which kind of work it is.

   EVERY ROW NAMES THE ACTION
   --------------------------
   A row used to read "grove telehealth · identity submitted · 4d" — the
   status, which is a description of where the record is, not of what the
   person reading it should do. "Check their ID and release the formulary" is
   the same row saying the same thing in the imperative, and it is the
   difference between a queue you work and a list you scroll.
   ========================================================================= */

/** What an admin is actually being asked to do at each stop. */
const PARTNER_ACTION: Partial<Record<PartnerStatus, string>> = {
  [PARTNER_STATUS.IDENTITY_SUBMITTED]: "Check their ID, then release the formulary",
  [PARTNER_STATUS.MEETING_REQUESTED]: "Offer them times for a pricing call",
  [PARTNER_STATUS.PRICING_SUBMITTED]: "Review the price list they sent",
  [PARTNER_STATUS.PRICING_CHANGES_REQUESTED]: "Revise their pricing and send it back",
  [PARTNER_STATUS.PRICING_PARTNER_ACCEPTED]: "Confirm pricing and open their account details",
  [PARTNER_STATUS.ONBOARDING_SUBMITTED]: "Review their details, licences and photo ID",
  [PARTNER_STATUS.MSA_SIGNED]: "Verify the account so their prices go live",
};

/** The same, for a change order's own lifecycle. */
const AMENDMENT_ACTION: Record<string, string> = {
  REQUESTED: "Accept it and open a pricing draft",
  UNDER_REVIEW: "Finish the draft and send the prices",
  CHANGES_REQUESTED: "They asked for another round — revise the prices",
  MEETING_SCHEDULED: "Send the revised prices after the call",
  MEETING_REQUESTED: "Offer them times to talk the prices through",
  ACCEPTED: "They accepted — issue the change order for signature",
};

export type WorkItem = {
  key: string;
  href: string;
  /** The practice, as the admin knows it. */
  name: string;
  /** The imperative. What to do when the row is opened. */
  action: string;
  /** "Application", "Change order 2" — which conversation this belongs to. */
  kind: string;
  tone: Tone;
  waitingSince: Date;
};

export function partnerWorkItem(partner: {
  id: string;
  companyName: string;
  status: string;
  statusChangedAt: Date;
  application: { practiceName: string | null } | null;
}): WorkItem {
  const status = partner.status as PartnerStatus;

  return {
    key: `partner:${partner.id}`,
    href: `/admin/partners/${partner.id}`,
    name: partner.application?.practiceName ?? partner.companyName,
    /* Falls back to the status rather than to an empty cell. A status with no
       mapping is a new stop in the pipeline that nobody has written a verb
       for yet, and showing it is how that gets noticed. */
    action: PARTNER_ACTION[status] ?? status.replace(/_/g, " ").toLowerCase(),
    kind: "Application",
    tone: "warn",
    waitingSince: partner.statusChangedAt,
  };
}

export function amendmentWorkItem(order: {
  id: string;
  number: number;
  status: string;
  requestedAt: Date;
  partnerId: string;
  partner: { companyName: string };
  _count: { items: number };
}): WorkItem {
  return {
    key: `amendment:${order.id}`,
    href: `/admin/partners/${order.partnerId}`,
    name: order.partner.companyName,
    action:
      AMENDMENT_ACTION[order.status] ??
      `${order._count.items} ${order._count.items === 1 ? "preparation" : "preparations"} to price`,
    kind: `Change order ${order.number}`,
    tone: "info",
    waitingSince: order.requestedAt,
  };
}

export function Worklist({ items }: { items: WorkItem[] }) {
  /* Oldest first, across both kinds. The whole point of merging the lists is
     that a four-day-old change order outranks a one-day-old application, and
     two lists each sorted by age cannot express that. */
  const ordered = [...items].sort(
    (a, b) => a.waitingSince.getTime() - b.waitingSince.getTime()
  );

  return (
    <Panel
      headingLevel={3}
      title={ordered.length === 0 ? "Nothing is waiting" : `${ordered.length} waiting`}
      description={
        ordered.length === 0 ? undefined : "Longest first, applications and change orders together."
      }
      bodyClassName={ordered.length === 0 ? undefined : "px-0 pb-0"}
    >
      {ordered.length === 0 ? (
        <EmptyState
          title="The queue is clear"
          description="Every application and change order has been answered. New ones appear here the moment they arrive, oldest first."
          action={{ label: "Browse all partners", href: "/admin/partners" }}
        />
      ) : (
        <ul>
          {ordered.map((item) => (
            <li key={item.key} className="admin-row last:border-0">
              <Link
                href={item.href}
                className="admin-focus flex items-center gap-4 px-6 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-[0.875rem] font-semibold text-[color:var(--admin-ink)]">
                      {item.name}
                    </span>
                    <Pill tone={item.tone} plain>
                      {item.kind}
                    </Pill>
                  </span>
                  {/* The imperative, not the status. */}
                  <span className="mt-0.5 block truncate text-[0.8125rem] text-[color:var(--admin-ink-70)]">
                    {item.action}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-[0.8125rem] font-medium text-[color:var(--admin-ink-70)]">
                    <span className="sr-only">Waiting since </span>
                    <Since date={item.waitingSince} />
                  </span>
                </span>

                <ChevronRight
                  className="size-4 shrink-0 text-[color:var(--admin-ink-50)]"
                  strokeWidth={2}
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
