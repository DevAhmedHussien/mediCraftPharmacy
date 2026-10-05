import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Prisma } from "@prisma/client";

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
  /**
   * The H1, when the subject line will not do as one.
   *
   * The subject usually IS the heading, and repeating it is right — it tells
   * a reader who opened from a notification that they are in the message they
   * thought they were. The sign-in code is the exception: its subject leads
   * with the digits so they can be read off a lock screen, and "272001 is
   * your sign-in code" sitting directly above a plate showing 272001 is the
   * same six digits three times inside four inches.
   */
  heading?: string;
  /** Absolute URL for the single call to action, if the email has one. */
  cta?: { label: string; path: string };
  /**
   * A quiet aside at the foot of the message — the "if this was not you"
   * paragraph, and nothing else.
   *
   * Its own field rather than a last paragraph of `body` because it is not
   * part of the message's argument. Set apart, the reader who needs it finds
   * it at a glance and the reader who does not can skip the whole block
   * instead of parsing a paragraph to learn it does not apply to them.
   */
  note?: { title: string; body: string };
  /**
   * A one-time code, set apart from the prose.
   *
   * Carried as its own field rather than left inside `body` so the HTML
   * layout can give it the treatment it needs — big, monospaced, selectable
   * — while the plain-text part still reads as a sentence. A code buried in
   * a paragraph is a code somebody has to pick out of a paragraph.
   */
  code?: string;
  /**
   * A numbered sequence, rendered as cards in the HTML part.
   *
   * Carried as data rather than baked into `body` so the two parts can each
   * do what they are good at: the HTML draws a card per step with the one
   * that needs the reader picked out in brand blue, and the plain-text part
   * renders the same steps as a numbered list. Writing the cards into the
   * prose would mean the text version arrived full of box-drawing.
   */
  steps?: { title: string; who: string; detail: string }[];
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
  /* THE WELCOME. One of two emails a partner now receives as a matter of
     course — this on registration, and welcome-verified at the end. The
     informational mail between them was silenced in lib/partner/status.ts.

     It therefore has to carry the whole map, not just the next click: a
     practice manager who reads one email should know what the process is,
     roughly how long it takes, and what we will ask them for. The steps are
     numbered because they are a sequence, and each says who is waiting —
     "you" or "us" — because the commonest question a partner asks is which
     of the two it is. */
  "partner/application-received": (p) => ({
    /* Subject and heading are the same sentence, so `heading` is not set and
       the shell falls back to the subject. Someone who opened this from a
       notification should see the line they tapped. */
    subject: "Welcome to MediCraft. Let\u2019s get your practice set up.",
    preheader: "Five short steps. Most practices are ready in less than 24 hours.",
    body: `Hi ${who(p)},

Five short steps, and we\u2019ll be with you throughout. Most practices are ready
in less than 24 hours.`,
    steps: [
      {
        title: "A quick introduction",
        who: "About a minute",
        detail:
          "To keep your pricing private, we confirm the identity of the person signing for your practice. A photo of a government-issued ID is all we need. It\u2019s used only for this check, and your pricing is never sent to an unverified email address.",
      },
      {
        title: "We\u2019ll confirm your details",
        who: "Usually the same business day",
        detail:
          "We match your ID to your practice and unlock your formulary. Nothing for you to do here.",
      },
      {
        title: "Choose your medications",
        who: "Whenever you\u2019re ready",
        detail:
          "Tell us what your practice dispenses and we\u2019ll price just those items. Happy with the rates? Great. Want to adjust? We can do another round, or set up a call.",
      },
      {
        title: "Set up your account",
        who: "About ten minutes",
        detail:
          "Add your prescribers\u2019 DEA (optional) and NPI numbers, and your shipping and billing contacts. Your progress saves as you go, so you can finish later.",
      },
      {
        title: "Sign and start ordering",
        who: "A few minutes",
        detail:
          "Review and sign our Master Service Agreement, with your agreed pricing attached as Exhibit A-1. Then your account is live.",
      },
    ],
    cta: { label: "Get started", path: "/portal/identity" },
    /* The sign-off goes in the note card rather than as a last paragraph: it
       is not part of the instructions, it is the way out of them. The number
       is `site.phone`, never a literal, so it cannot drift from the one on
       the website or the one in the address block below it. */
    note: {
      title: "Questions at any point?",
      body: `Reply to this email or call us at ${site.phone}. A real person will help.`,
    },
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

  "auth/login-code": (p) => ({
    /* The code leads the subject line. On a phone the notification preview is
       often all anyone reads — putting the digits first means the code can be
       used without opening the message at all. */
    subject: `${String(p.code)} is your MediCraft sign-in code`,
    /* Deliberately not the subject — see `heading` on Rendered. */
    heading: "Your sign-in code",
    preheader: "Expires in ten minutes. If this was not you, ignore it.",
    code: String(p.code),
    body: `Hi ${who(p)},

Enter this code on the sign-in page you just opened. Its terms are on the code
itself: ten minutes, one use.`,
    note: {
      title: "Did not ask to sign in?",
      body:
        "Ignore this message and nothing happens. A code on its own cannot reach your account, and this one expires by itself. If codes you did not ask for keep arriving, reply to this email and we will look at the account.",
    },
    /* No button, deliberately. A sign-in email with a one-click link is a
       sign-in email that works for anyone it gets forwarded to; the code has
       to be typed into the tab that asked for it, which is the whole point. */
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
    cta: portal("/portal/agreement/change-order"),
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

  /* THE OTHER ONE. Sent once, when the account goes live.

     Deliberately short and does not re-explain the product. Somebody who has
     reached this point has been through five steps with us; what they need
     is confirmation it is done, the two or three things they can now do, and
     how to reach a person. */
  "partner/welcome-verified": (p) => ({
    subject: `You are verified — ${site.name} is open to you`,
    preheader: "Your account is live. You can start sending prescriptions.",
    body: `Hi ${who(p)},

That is everything. Your account is verified and your agreed pricing is in
force.

From here you can:

  · Send prescriptions against your schedule
  · See your agreed Provider Cost, any time, in your account
  · Ask us to add preparations — we price them and send a change order to
    sign, and nothing already on your schedule changes
  · Download your signed agreement whenever you need a copy

Sign in at ${site.url} and everything is on your account page.

If you need a person rather than a page, we are on ${site.providerEmail} and
${site.phone}. Thank you for choosing us.`,
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
  "admin/site-inquiry": (p) => ({
    subject: String(p.subject ?? "A website form was submitted"),
    preheader: "Open the admin to read it.",
    body: String(p.body ?? "Something was submitted through the website."),
    cta: { label: "Open the inquiry", path: String(p.link ?? "/admin/inquiries") },
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

/* --- The HTML part -------------------------------------------------------
   Email is not the web, and the differences are not stylistic:

     · NO WEBFONTS. Satoshi and Lato will not load. A system stack is what
       actually renders, so the design is made of weight, size and spacing
       rather than a typeface.
     · NO FLEX OR GRID. Outlook renders through Word. Tables, or nothing.
     · NO EXTERNAL IMAGES. Most clients block them by default, and a logo
       that fails to load leaves a broken-image box at the top of a security
       email — the worst possible first impression for a message whose whole
       job is to be trusted. The wordmark is type.
     · INLINE STYLES. `<style>` blocks are stripped or clipped often enough
       that anything load-bearing has to be on the element.
     · DARK MODE IS NOT CONTROLLABLE. Several clients invert colours
       unasked. Every surface therefore sets its own background explicitly
       rather than inheriting, so an inversion produces something legible
       instead of white-on-white.

   WHY THE CODE IS TEXT AND NEVER AN IMAGE. People copy it. An image of six
   digits cannot be selected, cannot be read by a screen reader, and vanishes
   entirely under image blocking — which is the default in the clients most
   likely to receive this.
   ------------------------------------------------------------------ */

/**
 * The plain-text part.
 *
 * Not a fallback nobody reads: a message sent without one scores worse with
 * every spam filter there is, and some clients still prefer it. The code is
 * indented rather than run into a sentence so it can be picked out at a
 * glance in a text-only reader.
 */
function renderText(rendered: Rendered): string {
  const url = (p: string) => `${env.APP_URL}${p}`;

  const steps = rendered.steps?.length
    ? "\n" +
      rendered.steps
        .map((s, i) => `  ${i + 1}. ${s.title.toUpperCase()} — ${s.who}\n     ${s.detail}`)
        .join("\n\n") +
      "\n"
    : "";

  return [
    rendered.code ? `    ${rendered.code}\n    Expires ten minutes after it was sent, and works once.\n` : "",
    rendered.body,
    steps,
    rendered.cta ? `\n${rendered.cta.label}: ${url(rendered.cta.path)}` : "",
    rendered.note ? `\n${rendered.note.title}\n${rendered.note.body}` : "",
    `\n—\n${site.name} · ${site.address}\n${site.providerEmail} · ${site.phone}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Brand values, duplicated here because email cannot read a CSS variable. */
const MAIL = {
  ground: "#f5f8fd",
  surface: "#ffffff",
  line: "#dde4f0",
  ink: "#0f1a33",
  inkSoft: "#46536f",
  inkMuted: "#636e89",
  brand: "#1b54fb",
  brandTint: "#eef3ff",
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace",
} as const;

/**
 * The wordmark, as a hosted image with a typed fallback.
 *
 * WHY THE URL COMES FROM `site.url` AND NOT `env.APP_URL`. APP_URL is
 * `http://localhost:3000` in development, and an email carrying a localhost
 * image shows every recipient a broken box. `site.url` resolves to the
 * canonical public origin, which is the only kind of address an inbox can
 * fetch.
 *
 * WHY IT IS STILL SAFE WHEN THE IMAGE DOES NOT LOAD. Most clients block
 * remote images by default and show the alt text instead, so the alt is the
 * brand name — not "logo" — and it is styled, because the common clients
 * apply an img's own font and colour to its alt text. Blocked, this degrades
 * to "MediCraft Pharmacy" set in brand blue; it never degrades to a broken
 * icon, which on a sign-in email would be the worst possible first
 * impression.
 *
 * The asset is 1120×226 and served at 150px wide, so it stays sharp on a
 * retina screen. `width`/`height` attributes as well as CSS: Outlook ignores
 * the style and needs the attribute to reserve the space.
 */
function logoImage(): string {
  /* VERSIONED FILENAME, AND IT HAS TO STAY THAT WAY.
   *
   * Gmail does not fetch an image from your server — it fetches it once
   * through googleusercontent.com and serves every reader a cached copy,
   * keyed on the URL. Replacing the bytes behind an unchanged URL therefore
   * changes nothing for anyone who has already been sent that mail, and the
   * old logo keeps arriving for weeks. The first correct logo went out under
   * the old name and Gmail kept showing the wrong one.
   *
   * So the file carries a version. Replace the mark, bump the suffix, and
   * every client treats it as a new image. A query string (`?v=2`) works in
   * some clients and is stripped by others; a distinct path works
   * everywhere. */
  const src = `${site.url}/images/brand/medicraft-logo-2026.png`;

  /* 150x51 is the lockup's own 2.92:1, not a guess. The asset is rendered at
     876px wide from the SVG the site itself uses — see scripts/render-logo.ts
     — so it stays sharp at 3x and cannot drift from the mark in the header.

     The file this replaced was a DIFFERENT LOGO: a blue cross with the
     wordmark in black, nothing like the mortar and pestle. It had been sitting
     in public/images/brand under the right filename, so every email carried a
     brand nobody uses. */
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(site.name)}" width="150" height="51"
    style="display:block;width:150px;height:51px;border:0;outline:none;text-decoration:none;font-family:${MAIL.font};font-size:15px;font-weight:700;color:${MAIL.brand};">`;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Blank-line-separated prose becomes paragraphs. */
function paragraphs(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(
      (part) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${MAIL.inkSoft};">` +
        escapeHtml(part).replace(/\n/g, "<br>") +
        `</p>`
    )
    .join("");
}

/**
 * The one-time code, set as the thing the message is for.
 *
 * Letter-spaced monospace on a tinted plate. The trailing letter-space is
 * absorbed by a matching left pad, or the digits sit visibly off-centre —
 * the oldest bug in letter-spaced type.
 *
 * THE TERMS SIT INSIDE THE PLATE. "Expires in ten minutes, and works once"
 * is not trivia about the code, it is the second thing a reader needs after
 * the digits themselves — whether to type them now or go and find the tab
 * first. As a sentence further down the message it was read after the
 * decision it informs.
 */
function codePlate(code: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
      <tr>
        <td align="center" style="background:${MAIL.brandTint};border:1px solid #c9d8ff;border-radius:12px;padding:30px 20px 24px;">
          <div style="font-family:${MAIL.mono};font-size:44px;line-height:1.1;font-weight:700;letter-spacing:12px;padding-left:12px;color:${MAIL.ink};">${escapeHtml(
            code
          )}</div>
          <div style="font-family:${MAIL.font};font-size:13px;line-height:1.5;color:${MAIL.inkMuted};padding-top:14px;">
            Expires ten minutes after it was sent, and works once.
          </div>
        </td>
      </tr>
    </table>`;
}

/**
 * The aside.
 *
 * Flat tinted ground, no border, no number. It has to be distinguishable at a
 * glance from both the code plate above it and the step cards — the one is
 * the point of the message and the others are instructions, while this is
 * neither. A third bordered white card would have read as a fourth step.
 */
function noteCard(note: NonNullable<Rendered["note"]>): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 4px;">
      <tr>
        <td style="background:${MAIL.ground};border-radius:10px;padding:18px 20px;">
          <div style="font-family:${MAIL.font};font-size:14px;font-weight:700;line-height:1.4;color:${MAIL.ink};">
            ${escapeHtml(note.title)}
          </div>
          <div style="font-family:${MAIL.font};font-size:13px;line-height:1.65;color:${MAIL.inkSoft};padding-top:6px;">
            ${escapeHtml(note.body)}
          </div>
        </td>
      </tr>
    </table>`;
}

/**
 * The steps, as cards.
 *
 * THE FIRST ONE IS THE ONLY ONE THAT MATTERS TODAY, so it is the only one
 * that looks like it: brand blue, white type, and the number reversed out.
 * The rest are white with a hairline — present, legible, clearly not the
 * thing being asked for. A reader who takes one glance should come away
 * knowing what to do, and a reader who reads all five should come away
 * knowing the whole process.
 *
 * EVERY CARD IS ITS OWN TABLE. Not one table of five rows: Outlook collapses
 * cell spacing in long tables unpredictably, and a margin between separate
 * tables is the one vertical gap that renders the same everywhere.
 *
 * The number sits in a fixed-width cell beside the text rather than floated
 * or absolutely positioned — neither works in Outlook — so a two-line title
 * wraps beside the circle instead of under it.
 */
function stepCards(steps: NonNullable<Rendered["steps"]>): string {
  return steps
    .map((step, index) => {
      /* The first TWO cards are brand blue.
         One blue card marked "the step that needs you today". Two marks the
         part of the process that is live: you send the ID, we check it. Both
         happen now, usually inside a day, and neither has anything to do with
         the three that follow — those are weeks away and are context, not
         instructions. */
      const first = index < 2;

      const bg = first ? MAIL.brand : MAIL.surface;
      const border = first ? MAIL.brand : MAIL.line;
      const title = first ? "#ffffff" : MAIL.ink;
      const who = first ? "rgba(255,255,255,0.78)" : MAIL.brand;
      const detail = first ? "rgba(255,255,255,0.88)" : MAIL.inkSoft;
      const chipBg = first ? "#ffffff" : MAIL.brandTint;

      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;">
        <tr>
          <td style="background:${bg};border:1px solid ${border};border-radius:10px;padding:18px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="34" valign="top" style="width:34px;padding:0 12px 0 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" valign="middle"
                          style="width:26px;height:26px;background:${chipBg};border-radius:13px;
                                 font-family:${MAIL.font};font-size:12px;font-weight:700;color:${MAIL.brand};">
                        ${index + 1}
                      </td>
                    </tr>
                  </table>
                </td>
                <td valign="top">
                  <div style="font-family:${MAIL.font};font-size:14px;font-weight:700;line-height:1.35;color:${title};">
                    ${escapeHtml(step.title)}
                  </div>
                  <!-- Sentence case, not the small-caps this used to be.
                       The timings are now phrases — "Usually the same
                       business day" — and all-caps costs a long phrase more
                       legibility than the emphasis is worth. -->
                  <div style="font-family:${MAIL.font};font-size:12px;font-weight:700;color:${who};padding-top:4px;">
                    ${escapeHtml(step.who)}
                  </div>
                  <div style="font-family:${MAIL.font};font-size:13px;line-height:1.6;color:${detail};padding-top:7px;">
                    ${escapeHtml(step.detail)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
    })
    .join("");
}

function ctaButton(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
      <tr>
        <td style="background:${MAIL.brand};border-radius:8px;">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-family:${MAIL.font};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(
            label
          )}</a>
        </td>
      </tr>
    </table>`;
}

/** The whole message, as one table-based document. */
function renderHtml(rendered: Rendered): string {
  const url = (p: string) => `${env.APP_URL}${p}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(rendered.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${MAIL.ground};">
<!-- The inbox preview line. Hidden in the body, then padded with zero-width
     spaces so the client does not pull the first sentence of the message in
     after it. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
    rendered.preheader
  )}${"&#847;&zwnj;&nbsp;".repeat(60)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${MAIL.ground};">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <!-- 640, not the 600 everyone uses and not the 520 this was.
           The widest a message can be and still fit an unmaximised Outlook
           reading pane without a horizontal scrollbar. It buys about eight
           characters a line, which is what keeps a step card's detail to two
           lines instead of three — the cards were the reason to widen. -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">

        <tr>
          <td style="background:${MAIL.surface};border:1px solid ${MAIL.line};border-radius:12px;padding:0;">

            <!-- The mark sits inside the card, on white.
                 The asset carries a near-white plate baked into it, which
                 would read as a faint rectangle against the sand ground
                 outside the card and is invisible against the card itself. -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:28px 36px 22px;border-bottom:1px solid ${MAIL.line};">
                  ${logoImage()}
                </td>
              </tr>
              <tr>
                <td style="padding:32px 36px 34px;">

            <h1 style="margin:0 0 18px;font-family:${MAIL.font};font-size:23px;line-height:1.28;font-weight:700;letter-spacing:-0.01em;color:${MAIL.ink};">${escapeHtml(
              rendered.heading ?? rendered.subject
            )}</h1>

            <div style="font-family:${MAIL.font};">
              ${rendered.code ? codePlate(rendered.code) : ""}
              ${paragraphs(rendered.body)}
              ${rendered.steps?.length ? stepCards(rendered.steps) : ""}
              ${rendered.cta ? ctaButton(rendered.cta.label, url(rendered.cta.path)) : ""}
              ${rendered.note ? noteCard(rendered.note) : ""}
            </div>

                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 8px 0;font-family:${MAIL.font};font-size:12px;line-height:1.6;color:${MAIL.inkMuted};">
            ${escapeHtml(site.name)} · ${escapeHtml(site.address)}<br>
            <a href="mailto:${escapeHtml(site.providerEmail)}" style="color:${MAIL.inkMuted};">${escapeHtml(
              site.providerEmail
            )}</a>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
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
  const base = path.join(directory, `${stamp}_${safeTemplate}_${to.replace(/[^\w.@-]/g, "_")}`);

  await writeFile(
    `${base}.txt`,
    [
      `From:    ${env.EMAIL_FROM}`,
      `To:      ${to}`,
      `Subject: ${rendered.subject}`,
      `Preview: ${rendered.preheader}`,
      `Reply-To: ${env.EMAIL_REPLY_TO}`,
      "",
      "─".repeat(72),
      "",
      renderText(rendered),
      "",
      "─".repeat(72),
      "This message was written by the console mail driver and was NOT sent.",
      "Set EMAIL_DRIVER=resend with a RESEND_API_KEY to deliver for real.",
    ].join("\n"),
    "utf8"
  );

  /* The HTML part alongside it, openable in a browser.
     Reviewing email design by reading a text dump does not work — the whole
     point of the HTML is how it looks, and this is the only way to see it
     without sending a real message to a real person. */
  await writeFile(`${base}.html`, renderHtml(rendered), "utf8");

  console.log(
    `[email] ${template} → ${to}  (${path.relative(process.cwd(), base)}.txt / .html)`
  );
  return { providerMessageId: null };
}

/**
 * What each Resend status actually means to whoever is reading the log.
 *
 * The raw body is kept — it carries the detail — but a bare "422" in
 * `EmailLog.error` tells an operator nothing, and these four are the ones
 * that happen: a key that was rotated, a domain that was never verified, a
 * burst over the plan's rate, and a malformed address.
 */
const RESEND_HINTS: Record<number, string> = {
  401: "the API key was rejected (check RESEND_API_KEY)",
  403: "the sending domain is not verified for this key",
  422: "Resend could not accept the message as addressed",
  429: "rate limited by Resend",
};

/** Give up on a hung provider rather than holding a request open. */
const RESEND_TIMEOUT_MS = 10_000;

async function sendViaResend(to: string, rendered: Rendered): Promise<SendResult> {
  /* Both parts, always. A multipart message renders as designed where HTML
     is supported and still reads where it is not — and sending HTML alone is
     one of the strongest spam signals there is. */
  const text = renderText(rendered);
  const html = renderHtml(rendered);

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to,
        /* Snake case: this is the REST API, not the Node SDK. The SDK takes
           `replyTo` and silently drops `reply_to`; the HTTP endpoint is the
           other way round. Getting it wrong costs nothing visible — the mail
           sends, replies just go to a mailbox nobody reads. */
        reply_to: env.EMAIL_REPLY_TO,
        subject: rendered.subject,
        html,
        text,
      }),
      /* Without this, a provider that accepts the connection and then stalls
         holds the caller open indefinitely. The outbox is built to retry; it
         cannot retry something that never returns. */
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
  } catch (error) {
    /* A timeout or a DNS failure is not a rejected message — it is an
       unreachable provider, and the distinction matters when reading why a
       run of messages failed at 3am. */
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Resend was unreachable: ${reason}`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const hint = RESEND_HINTS[response.status];
    throw new Error(
      `Resend rejected the message: ${response.status}` +
        (hint ? ` — ${hint}` : "") +
        (detail ? ` · ${detail}` : "")
    );
  }

  const body = (await response.json()) as { id?: string };
  return { providerMessageId: body.id ?? null };
}

/**
 * Send one message now, log the attempt, and queue a retry if it failed.
 *
 * TWO KINDS OF CALLER, AND WHY THE RETRY IS HERE
 * ----------------------------------------------
 * The header on this function used to claim the outbox worker was the only
 * caller. That stopped being true: four server actions — amendment pricing,
 * change orders, admin notifications, and the login code — call it directly,
 * because queueing a sign-in code for the next cron tick would make the
 * feature unusable.
 *
 * Direct sending is right for those. What was wrong is what happened when one
 * failed: an `EmailLog` row marked FAILED, a rethrow, and a call site that
 * swallows it — correctly, because a bounced notification must not roll back
 * a change order the partner has already signed. The message was gone. No
 * retry, nobody told, and the only trace was a log row nothing reads.
 *
 * So a failed direct send now lands in `EmailOutbox`, which is the machinery
 * that already exists for exactly this: backoff, five attempts, then DEAD and
 * visible. The caller still gets the throw, and may still swallow it; the
 * message survives either way.
 *
 * `fromOutbox` stops the worker queueing its own retries — it owns the row it
 * is draining and records the failure against it itself.
 */
export async function sendEmail(
  template: EmailTemplate,
  to: string,
  props: EmailProps,
  options: { fromOutbox?: boolean } = {}
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
    const message = error instanceof Error ? error.message : String(error);

    await db.emailLog.create({
      data: {
        to,
        template,
        partnerId: typeof props.partnerId === "string" ? props.partnerId : null,
        status: "FAILED",
        error: message,
      },
    });

    if (!options.fromOutbox) await queueRetry(template, to, props, message);

    throw error;
  }
}

/**
 * Put a failed direct send on the queue so it is retried rather than lost.
 *
 * Never throws. This runs inside a catch block on a path the caller is about
 * to be told failed; an error here would replace a useful provider message
 * with a database one and lose the original.
 *
 * The idempotency key carries a coarse timestamp — the minute — so a flow
 * retried by a human a moment later does not silently collapse into the row
 * already queued, while a genuine double-submit within the same minute does.
 */
async function queueRetry(
  template: EmailTemplate,
  to: string,
  props: EmailProps,
  lastError: string
): Promise<void> {
  try {
    const minute = new Date().toISOString().slice(0, 16);

    await db.emailOutbox.createMany({
      data: [
        {
          idempotencyKey: `direct:${template}:${to}:${minute}`,
          template,
          to,
          props: props as Prisma.InputJsonValue,
          status: "FAILED",
          attempts: 1,
          lastError,
          // One minute out, matching the worker's first backoff step.
          nextAttemptAt: new Date(Date.now() + 60_000),
        },
      ],
      skipDuplicates: true,
    });
  } catch {
    /* The EmailLog row above is the record either way. */
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
      await sendEmail(row.template as never, row.to, (row.props ?? {}) as EmailProps, {
        fromOutbox: true,
      });
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
