import "server-only";

import {
  CONTACT_STAGE,
  contactInquirySms,
  PIPELINE_MOVE_BY_LABEL,
  PIPELINE_NAMES,
  sameName,
} from "@/lib/partner/ghl-pipeline";
import {
  addGhlNote,
  findGhlOpportunity,
  listGhlPipelines,
  sendGhlSms,
  setGhlOpportunityStatus,
  upsertGhlOpportunity,
} from "@/lib/services/ghl";
import { site } from "@/lib/site";

/* ===========================================================================
   Moving cards on the GoHighLevel boards.

   ORDER IS THE RETRY CONTRACT
   ---------------------------
   The partner worker retries a whole outbox row when this returns an error.
   So everything that is safe to repeat — finding the stage, moving the card —
   runs first and reports failure; the note and the text, which a retry would
   send twice, run last and only ever log. A missed text is a shame; the same
   text twice is a complaint.
   ========================================================================= */

type Resolved = { ok: true; pipelineId: string; stageId: string } | { ok: false; reason: string };

/** Pipeline and stage ids for two names, or which name was not found. */
async function resolveStage(pipelineName: string, stageName: string): Promise<Resolved> {
  const listed = await listGhlPipelines();
  if (!listed.ok) return listed;

  const pipeline = listed.pipelines.find((p) => sameName(p.name, pipelineName));
  if (!pipeline) return { ok: false, reason: `no GHL pipeline named "${pipelineName}"` };

  const stage = pipeline.stages.find((s) => sameName(s.name, stageName));
  if (!stage) return { ok: false, reason: `no stage "${stageName}" in GHL pipeline "${pipelineName}"` };

  return { ok: true, pipelineId: pipeline.id, stageId: stage.id };
}

async function pipelineId(name: string): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const listed = await listGhlPipelines();
  if (!listed.ok) return listed;
  const pipeline = listed.pipelines.find((p) => sameName(p.name, name));
  return pipeline ? { ok: true, id: pipeline.id } : { ok: false, reason: `no GHL pipeline named "${name}"` };
}

const firstNameOf = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] ?? "";

/** Best-effort: logged, never returned, because a retry would repeat it. */
async function noteAndText(
  contactId: string,
  logKey: string,
  note: string,
  sms: string | null
): Promise<void> {
  const noted = await addGhlNote(contactId, note);
  if (!noted.ok) console.error(`[crm] ${logKey}: note not added — ${noted.reason}`);

  if (!sms) return;
  const sent = await sendGhlSms(contactId, sms);
  if (!sent.ok) console.error(`[crm] ${logKey}: SMS not sent — ${sent.reason}`);
}

/**
 * Put the partner's card where this transition says.
 *
 * Returns an error string when the move itself failed, so the outbox row is
 * retried; null when it worked or there was nothing to do.
 */
export async function movePartnerOpportunity(input: {
  partnerId: string;
  contactId: string;
  label: string;
  companyName: string | null;
  contactName: string | null;
  hasPhone: boolean;
}): Promise<string | null> {
  const move = PIPELINE_MOVE_BY_LABEL[input.label];
  // Amendment labels and deliberate no-ops.
  if (!move) return null;

  const logKey = `partner ${input.partnerId}`;
  let where: string;

  if ("closeAs" in move) {
    const pid = await pipelineId(PIPELINE_NAMES.partner);
    if (!pid.ok) return pid.reason;

    const found = await findGhlOpportunity(input.contactId, pid.id);
    if (!found.ok) return found.reason;
    // Nothing on the board to close — a partner who predates the pipeline.
    if (!found.opportunity) return null;

    const closed = await setGhlOpportunityStatus(found.opportunity.id, move.closeAs);
    if (!closed.ok) return closed.reason;
    where = `closed as ${move.closeAs}`;
  } else {
    const target = await resolveStage(PIPELINE_NAMES.partner, move.stage);
    if (!target.ok) return target.reason;

    const name = [input.companyName, input.contactName].filter(Boolean).join(" – ") || "Partner";
    const moved = await upsertGhlOpportunity({
      contactId: input.contactId,
      pipelineId: target.pipelineId,
      stageId: target.stageId,
      name,
      status: move.status ?? "open",
    });
    if (!moved.ok) return moved.reason;
    where = `moved to ${move.stage}`;
  }

  /* An applicant who first wrote in through the contact form has become one:
     close that card as won rather than leave it open on the inquiry board. */
  if (input.label === "Application submitted") {
    const converted = await markInquiryConverted(input.contactId);
    if (converted) console.error(`[crm] ${logKey}: inquiry not marked converted — ${converted}`);
  }

  const sms =
    !("closeAs" in move) && move.sms && input.hasPhone
      ? move.sms({
          firstName: firstNameOf(input.contactName),
          portalUrl: `${site.url}/portal`,
        })
      : null;

  await noteAndText(input.contactId, logKey, `${input.label} — ${where}.`, sms);
  return null;
}

/** Mark the contact's open "Contact Us" card as won. Returns an error, or null. */
async function markInquiryConverted(contactId: string): Promise<string | null> {
  const pid = await pipelineId(PIPELINE_NAMES.contact);
  if (!pid.ok) return pid.reason;

  const found = await findGhlOpportunity(contactId, pid.id);
  if (!found.ok) return found.reason;
  if (!found.opportunity || found.opportunity.status === "won") return null;

  const won = await setGhlOpportunityStatus(found.opportunity.id, "won");
  if (!won.ok) return won.reason;

  const noted = await addGhlNote(contactId, "Applied as a partner — inquiry converted.");
  return noted.ok ? null : noted.reason;
}

/**
 * Open a card on the Contact Us board for a new inquiry.
 *
 * A second message from someone already on the board moves their card back to
 * New Inquiry: it is a new question and someone has to pick it up.
 */
export async function openContactInquiry(input: {
  contactId: string;
  firstName: string;
  name: string;
  hasPhone: boolean;
}): Promise<void> {
  const target = await resolveStage(PIPELINE_NAMES.contact, CONTACT_STAGE.newInquiry);
  if (!target.ok) {
    console.error(`[contact] GHL opportunity not opened — ${target.reason}`);
    return;
  }

  const opened = await upsertGhlOpportunity({
    contactId: input.contactId,
    pipelineId: target.pipelineId,
    stageId: target.stageId,
    name: input.name || "Website inquiry",
    status: "open",
  });
  if (!opened.ok) {
    console.error(`[contact] GHL opportunity not opened — ${opened.reason}`);
    return;
  }

  await noteAndText(
    input.contactId,
    "contact form",
    "Website contact form — moved to New Inquiry.",
    input.hasPhone ? contactInquirySms({ firstName: input.firstName }) : null
  );
}
