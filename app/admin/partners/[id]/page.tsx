import { notFound } from "next/navigation";

import { DocumentReview } from "@/components/admin/DocumentReview";
import { PipelineActions } from "@/components/admin/PipelineActions";
import { PipelineRail } from "@/components/admin/PipelineRail";
import { AmendmentMeetingPanel, AmendmentPanel } from "@/components/admin/AmendmentPanel";
import { PartnerSchedule } from "@/components/admin/PartnerSchedule";
import { PriceListEditor } from "@/components/admin/PriceListEditor";
import { StageWork } from "@/components/admin/StageWork";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTimeline } from "@/components/admin/StatusTimeline";
import { Facts, PageHeader, Panel, Pill, relativeDays } from "@/components/admin/ui";
import { hasPermission, requirePermissionPage } from "@/lib/guard";
import { missingTerms } from "@/lib/msa-terms";
import { specFor } from "@/lib/partner/documents";
import { displayDate, displayUsPhone } from "@/lib/masks";
import {
  allowedTransitions,
  PARTNER_STATUS,
  progressStep,
  type PartnerStatus,
} from "@/lib/partner/status";
import { localInputValue } from "@/lib/services/calendar";
import { getSelection } from "@/lib/services/formulary";
import { getOpenAmendment } from "@/lib/services/amendments";
import { getLatestMeeting } from "@/lib/services/meetings";
import { getPartnerDetail } from "@/lib/services/partners";
import {
  getCurrentPriceList,
  getDraftPriceList,
  getPartnerSchedule,
} from "@/lib/services/pricing";
import { getStatusHistory } from "@/lib/services/transition";

export const metadata = { title: "Partner" };

export default async function PartnerDetailPage({ params }: { params: { id: string } }) {
  const session = await requirePermissionPage("partners.view");

  const [partner, history, meeting, draft, currentList, selection, amendment, schedule] =
    await Promise.all([
      getPartnerDetail(params.id),
      getStatusHistory(params.id),
      getLatestMeeting(params.id),
      getDraftPriceList(params.id),
      getCurrentPriceList(params.id),
      getSelection(params.id),
      getOpenAmendment(params.id),
      getPartnerSchedule(params.id),
    ]);

  if (!partner) notFound();

  const application = partner.application;
  const onboarding = partner.onboarding;
  const status = partner.status as PartnerStatus;

  /* The open draft, shaped for the editor. Lifted out of the StageWork props
     because a change order needs the same editor and StageWork renders
     nothing for a VERIFIED partner. */
  const draftLines =
    draft?.items.map((item) => ({
      itemId: item.id,
      productName: item.product.name,
      strength: item.product.strength,
      form: item.product.form,
      unit: item.product.unit,
      // Decimal does not cross the client boundary; strings keep the
      // exactness that Number() would throw away.
      listPrice: item.listPrice.toString(),
      discountPercent: item.discountPercent.toString(),
      adminComment: item.adminComment,
      categoryName: item.product.category?.name ?? null,
      deaSchedule: item.product.deaSchedule,
      coldChain: item.product.coldChain,
    })) ?? null;


  // What this admin may do next, derived from the state machine rather than
  // hand-written, so the buttons and the rules cannot disagree.
  const unfilledTerms = missingTerms();

  const moves = allowedTransitions(status, "ADMIN").filter(
    (t) => !t.permission || hasPermission(session, t.permission)
  );

  return (
    <div className="space-y-4">
      <PageHeader
        back={{ href: "/admin/partners", label: "Partners" }}
        title={application?.practiceName ?? partner.companyName}
        description={`${partner.contactName} · ${partner.user.email}${
          partner.phone ? ` · ${displayUsPhone(partner.phone)}` : ""
        }`}
        actions={
          <div className="flex items-center gap-2">
            <span className="admin-label">{progressStep(status)}</span>
            <StatusBadge kind="partner" status={status} />
          </div>
        }
      />

      {(partner.rejectedReason || partner.suspendedReason) && (
        <p
          className="admin-panel px-4 py-2.5 text-[0.8125rem]"
          style={{ borderColor: "color-mix(in srgb, var(--status-danger-fg) 30%, transparent)", background: "var(--status-danger-bg)", color: "var(--status-danger-fg)" }}
        >
          <strong className="font-semibold">Reason:</strong>{" "}
          {partner.rejectedReason ?? partner.suspendedReason}
        </p>
      )}

      {/* Who is asking, and the ID they sent.
          Above the stage work on purpose: at IDENTITY_SUBMITTED this IS the
          decision, and releasing Provider Cost to the wrong person is the one
          thing this step exists to prevent. */}
      {application?.identitySubmittedAt && (
        <Panel
          title="Who is asking"
          description={
            application.identityVerifiedAt
              ? `Verified ${application.identityVerifiedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`
              : "Match the name against the photo ID below before releasing the formulary."
          }
          actions={
            application.identityVerifiedAt ? (
              <Pill tone="good">verified</Pill>
            ) : (
              <Pill tone="warn">unverified</Pill>
            )
          }
        >
          <Facts
            rows={[
              ["Name", application.requesterName],
              ["Role", application.requesterTitle],
              ["Direct phone", displayUsPhone(application.requesterPhone)],
              ["Work email", application.requesterEmail],
              ["Submitted", relativeDays(application.identitySubmittedAt)],
              ["Note", application.requesterNote],
            ]}
          />
        </Panel>
      )}

      {/* The stage's real work comes first — scheduling the call, building
          the prices — with the generic status moves underneath it. An admin
          opening this page is here to do the former. */}
      {/* Above the stage work, because a verified partner waiting on a price
          is the most time-sensitive thing on this page — and the stage panel
          below shows nothing at all for a VERIFIED partner, so without this
          the request would be invisible here. */}
      {amendment &&
        (() => {
          const view = {
            id: amendment.id,
            number: amendment.number,
            status: amendment.status,
            requestNotes: amendment.requestNotes,
            requestedAt: amendment.requestedAt.toISOString(),
            partnerNote: amendment.partnerNote,
            items: amendment.items,
            meeting: amendment.meetings[0]
              ? {
                  id: amendment.meetings[0].id,
                  requestNotes: amendment.meetings[0].requestNotes,
                  requestedAt: amendment.meetings[0].requestedAt.toISOString(),
                  proposedSlots: amendment.meetings[0].proposedSlots.map((slot) =>
                    localInputValue(slot)
                  ),
                  scheduledAt: amendment.meetings[0].scheduledAt?.toISOString() ?? null,
                  confirmedAt: amendment.meetings[0].confirmedAt?.toISOString() ?? null,
                  durationMinutes: amendment.meetings[0].durationMinutes,
                  location: amendment.meetings[0].location,
                  partnerNote: amendment.meetings[0].partnerNote,
                }
              : null,
          };

          return (
            <>
              <AmendmentPanel amendment={view} hasDraft={Boolean(draftLines?.length)} />
              {/* The change order's own call, offered with the same scheduler
                  the first application uses. */}
              <AmendmentMeetingPanel amendment={view} partnerId={partner.id} />

              {/* The editor the panel above asks for.
                  `StageWork` renders nothing for a VERIFIED partner — it only
                  covers the original pipeline — so without this the admin was
                  told to price a change order in an editor that was not on the
                  page. */}
              {draftLines && draftLines.length > 0 && (
                <PriceListEditor partnerId={partner.id} lines={draftLines} canSend={false} />
              )}
            </>
          );
        })()}

      {/* Where they are, before anything else on the page. An admin opening
          a partner asks "what stage is this at" before they ask anything
          else, and the answer used to be one word next to the title. */}
      <PipelineRail status={status} />

      <StageWork
        data={{
          status,
          partnerId: partner.id,
          meeting: meeting
            ? {
                id: meeting.id,
                requestNotes: meeting.requestNotes,
                requestedAt: meeting.requestedAt.toISOString(),
                scheduledAt: meeting.scheduledAt?.toISOString() ?? null,
                location: meeting.location,
                proposedSlots: meeting.proposedSlots.map((slot) => localInputValue(slot)),
                confirmedAt: meeting.confirmedAt?.toISOString() ?? null,
                conferenceUrl: meeting.conferenceUrl,
                partnerNote: meeting.partnerNote,
              }
            : null,
          // The note from the most recent "another round" request, so the
          // admin revising can see what they are revising against.
          applicantNote:
            history.find((entry) => entry.toStatus === "PRICING_CHANGES_REQUESTED")?.note ?? null,
          draftLines,
          currentList: currentList
            ? {
                version: currentList.version,
                status: currentList.status,
                adminComment: currentList.adminComment,
                items: currentList.items.map((item) => ({
                  id: item.id,
                  productName: item.product.name,
                  listPrice: item.listPrice.toString(),
                  discountPercent: item.discountPercent.toString(),
                  finalPrice: item.finalPrice.toString(),
                })),
              }
            : null,
        }}
      />

      {/* The move that follows the work, directly under the work.
          These were separated by the schedule and agreement panels, so the
          thing you do after building a price list was two screens below the
          price list. */}
      <PipelineActions
        partnerId={partner.id}
        status={status}
        moves={moves.map((m) => ({ to: m.to, label: m.label, permission: m.permission ?? null }))}
      />

      {/* The agreement has thirty-six commercial terms that the pharmacy fills
          in. Nobody should discover they were blank after a partner has signed
          — see lib/msa-terms.ts. Shown only where the next step involves
          sending one. */}
      {unfilledTerms.length > 0 &&
        (status === PARTNER_STATUS.ONBOARDING_SUBMITTED ||
          status === PARTNER_STATUS.ONBOARDING_APPROVED) && (
          <p
            className="admin-panel px-4 py-2.5 text-[0.8125rem]"
            style={{ borderColor: "#e8cf9a", background: "#fdf8ee", color: "#8a6416" }}
          >
            <strong className="font-semibold">
              {unfilledTerms.length} agreement terms are still blank
            </strong>{" "}
            — they will print as empty lines in the MSA this partner signs. Fill them in{" "}
            <code className="font-mono">lib/msa-terms.ts</code>: {unfilledTerms.slice(0, 6).join(", ")}
            {unfilledTerms.length > 6 ? `, and ${unfilledTerms.length - 6} more.` : "."}
          </p>
        )}

      {/* What they pay today, across the original agreement and every signed
          change order since. The pipeline panels above only ever show one
          negotiation's numbers, and they show nothing at all once a partner is
          verified — so without this, the live prices of a live account were
          not on this page anywhere. */}
      <PartnerSchedule
        lines={schedule.map((row) => ({
          id: row.id,
          productName: row.product.name,
          strength: row.product.strength,
          form: row.product.form,
          packageSize: row.product.packageSize,
          unit: row.product.unit,
          // Decimal columns are stringified at the boundary, like everywhere
          // else in this page — Number() would round them on the way out.
          listPrice: row.product.listPrice.toString(),
          price: row.price.toString(),
          deaSchedule: row.product.deaSchedule,
          coldChain: row.product.coldChain,
          effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
        }))}
      />

      {/* The agreement as it stands for this partner, with their own price
          book spliced in as Schedule A-1. Generated on request — a stored copy
          is one that goes stale the moment the pricing changes. */}
      <Panel
        title="Agreement"
        description="The Master Service Agreement for this partner, with their agreed pricing as Schedule A-1."
      >
        <a
          href={`/api/agreement/${partner.id}`}
          target="_blank"
          rel="noopener"
          className="admin-btn admin-btn-secondary"
        >
          Open the agreement (PDF)
        </a>
      </Panel>


      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Panel title="Practice">
            <Facts
              rows={[
                ["Account type", application?.accountType],
                ["Primary location", application?.isPrimaryLocation ? "Yes" : "No"],
                ["Address", application?.practiceAddress],
                [
                  "City / State / ZIP",
                  [application?.practiceCity, application?.practiceState, application?.practiceZip]
                    .filter(Boolean)
                    .join(", "),
                ],
                ["Phone", displayUsPhone(application?.practicePhone)],
                ["Fax", displayUsPhone(application?.practiceFax)],
                ["Heard about us", application?.howDidYouHearAboutUs],
                ["MediCraft rep", application?.medicraftRep],
              ]}
            />
          </Panel>

          <Panel title="Prescribers" description="Identifiers are shown as last four only.">
            {!application?.prescribers.length ? (
              <p className="text-[0.8125rem] text-[color:var(--admin-ink-50)]">
                No prescribers on this application.
              </p>
            ) : (
              <div className="space-y-4">
                {application.prescribers.map((prescriber) => (
                  <div
                    key={prescriber.id}
                    className="rounded-2xl border p-3"
                    style={{ borderColor: "var(--admin-border)" }}
                  >
                    <p className="text-[0.8125rem] font-semibold">{prescriber.name}</p>
                    {prescriber.signatureText && (
                      <p className="mt-0.5 text-[0.75rem] text-[color:var(--admin-ink-50)]">
                        Attested as “{prescriber.signatureText}”
                        {prescriber.signedAt &&
                          ` on ${prescriber.signedAt.toLocaleDateString("en-US")}`}
                      </p>
                    )}
                    <div className="mt-3">
                      <Facts
                        rows={[
                          ["DEA", prescriber.deaLast4 ? `•••• ${prescriber.deaLast4}` : null],
                          ["DEA expires", displayDate(prescriber.deaExpiration)],
                          ["NPI", prescriber.npiLast4 ? `•••• ${prescriber.npiLast4}` : null],
                          [
                            "State licence",
                            prescriber.stateLicenseLast4
                              ? `•••• ${prescriber.stateLicenseLast4}`
                              : null,
                          ],
                        ]}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* What they actually asked to be priced on. A reviewer opening a
              partner mid-negotiation needs this before anything else: it is
              what the call is about and what the draft is built from. */}
          {selection.length > 0 && (
            <Panel
              title="Their formulary selection"
              description={`${selection.length} ${selection.length === 1 ? "medication" : "medications"} chosen from the catalogue. A price-list draft is built from exactly these.`}
              bodyClassName="p-0"
            >
              <SelectionList selection={selection} />
            </Panel>
          )}

          <DocumentReview
            documents={partner.documents.map((doc) => ({
              id: doc.id,
              label: specFor(doc.type)?.label ?? doc.type,
              filename: doc.filename,
              mime: doc.mime,
              size: doc.size,
              status: doc.status,
              reviewerComment: doc.reviewerComment,
              uploadedAt: doc.uploadedAt.toISOString(),
            }))}
          />

          {/* Only once they have actually filled it in. Before that the
              panel would be a column of dashes pretending to be a record. */}
          {onboarding?.submittedAt && (
            <Panel
              title="Account details"
              description={`Submitted ${onboarding.submittedAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}. Identifiers are shown as last four only.`}
            >
              <Facts
                rows={[
                  ["Legal entity", onboarding.legalBusinessName],
                  ["Trading as", onboarding.dba],
                  [
                    "Card on file",
                    onboarding.cardLast4
                      ? `${onboarding.cardBrand ?? "Card"} ending ${onboarding.cardLast4}` +
                        (onboarding.cardExpMonth && onboarding.cardExpYear
                          ? ` · expires ${String(onboarding.cardExpMonth).padStart(2, "0")}/${String(
                              onboarding.cardExpYear
                            ).slice(-2)}`
                          : "")
                      : null,
                  ],
                  [
                    "Business address",
                    [
                      onboarding.businessStreet,
                      onboarding.businessSuite,
                      [onboarding.businessCity, onboarding.businessState, onboarding.businessZip]
                        .filter(Boolean)
                        .join(", "),
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  ],
                  [
                    "Billing address",
                    [
                      onboarding.billingStreet,
                      onboarding.billingSuite,
                      [onboarding.billingCity, onboarding.billingState, onboarding.billingZip]
                        .filter(Boolean)
                        .join(", "),
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  ],
                  [
                    "States of operation",
                    (onboarding.statesOfOperation as string[] | null)?.join(", "),
                  ],
                  [
                    "Authorised signer",
                    [onboarding.signerName, onboarding.signerTitle].filter(Boolean).join(" · "),
                  ],
                  ["Signer email", onboarding.signerEmail],
                  ...onboarding.licenses.map((licence) => [
                    licence.type === "PHARMACY_LICENSE" ? "Pharmacy licence" : "Licence",
                    [
                      licence.numberLast4 ? `•••• ${licence.numberLast4}` : null,
                      licence.state,
                      licence.expiresAt ? `expires ${displayDate(licence.expiresAt)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  ] as [string, string | null]),
                ]}
              />
            </Panel>
          )}

          <Panel title="Communications preference">
            <Facts
              rows={[
                ["Rx questions — email", application?.rxQuestionsEmail],
                ["Rx questions — phone", displayUsPhone(application?.rxQuestionsPhone)],
                ["Shipping — email", application?.shippingEmail],
                ["Shipping — fax", displayUsPhone(application?.shippingFax)],
                ["Invoices — email", application?.invoicesEmail],
                ["Invoices — fax", displayUsPhone(application?.invoicesFax)],
              ]}
            />
          </Panel>
        </div>

        <StatusTimeline
          entries={history.map((entry) => ({
            id: entry.id,
            fromStatus: entry.fromStatus,
            toStatus: entry.toStatus,
            actorEmail: entry.actorEmail,
            actorRole: entry.actorRole,
            note: entry.note,
            createdAt: entry.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}


/**
 * The partner's chosen medications.
 *
 * Grouped by category rather than listed flat: a reviewer scanning forty lines
 * wants to see "twelve weight management, eight TRT" before they see
 * individual products.
 */
function SelectionList({
  selection,
}: {
  selection: Awaited<ReturnType<typeof getSelection>>;
}) {
  const groups = new Map<string, typeof selection>();
  for (const item of selection) {
    const key = item.categoryName ?? "Uncategorised";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--admin-border)" }}>
      {[...groups.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([category, items]) => (
          <details key={category} className="group px-4 py-2.5" open={groups.size <= 3}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <span className="text-[0.8125rem] font-medium">{category}</span>
              <span className="flex items-center gap-2">
                <Pill>{items.length}</Pill>
                <span className="admin-label group-open:hidden">Show</span>
                <span className="admin-label hidden group-open:inline">Hide</span>
              </span>
            </summary>

            <ul className="mt-2 space-y-1.5">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-[0.8125rem]"
                >
                  <span className="min-w-0 flex-1">
                    {item.name}
                    <span className="admin-id ml-2 text-[color:var(--admin-ink-50)]">
                      {[item.strength, item.form].filter(Boolean).join(" · ")}
                    </span>
                    {item.deaSchedule && item.deaSchedule !== "NC" && (
                      <span className="ml-2">
                        <Pill tone="warn">{item.deaSchedule}</Pill>
                      </span>
                    )}
                    {item.coldChain && (
                      <span className="ml-1.5">
                        <Pill tone="info">cold</Pill>
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-[color:var(--admin-ink-70)]">
                    ${Number(item.listPrice).toFixed(2)}
                    <span className="text-[color:var(--admin-ink-50)]">/{item.unit}</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
    </div>
  );
}
