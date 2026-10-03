import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { db } from "@/lib/db";
import { env, isProduction } from "@/lib/env";
import { site } from "@/lib/site";
import type { EmailTemplate } from "@/lib/partner/status";

/* ===========================================================================
   Email: one send path, two drivers, and an outbox worker.

   WHY THE STUB WRITES TO DISK RATHER THAN LOGGING
   -----------------------------------------------
   A `console.log("would send email")` is unreviewable — nobody reads it, and
   it cannot answer "what did the applicant actually receive". The console
   driver writes each message to `.mail/` as a readable text file, so the
   whole pipeline can be walked and the resulting inbox inspected. That is
   also what makes the seeded stages worth looking at.

   WHY TEMPLATES ARE PLAIN FUNCTIONS
   ---------------------------------
   React Email is the eventual target and the templates are structured for it
   (subject, preheader, greeting, body, one CTA). They are plain text today
   because the brief asked for a stub, and because a half-built HTML layout
   that nobody has seen in Outlook is worth less than copy that is correct.
   Swapping the body builder for a React Email render is a change inside
   `renderTemplate`, not a change to any caller.

   EVERY TEMPLATE THE STATE MACHINE NAMES MUST EXIST. `TEMPLATES` is typed as
   a total Record over `EmailTemplate`, so adding a transition with an unmapped
   template is a compile error — which is the brief's "the build must fail"
   rule, enforced here rather than in a test.
   ========================================================================= */

export type EmailProps = Record<string, unknown>;

type Rendered = {
  subject: string;
  /** The line an inbox shows after the subject. */
  preheader: string;
  body: string;
  /** Absolute URL for the single call to action, if the email has one. */
  cta?: { label: string; path: string };
};

const portal = (path: string) => ({ label: "Open your account", path });
const adminLink = (partnerId: unknown) => ({
  label: "Review in the admin",
  path: `/admin/partners/${String(partnerId ?? "")}`,
});

/** The name used in a greeting, with a sane fallback. */
const who = (props: EmailProps) => String(props.contactName ?? props.companyName ?? "there");
const company = (props: EmailProps) => String(props.companyName ?? "the applicant");

const TEMPLATES: Record<EmailTemplate, (props: EmailProps) => Rendered> = {
  /* --- Partner-facing ---------------------------------------------------- */
  "partner/application-received": (p) => ({
    subject: "We received your enquiry — one quick step",
    preheader: "Confirm who you are and we will send your pricing.",
    body: `Hi ${who(p)},

Thank you for your enquiry to ${site.name}. Your account is open and you are signed in.

One step before we send our formulary: confirm who is asking and upload a photo of a government-issued ID. Our Provider Cost is confidential to each practice, so it does not go out to an address that filled in a form — this is how we know it is reaching you.

It takes a minute, and we usually release pricing the same business day.`,
    cta: portal("/portal/identity"),
  }),

  "partner/identity-received": (p) => ({
    subject: "We have your details",
    preheader: "Checking them now.",
    body: `Hi ${who(p)},

Thank you — we have your details and your ID. Someone will check them and release our formulary to your portal, usually the same business day.`,
    cta: portal("/portal"),
  }),

  "partner/identity-changes-requested": (p) => ({
    subject: "We need another look at your ID",
    preheader: "Something did not come through clearly.",
    body: `Hi ${who(p)},

We could not complete the check with what came through.${
      p.note ? `\n\n${String(p.note)}` : ""
    }

Reopen the step and send it again — nothing else is affected.`,
    cta: portal("/portal/identity"),
  }),

  "partner/product-list": (p) => ({
    subject: "Your application is approved — here is our pricing",
    preheader: "Review the formulary and tell us what you need.",
    body: `Hi ${who(p)},

Good news: your application is approved.

Your account now shows our full formulary with pricing. You can accept it as it stands, or ask for a call if you would like to discuss volume pricing — tell us what you are looking at and we will put a time in.`,
    cta: portal("/portal/pricing"),
  }),

  "partner/meeting-requested": (p) => ({
    subject: "We have your request for a call",
    preheader: "Someone will confirm a time shortly.",
    body: `Hi ${who(p)},

We have your request to discuss pricing, along with your notes. Someone from the team will confirm a time with you shortly.`,
    cta: portal("/portal"),
  }),

  "partner/meeting-times-offered": (p) => ({
    subject: "Pick a time for your pricing call",
    preheader: "A few times that work our end — choose whichever suits you.",
    body: `Hi ${who(p)},

Here are the times we have free for your pricing call:

${String(p.slotList ?? "")}

Pick whichever suits you in your account and it is booked — you will get the joining link straight away.${
      p.location ? `\n\nWhere: ${String(p.location)}` : ""
    }`,
    cta: portal("/portal"),
  }),

  "partner/meeting-scheduled": (p) => ({
    subject: "Your pricing call is booked",
    preheader: String(p.scheduledAt ?? "See your account for the time."),
    body: `Hi ${who(p)},

Your pricing call is booked for ${String(p.scheduledAt ?? "a time shown in your account")}.${
      p.conferenceUrl ? `\n\nJoin here: ${String(p.conferenceUrl)}` : ""
    }${p.location ? `\n\nWhere: ${String(p.location)}` : ""}

After the call we will build pricing specific to your practice and send it over for you to approve.`,
    cta: portal("/portal"),
  }),

  "partner/pricing-meeting": (p) => ({
    subject: "Let's discuss pricing",
    preheader: "The next step is a short call.",
    body: `Hi ${who(p)},

Your application is approved and the next step is a short call about pricing.`,
    cta: portal("/portal"),
  }),

  "partner/amendment-pricing-ready": (p) => ({
    subject: `Pricing for your new preparations`,
    preheader: "Review it and accept to start the change order.",
    body: `Hi ${who(p)},

We have priced the preparations you asked to add${
      p.changeOrderNumber ? ` — change order ${String(p.changeOrderNumber)}` : ""
    }.

Accept the prices and we will send the change order to sign. Nothing on your current schedule changes.`,
    cta: portal("/portal/products"),
  }),

  "partner/change-order-ready": (p) => ({
    subject: "Your change order is ready to sign",
    preheader: "The last step before these items go live.",
    body: `Hi ${who(p)},

Your change order${
      p.changeOrderNumber ? ` (${String(p.changeOrderNumber)})` : ""
    } is ready to sign. The new preparations go live on your schedule the moment it is signed.`,
    cta: portal("/portal/agreement"),
  }),

  "partner/negotiated-pricing": (p) => ({
    subject: "Your pricing is ready to review",
    preheader: "Built for your practice after our call.",
    body: `Hi ${who(p)},

Following our call, we have put together pricing specific to your practice. Each item shows our list price, the discount we have applied, and what you would pay.

Take a look and either accept it, or tell us what still does not work and we will go another round.`,
    cta: portal("/portal/pricing"),
  }),

  "partner/pricing-confirmed": (p) => ({
    subject: "Pricing confirmed",
    preheader: "Next: the full account details.",
    body: `Hi ${who(p)},

Your pricing is agreed and locked to your account.

The next step is the full account form — prescriber details, licences and where each kind of message should go. It takes about ten minutes and saves as you type.`,
    cta: portal("/portal/onboarding"),
  }),

  "partner/pricing-received": (p) => ({
    subject: "We have your price list",
    preheader: "Under review now.",
    body: `Hi ${who(p)},\n\nWe have your price list and are reviewing it.`,
    cta: portal("/portal"),
  }),

  "partner/pricing-changes-requested": (p) => ({
    subject: "A note on your pricing",
    preheader: "We have suggested a change.",
    body: `Hi ${who(p)},\n\nWe have suggested some changes to your pricing.${
      p.note ? `\n\n${String(p.note)}` : ""
    }`,
    cta: portal("/portal/pricing"),
  }),

  "partner/pricing-ready-to-accept": (p) => ({
    subject: "Your final pricing is ready",
    preheader: "Review and accept.",
    body: `Hi ${who(p)},\n\nYour final pricing is ready to review and accept.`,
    cta: portal("/portal/pricing"),
  }),

  "partner/onboarding-start": (p) => ({
    subject: "Complete your account details",
    preheader: "About ten minutes, saved as you go.",
    body: `Hi ${who(p)},

You can now complete your account details: your prescribers and their licence numbers, the practice, and where invoices and shipping notices should go.

Your progress saves automatically, so you can leave it and come back.`,
    cta: portal("/portal/onboarding"),
  }),

  "partner/documents-requested": (p) => ({
    subject: "One step left — your documents",
    preheader: "Licences and a photo ID.",
    body: `Hi ${who(p)},

Thank you — your account details are saved. The last thing we need is a copy of your licences and a government-issued photo ID for your authorised signer.

You can photograph them with a phone; PDF, JPG and PNG all work.`,
    cta: portal("/portal/documents"),
  }),

  "partner/onboarding-received": (p) => ({
    subject: "We have your account details",
    preheader: "Under review now.",
    body: `Hi ${who(p)},\n\nWe have your completed account details and are reviewing them. We will come back within one to two business days.`,
    cta: portal("/portal"),
  }),

  "partner/onboarding-changes-requested": (p) => ({
    subject: "Action needed on your account details",
    preheader: "A few things to correct.",
    body: `Hi ${who(p)},

We need a few corrections before we can approve your account details.${
      p.note ? `\n\n${String(p.note)}` : ""
    }`,
    cta: portal("/portal/onboarding"),
  }),

  "partner/onboarding-approved": (p) => ({
    subject: "Account details approved",
    preheader: "Next: your Master Service Agreement.",
    body: `Hi ${who(p)},

Your account details are approved. The last step is the Master Service Agreement, which we are sending now.`,
    cta: portal("/portal"),
  }),

  "partner/msa-sign-request": (p) => ({
    subject: "Please sign your Master Service Agreement",
    preheader: "The last step before your account goes live.",
    body: `Hi ${who(p)},

Your Master Service Agreement is ready to sign. It is the last step — once it is signed your account is active and you can start sending prescriptions.`,
    cta: { label: "Review and sign", path: "/portal/agreement" },
  }),

  "partner/msa-signed": (p) => ({
    subject: "Agreement signed — thank you",
    preheader: "A copy is in your account.",
    body: `Hi ${who(p)},

Thank you for signing. A copy of your agreement is available in your account at any time.

We are activating your account now and will confirm shortly.`,
    cta: portal("/portal"),
  }),

  "partner/welcome-verified": (p) => ({
    subject: `Welcome to ${site.name}`,
    preheader: "You are a verified partner.",
    body: `Hi ${who(p)},

You are now a verified ${site.name} partner. Everything is in place.

You can send prescriptions, see your agreed pricing, and track every order through your account. Your account representative is on ${site.providerEmail} and ${site.phone} for anything you need.`,
    cta: portal("/portal"),
  }),

  "partner/application-rejected": (p) => ({
    subject: "Update on your application",
    preheader: "We are not able to move forward.",
    body: `Hi ${who(p)},

Thank you for your interest in ${site.name}. We are not able to move forward with your application at this time.${
      p.note ? `\n\nReason: ${String(p.note)}` : ""
    }

If you think this is a mistake, or your circumstances change, please get in touch at ${site.providerEmail}.`,
  }),

  "partner/msa-declined": (p) => ({
    subject: "About your agreement",
    preheader: "We noticed it was declined.",
    body: `Hi ${who(p)},

We noticed the Master Service Agreement was declined. If that was a mistake, or if something in it needs discussing, reply to this message and we will pick it up.`,
  }),

  "partner/account-suspended": (p) => ({
    subject: "Your partner account has been suspended",
    preheader: "Please get in touch.",
    body: `Hi ${who(p)},

Your ${site.name} partner account has been suspended.${
      p.note ? `\n\nReason: ${String(p.note)}` : ""
    }

Please contact us at ${site.providerEmail} and we will work through it with you.`,
  }),

  "partner/account-reactivated": (p) => ({
    subject: "Your partner account is active again",
    preheader: "Everything is back on.",
    body: `Hi ${who(p)},\n\nYour ${site.name} partner account is active again. Nothing else is needed from you.`,
    cta: portal("/portal"),
  }),

  /* --- Admin-facing ------------------------------------------------------- */
  "admin/new-application": (p) => ({
    subject: `New partner application — ${company(p)}`,
    preheader: "Waiting on review.",
    body: `${company(p)} has applied to work with ${site.name}.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/product-list-sent": (p) => ({
    subject: `Approved — ${company(p)}`,
    preheader: "They can now see the formulary.",
    body: `You approved ${company(p)}. They can now see the formulary and pricing.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/meeting-requested": (p) => ({
    subject: `Meeting requested — ${company(p)}`,
    preheader: "Needs a time putting in.",
    body: `${company(p)} has asked to discuss pricing.${
      p.requestNotes ? `\n\nTheir notes:\n${String(p.requestNotes)}` : ""
    }`,
    cta: adminLink(p.partnerId),
  }),

  "admin/meeting-confirmed": (p) => ({
    subject: `Call booked — ${company(p)}`,
    preheader: "They picked one of the times offered.",
    body: `${company(p)} picked ${String(p.scheduledAt ?? "one of the times offered")}.${
      p.conferenceUrl ? `\n\nJoining link: ${String(p.conferenceUrl)}` : ""
    }${p.partnerNote ? `\n\nThey added:\n${String(p.partnerNote)}` : ""}`,
    cta: adminLink(p.partnerId),
  }),

  "admin/amendment-requested": (p) => ({
    subject: `Wants to add ${String(p.itemCount ?? "")} items — ${company(p)}`,
    preheader: "A verified partner is asking for more preparations.",
    body: `${company(p)} has asked to add ${String(p.itemCount ?? "some")} ${
      Number(p.itemCount) === 1 ? "preparation" : "preparations"
    } to their schedule — change order ${String(p.changeOrderNumber ?? "")}.${
      p.requestNotes ? `\n\nWhat they said:\n${String(p.requestNotes)}` : ""
    }

They stay verified and keep ordering everything already on their schedule while this is priced.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/pricing-meeting": (p) => ({
    subject: `Pricing meeting — ${company(p)}`,
    preheader: "Moved to the pricing stage.",
    body: `${company(p)} has moved to the pricing meeting stage.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/negotiated-pricing-sent": (p) => ({
    subject: `Pricing sent — ${company(p)}`,
    preheader: "Waiting on their decision.",
    body: `Negotiated pricing has been sent to ${company(p)}. Waiting on them to accept or ask for another round.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/pricing-another-round": (p) => ({
    subject: `Another pricing round — ${company(p)}`,
    preheader: "They want changes.",
    body: `${company(p)} has asked for another round on pricing.${
      p.note ? `\n\nWhat they said:\n${String(p.note)}` : ""
    }`,
    cta: adminLink(p.partnerId),
  }),

  "admin/pricing-submitted": (p) => ({
    subject: `Price list submitted — ${company(p)}`,
    preheader: "Waiting on review.",
    body: `${company(p)} submitted a price list.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/pricing-approved": (p) => ({
    subject: `Pricing approved — ${company(p)}`,
    preheader: "Waiting on the partner.",
    body: `Pricing for ${company(p)} is approved and awaiting their acceptance.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/pricing-accepted": (p) => ({
    subject: `Pricing accepted — ${company(p)}`,
    preheader: "They are moving to onboarding.",
    body: `${company(p)} accepted their pricing and is moving on to the full account form.`,
    cta: adminLink(p.partnerId),
  }),

  /* A public form was submitted. Deliberately contentless: a refill request
     is PHI, and the rule here is a type, a link, and nothing else. */
  "admin/site-enquiry": (p) => ({
    subject: String(p.subject ?? "A website form was submitted"),
    preheader: "Open the admin to read it.",
    body: String(p.body ?? "Something was submitted through the website."),
    cta: { label: "Open the enquiry", path: String(p.link ?? "/admin/enquiries") },
  }),

  "admin/identity-submitted": (p) => ({
    subject: `Identity submitted — ${company(p)}`,
    preheader: "Waiting on a check before the formulary goes out.",
    body: `${company(p)} confirmed who is requesting the formulary and uploaded a photo ID. Nothing is released until someone verifies it.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/onboarding-submitted": (p) => ({
    subject: `Account details submitted — ${company(p)}`,
    preheader: "Waiting on review.",
    body: `${company(p)} submitted their full account details.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/documents-submitted": (p) => ({
    subject: `Documents submitted — ${company(p)}`,
    preheader: "The file is complete and waiting on review.",
    body: `${company(p)} uploaded their documents. Account details and documents are both in, so the file is ready for review.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/onboarding-approved": (p) => ({
    subject: `Onboarding approved — ${company(p)}`,
    preheader: "Ready for the MSA.",
    body: `${company(p)}'s account details are approved and they are ready for the agreement.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/msa-sent": (p) => ({
    subject: `MSA sent — ${company(p)}`,
    preheader: "Waiting on a signature.",
    body: `The Master Service Agreement has been sent to ${company(p)}.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/msa-signed": (p) => ({
    subject: `MSA signed — ${company(p)}`,
    preheader: "Activating now.",
    body: `${company(p)} has signed the Master Service Agreement.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/partner-verified": (p) => ({
    subject: `${company(p)} is now a verified partner`,
    preheader: "Fully onboarded.",
    body: `${company(p)} has completed every stage and is now a verified partner.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/partner-rejected": (p) => ({
    subject: `Rejected — ${company(p)}`,
    preheader: "Application closed.",
    body: `${company(p)}'s application was rejected.${p.note ? `\n\nReason: ${String(p.note)}` : ""}`,
    cta: adminLink(p.partnerId),
  }),

  "admin/msa-declined": (p) => ({
    subject: `⚠ MSA declined — ${company(p)}`,
    preheader: "Needs attention.",
    body: `${company(p)} declined the Master Service Agreement. Someone should follow up.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/partner-suspended": (p) => ({
    subject: `Suspended — ${company(p)}`,
    preheader: "Account is off.",
    body: `${company(p)} has been suspended.${p.note ? `\n\nReason: ${String(p.note)}` : ""}`,
    cta: adminLink(p.partnerId),
  }),

  "admin/partner-reactivated": (p) => ({
    subject: `Reactivated — ${company(p)}`,
    preheader: "Account is back on.",
    body: `${company(p)} has been reactivated.`,
    cta: adminLink(p.partnerId),
  }),

  "admin/changes-requested-confirmation": (p) => ({
    subject: `Changes requested — ${company(p)}`,
    preheader: "They have been told.",
    body: `You asked ${company(p)} for changes. They have been emailed and their account shows what to fix.`,
    cta: adminLink(p.partnerId),
  }),
};

export function renderTemplate(template: EmailTemplate, props: EmailProps): Rendered {
  const build = TEMPLATES[template];
  if (!build) throw new Error(`No email template named "${template}".`);
  return build(props);
}

/* --- Delivery ------------------------------------------------------------- */

type SendResult = { providerMessageId: string | null };

/**
 * The console driver. Writes a readable message to `.mail/` and logs a line.
 *
 * Deliberately not silent and deliberately not a log-only stub: a file per
 * message is something a person can open and read, which is the only way to
 * review copy for a flow nobody has run yet.
 */
async function sendViaConsole(
  to: string,
  template: EmailTemplate,
  rendered: Rendered
): Promise<SendResult> {
  const directory = path.resolve(process.cwd(), ".mail");
  await mkdir(directory, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeTemplate = template.replace(/\//g, "__");
  const file = path.join(directory, `${stamp}_${safeTemplate}_${to.replace(/[^\w.@-]/g, "_")}.txt`);

  const url = (p: string) => `${env.APP_URL}${p}`;

  await writeFile(
    file,
    [
      `From:    ${env.EMAIL_FROM}`,
      `To:      ${to}`,
      `Subject: ${rendered.subject}`,
      `Preview: ${rendered.preheader}`,
      `Reply-To: ${env.EMAIL_REPLY_TO}`,
      "",
      "─".repeat(72),
      "",
      rendered.body,
      "",
      rendered.cta ? `[ ${rendered.cta.label} ] → ${url(rendered.cta.path)}` : "",
      "",
      "─".repeat(72),
      `${site.name} · ${site.address}`,
      `${site.providerEmail} · ${site.phone}`,
      "",
      "This message was written by the console mail driver and was NOT sent.",
      "Set EMAIL_DRIVER=resend with a RESEND_API_KEY to deliver for real.",
    ].join("\n"),
    "utf8"
  );

  console.log(`[email] ${template} → ${to}  (written to ${path.relative(process.cwd(), file)})`);
  return { providerMessageId: null };
}

async function sendViaResend(
  to: string,
  rendered: Rendered
): Promise<SendResult> {
  const url = (p: string) => `${env.APP_URL}${p}`;
  const text = [
    rendered.body,
    rendered.cta ? `\n${rendered.cta.label}: ${url(rendered.cta.path)}` : "",
    `\n—\n${site.name} · ${site.address}\n${site.providerEmail} · ${site.phone}`,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to,
      reply_to: env.EMAIL_REPLY_TO,
      subject: rendered.subject,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend rejected the message: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as { id?: string };
  return { providerMessageId: body.id ?? null };
}

/**
 * Send one message and log the attempt.
 *
 * Callers are the outbox worker and nothing else — application code enqueues,
 * it does not send, so a failed provider can never roll back a status change.
 */
export async function sendEmail(
  template: EmailTemplate,
  to: string,
  props: EmailProps
): Promise<void> {
  const rendered = renderTemplate(template, props);

  try {
    const result =
      env.EMAIL_DRIVER === "resend"
        ? await sendViaResend(to, rendered)
        : await sendViaConsole(to, template, rendered);

    await db.emailLog.create({
      data: {
        to,
        template,
        partnerId: typeof props.partnerId === "string" ? props.partnerId : null,
        providerMessageId: result.providerMessageId,
        status: "SENT",
      },
    });
  } catch (error) {
    await db.emailLog.create({
      data: {
        to,
        template,
        partnerId: typeof props.partnerId === "string" ? props.partnerId : null,
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/* --- The worker ----------------------------------------------------------- */

/** Exponential backoff, capped. 1m, 4m, 9m, 16m, 25m. */
const backoffMinutes = (attempts: number) => Math.min(attempts * attempts, 25);
const MAX_ATTEMPTS = 5;

/**
 * Drain the outbox.
 *
 * Idempotent and safe to run concurrently-ish: rows are claimed by flipping
 * them to SENDING before the network call, so a second worker skips them.
 * Called from a cron route and from the dev helper.
 */
export async function processOutbox(limit = 25): Promise<{
  sent: number;
  failed: number;
  dead: number;
}> {
  const due = await db.emailOutbox.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  let dead = 0;

  for (const row of due) {
    // Claim it first. A crash between here and the send costs one message
    // stuck in SENDING, which is recoverable; sending twice is not.
    const claimed = await db.emailOutbox.updateMany({
      where: { id: row.id, status: row.status },
      data: { status: "SENDING", attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    try {
      await sendEmail(row.template as never, row.to, (row.props ?? {}) as EmailProps);
      await db.emailOutbox.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), lastError: null },
      });
      sent += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const exhausted = attempts >= MAX_ATTEMPTS;

      await db.emailOutbox.update({
        where: { id: row.id },
        data: {
          status: exhausted ? "DEAD" : "FAILED",
          lastError: error instanceof Error ? error.message : String(error),
          nextAttemptAt: new Date(Date.now() + backoffMinutes(attempts) * 60_000),
        },
      });

      if (exhausted) dead += 1;
      else failed += 1;

      if (!isProduction) console.error(`[email] ${row.template} → ${row.to} failed`, error);
    }
  }

  return { sent, failed, dead };
}
