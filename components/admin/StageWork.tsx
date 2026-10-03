import { MeetingScheduler } from "@/components/admin/MeetingScheduler";
import { PriceListEditor, type EditorLine } from "@/components/admin/PriceListEditor";
import { StartDraftButton } from "@/components/admin/StartDraftButton";
import { Cell, DataTable, Panel, Pill, Row } from "@/components/admin/ui";
import { PARTNER_STATUS, type PartnerStatus } from "@/lib/partner/status";

/* ===========================================================================
   The work this stage actually needs, and nothing else.

   The generic "Next step" buttons move a partner between states; this is the
   panel that does the stage's real job — putting a time on a meeting, or
   building the price list. Showing every stage's tools at every stage is how
   an admin ends up scheduling a call for someone who has not asked for one.
   ========================================================================= */

export type StageData = {
  status: PartnerStatus;
  partnerId: string;
  meeting: {
    id: string;
    requestNotes: string;
    requestedAt: string;
    scheduledAt: string | null;
    location: string | null;
    /** Times offered, as `datetime-local` values. */
    proposedSlots: string[];
    confirmedAt: string | null;
    conferenceUrl: string | null;
    partnerNote: string | null;
  } | null;
  /** Candidate times for the scheduler, as `datetime-local` values. */
  suggestions: string[];
  /** Whether those suggestions consulted a real diary. */
  knowsAvailability: boolean;
  draftLines: EditorLine[] | null;
  /** What the applicant said when asking for another round. */
  applicantNote: string | null;
  currentList: {
    version: number;
    status: string;
    adminComment: string | null;
    items: {
      id: string;
      productName: string;
      listPrice: string;
      discountPercent: string;
      finalPrice: string;
    }[];
  } | null;
};

const money = (value: string) =>
  Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });

export function StageWork({ data }: { data: StageData }) {
  const {
    status,
    partnerId,
    meeting,
    draftLines,
    currentList,
    applicantNote,
    suggestions,
    knowsAvailability,
  } = data;

  // A meeting has been asked for but not booked. Covers both halves of the
  // offer: nothing offered yet, and times offered that nobody has taken.
  if (status === PARTNER_STATUS.MEETING_REQUESTED && meeting && !meeting.scheduledAt) {
    return (
      <MeetingScheduler
        partnerId={partnerId}
        meetingId={meeting.id}
        requestNotes={meeting.requestNotes}
        requestedAt={meeting.requestedAt}
        suggestions={suggestions}
        knowsAvailability={knowsAvailability}
        alreadyOffered={meeting.proposedSlots}
      />
    );
  }

  /* Booked. The one thing an admin needs off this screen now is the joining
     link, so it is the panel rather than a line in the timeline. */
  // Booked, or reopened for another round: build the list.
  const buildingStages: PartnerStatus[] = [
    PARTNER_STATUS.PRICING_MEETING,
    PARTNER_STATUS.PRICING_CHANGES_REQUESTED,
  ];

  if (buildingStages.includes(status)) {
    return (
      <>
        {/* The booking, and then the work.
         *
         * These used to be mutually exclusive: a branch above returned this
         * panel on its own as soon as a call was booked, which made the
         * pricing controls below unreachable for the whole of PRICING_MEETING.
         * An admin could see the call they had booked and had no way to start
         * the draft it was booked to discuss. */}
        {meeting?.scheduledAt && (
          <Panel
            title="Pricing call booked"
            description={
              meeting.confirmedAt
                ? "The applicant picked this time from the ones offered."
                : "Booked directly by an admin — the applicant did not choose it."
            }
            className="mb-4"
          >
            <p className="text-[1.0625rem] font-bold">
              {new Date(meeting.scheduledAt).toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>

            {meeting.conferenceUrl ? (
              <p className="mt-2 text-[0.875rem]">
                <a
                  href={meeting.conferenceUrl}
                  className="font-semibold underline"
                  style={{ color: "var(--admin-accent)" }}
                >
                  Join the call
                </a>
              </p>
            ) : (
              <p className="mt-2 text-[0.875rem] text-[color:var(--admin-ink-70)]">
                {meeting.location
                  ? meeting.location
                  : "No joining link — send one, or set CALENDAR_DRIVER=google to attach a Meet link automatically."}
              </p>
            )}

            <blockquote
              className="mt-4 rounded-[5px] border-l-2 py-2 pl-3 text-[0.8125rem] leading-relaxed text-[color:var(--admin-ink-70)]"
              style={{ borderColor: "var(--admin-accent)", background: "#f4f7ff" }}
            >
              {meeting.partnerNote || meeting.requestNotes}
            </blockquote>
          </Panel>
        )}

        {draftLines && draftLines.length > 0 ? (
          <PriceListEditor partnerId={partnerId} lines={draftLines} canSend />
        ) : (
          <StartDraftButton
            partnerId={partnerId}
            revision={status === PARTNER_STATUS.PRICING_CHANGES_REQUESTED}
            applicantNote={applicantNote}
          />
        )}
      </>
    );
  }

  // Sent and waiting on them: show what they are looking at, read-only.
  if (currentList) {
    const total = currentList.items.reduce((sum, item) => sum + Number(item.finalPrice), 0);
    const listTotal = currentList.items.reduce((sum, item) => sum + Number(item.listPrice), 0);

    /* Once pricing is settled this table is reference, not work.
     *
     * It was rendered open at every later stage, so a reviewer opening an
     * ONBOARDING_SUBMITTED file — who is here to look at a photo ID — met
     * twenty-nine rows of agreed prices first and had to scroll past all of
     * them. Open while the decision is live; folded away once it is made. */
    const settled = status !== PARTNER_STATUS.NEGOTIATED_PRICING_SENT;
    const discount = currentList.items[0]
      ? `${Number(currentList.items[0].discountPercent)}% off list`
      : null;

    if (settled) {
      return (
        <details className="admin-panel group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
            <span className="text-[0.8125rem]">
              <span className="font-semibold">Pricing v{currentList.version}</span>
              <span className="text-[color:var(--admin-ink-50)]">
                {" · "}
                {currentList.items.length} products
                {discount ? ` · ${discount}` : ""}
                {" · "}
                {money(String(total))}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <Pill tone={currentList.status === "ACCEPTED" ? "good" : "info"}>
                {currentList.status.toLowerCase()}
              </Pill>
              <span className="admin-label group-open:hidden">Show</span>
              <span className="admin-label hidden group-open:inline">Hide</span>
            </span>
          </summary>

          <div className="border-t" style={{ borderColor: "var(--admin-border)" }}>
            <DataTable head={["Product", "List", "Discount", "They pay"]}>
              {currentList.items.map((item) => (
                <Row key={item.id}>
                  <Cell>{item.productName}</Cell>
                  <Cell numeric className="text-[color:var(--admin-ink-50)] line-through">
                    {money(item.listPrice)}
                  </Cell>
                  <Cell numeric>{Number(item.discountPercent)}%</Cell>
                  <Cell numeric className="font-semibold">
                    {money(item.finalPrice)}
                  </Cell>
                </Row>
              ))}
            </DataTable>
          </div>
        </details>
      );
    }

    return (
      <Panel
        title={`Pricing v${currentList.version}`}
        description="Sent. Waiting on the applicant to accept or ask for another round."
        bodyClassName="p-0"
        actions={<Pill tone={currentList.status === "ACCEPTED" ? "good" : "info"}>{currentList.status.toLowerCase()}</Pill>}
      >
        {currentList.adminComment && (
          <p className="border-b px-4 py-2.5 text-[0.8125rem] text-[color:var(--admin-ink-70)]" style={{ borderColor: "var(--admin-border)" }}>
            {currentList.adminComment}
          </p>
        )}

        <DataTable head={["Product", "List", "Discount", "They pay"]}>
          {currentList.items.map((item) => (
            <Row key={item.id}>
              <Cell>{item.productName}</Cell>
              <Cell numeric className="text-[color:var(--admin-ink-50)] line-through">
                {money(item.listPrice)}
              </Cell>
              <Cell numeric>{Number(item.discountPercent)}%</Cell>
              <Cell numeric className="font-semibold">
                {money(item.finalPrice)}
              </Cell>
            </Row>
          ))}
        </DataTable>

        <div className="flex justify-end gap-8 border-t px-4 py-3 text-[0.8125rem]" style={{ borderColor: "var(--admin-border)" }}>
          <span className="text-[color:var(--admin-ink-50)]">
            List {money(String(listTotal))}
          </span>
          <span className="font-semibold">Total {money(String(total))}</span>
        </div>
      </Panel>
    );
  }

  return null;
}
