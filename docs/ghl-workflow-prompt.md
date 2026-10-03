# GoHighLevel workflow spec — MediCraft partner pipeline

Tag changes drive the notifications. Each step sends an email and an SMS, then
removes the tag of the step it came from, so a contact carries exactly one
pipeline tag at a time: where they are now.

The "remove" list on each branch is not invented — it is derived from the
application's own transition table, so it lists precisely the steps that can
precede that one.

Paste the block below into GHL's workflow builder or hand it to whoever builds
the automation.

---

```text
Build GoHighLevel automation for MediCraft Pharmacy (medicraftpharmacy.com).
When a partner's pipeline tag changes: notify them by EMAIL and SMS, then
remove the tag of the step they just left.

HOW OUR TAGS WORK — read this first.

Our application writes tags onto the GHL contact on every status change. Three
kinds, treated differently:

1. EVENT TAGS (26) — one per step. THESE TRIGGER THE MESSAGES, and each branch
   removes its predecessor so only the current one survives.

2. STAGE TAGS (5) — stage_application, stage_pricing, stage_onboarding,
   stage_agreement, stage_verified. OUR APPLICATION ALREADY MAINTAINS THESE:
   it adds the new one and removes the old one on every move. Do not add,
   remove or edit a stage_ tag anywhere in GHL — you would be fighting the
   app. Use them only to filter lists and to move the Opportunity.

3. SOURCE TAGS (2) — contact_us_form, partner_application. Added once, never
   removed, never used as a trigger here except workflow 3.

====================================================================
WORKFLOW 1 — "Partner pipeline"
Trigger: Contact Tag · Tag is added · filtered to the 26 event tags
Then an If/Else branch per tag. Each branch: Email → SMS → Remove Tag(s).
====================================================================

Links: https://medicraftpharmacy.com/portal/...
Merge fields: {{contact.first_name}}, {{contact.company_name}}
Every SMS ends: Reply STOP to opt out.
Order inside each branch: send the email, send the SMS, THEN remove tags.
Removing first can retrigger a branch on some GHL plans.

────────────────────────────────────────────────────────────────────
[partner_applied]
  EMAIL  Subject: We have your application, {{contact.first_name}}
         Thanks for applying to work with MediCraft Pharmacy. We have your
         details for {{contact.company_name}}. Next is a short identity check
         so we know who we are sending pricing to — about two minutes.
         Button: Start the ID check → /portal/identity
  SMS    MediCraft: got your application for {{contact.company_name}}. Next is
         a 2-minute ID check: medicraftpharmacy.com/portal/identity
  REMOVE nothing — this is the first step

[partner_identity_submitted]
  EMAIL  Subject: ID received — we are reviewing it
         Thanks, we have your identity documents. A pharmacist will confirm
         them, usually within one business day. Nothing is needed from you
         until then.
  SMS    MediCraft: ID received. We'll confirm within one business day —
         nothing needed from you yet.
  REMOVE partner_applied, admin_identity_changes_requested

[admin_identity_changes_requested]
  EMAIL  Subject: One more thing on your ID check
         We could not confirm your identity from what was uploaded. The reason
         is on your portal page. Once corrected we release your pricing
         straight away.
         Button: Review → /portal/identity
  SMS    MediCraft: we need one more thing on your ID check before pricing can
         go out. Details: medicraftpharmacy.com/portal/identity
  REMOVE partner_identity_submitted

[admin_identity_verified]
  EMAIL  Subject: Your formulary and pricing are ready
         Your identity is confirmed. Your formulary is open with pricing
         attached — filter by category, search by name, and tick what your
         practice dispenses. We price what you select, not the whole list.
         Button: Open your formulary → /portal/pricing
  SMS    MediCraft: you're verified — your formulary and pricing are ready.
         medicraftpharmacy.com/portal/pricing
  REMOVE partner_identity_submitted

[partner_meeting_requested]
  EMAIL  Subject: Your pricing call request
         We have your request to talk through pricing. Someone will come back
         with times within one business day.
  SMS    MediCraft: pricing call requested. We'll send times within one
         business day.
  REMOVE admin_identity_verified

[admin_meeting_scheduled]
  EMAIL  Subject: Your pricing call is booked
         Come with the volumes you expect and the lines that matter most — it
         saves the first ten minutes.
  SMS    MediCraft: your pricing call is booked. Bring expected volumes and
         your priority lines.
  REMOVE partner_meeting_requested

[admin_pricing_sent]
  EMAIL  Subject: Your negotiated pricing
         We have priced the medications you selected. Accepting locks those
         rates to {{contact.company_name}} for the term of your agreement. If
         they still do not work, ask for another round.
         Button: Review pricing → /portal/pricing
  SMS    MediCraft: your negotiated pricing is ready to review.
         medicraftpharmacy.com/portal/pricing
  REMOVE admin_meeting_scheduled

[partner_requested_new_pricing_round]
  EMAIL  Subject: We have your pricing feedback
         Thanks for telling us what did not work. We are revising the lines
         you flagged and will come back with new pricing.
  SMS    MediCraft: got your pricing feedback. We're revising and will come
         back shortly.
  REMOVE admin_pricing_sent, admin_pricing_revised

[admin_pricing_revised]
  EMAIL  Subject: Revised pricing for your review
         We have revised the lines you flagged. Accept to lock the rates, or
         tell us what still does not work.
         Button: Review pricing → /portal/pricing
  SMS    MediCraft: revised pricing is ready.
         medicraftpharmacy.com/portal/pricing
  REMOVE partner_requested_new_pricing_round

[partner_accepted_list_pricing]
  EMAIL  Subject: Pricing locked to your account
         You accepted our list pricing for the medications you selected. Those
         rates are now locked to {{contact.company_name}}. Next is your
         account detail — prescribers, DEA and NPI numbers.
         Button: Continue → /portal/onboarding
  SMS    MediCraft: pricing locked to your account. Next: prescriber details.
         medicraftpharmacy.com/portal/onboarding
  REMOVE admin_identity_verified

[partner_accepted_negotiated_pricing]
  EMAIL  Subject: Your negotiated pricing is agreed
         You accepted the revised pricing. Those rates are locked to
         {{contact.company_name}} for the term of your agreement. Next is your
         account detail — prescribers, DEA and NPI numbers.
         Button: Continue → /portal/onboarding
  SMS    MediCraft: your negotiated pricing is agreed and locked. Next:
         prescriber details. medicraftpharmacy.com/portal/onboarding
  REMOVE admin_pricing_sent, admin_pricing_revised

[system_onboarding_started]
  EMAIL  Subject: Let's set up your account
         Pricing is settled, so your account setup is open. We need your
         prescribers and their DEA and NPI numbers, then your documents.
         Button: Start → /portal/onboarding
  SMS    MediCraft: account setup is open.
         medicraftpharmacy.com/portal/onboarding
  REMOVE partner_accepted_list_pricing, partner_accepted_negotiated_pricing

[partner_account_details_done]
  EMAIL  Subject: Account details saved — documents next
         Your prescriber and practice details are saved. Last step is your
         paperwork: state licence, DEA registration and photo ID.
         Button: Upload documents → /portal/documents
  SMS    MediCraft: account details saved. Last step is your licence and DEA
         docs: medicraftpharmacy.com/portal/documents
  REMOVE system_onboarding_started

[partner_documents_submitted]
  EMAIL  Subject: Documents received — under review
         We have your documents and a reviewer is checking them. You will hear
         from us within one business day.
  SMS    MediCraft: documents received and under review. We'll be in touch
         within one business day.
  REMOVE partner_account_details_done

[admin_onboarding_changes_requested]
  EMAIL  Subject: Your onboarding needs a correction
         A reviewer has sent your onboarding back. The reason is on your
         portal page — nothing you have already entered is lost.
         Button: Review → /portal/onboarding
  SMS    MediCraft: your onboarding needs one correction. Details:
         medicraftpharmacy.com/portal/onboarding
  REMOVE partner_documents_submitted, partner_onboarding_resubmitted

[partner_onboarding_resubmitted]
  EMAIL  Subject: Thanks — your corrections are with us
         We have your updated onboarding and it is back with the reviewer.
  SMS    MediCraft: corrections received, back with the reviewer now.
  REMOVE admin_onboarding_changes_requested

[admin_onboarding_approved]
  EMAIL  Subject: Onboarding approved
         Your prescribers, practice details and documents are approved. Your
         Master Service Agreement is being prepared with your agreed price
         schedule bound into it.
  SMS    MediCraft: onboarding approved. Your agreement is being prepared.
  REMOVE partner_documents_submitted, partner_onboarding_resubmitted

[admin_msa_sent]
  EMAIL  Subject: Your Master Service Agreement is ready to sign
         Your agreement is ready, with the pricing you agreed attached as your
         own Schedule A. Read it, then sign in the portal.
         Button: Read and sign → /portal/agreement
  SMS    MediCraft: your Master Service Agreement is ready to sign.
         medicraftpharmacy.com/portal/agreement
  REMOVE admin_onboarding_approved, system_msa_voided

[partner_msa_declined]
  EMAIL  Subject: About your agreement
         Your Master Service Agreement was declined. If that was not intended,
         or there is a clause you want to talk through, reply and we will pick
         it up.
  SMS    MediCraft: your agreement was declined — reply or call if that wasn't
         intended.
  REMOVE admin_msa_sent, admin_msa_resent

[admin_msa_resent]
  EMAIL  Subject: Your agreement has been re-issued
         We have sent a fresh copy of your Master Service Agreement.
         Button: Read and sign → /portal/agreement
  SMS    MediCraft: a fresh copy of your agreement is ready to sign.
         medicraftpharmacy.com/portal/agreement
  REMOVE partner_msa_declined

[system_msa_voided]
  EMAIL  none — internal bookkeeping, a replacement agreement follows and
         sends its own message
  SMS    none
  REMOVE admin_msa_sent, admin_msa_resent
  INTERNAL notify the account manager only

[partner_msa_signed]
  EMAIL  Subject: Agreement signed — thank you
         We have your signed Master Service Agreement. Your account is being
         switched on now.
  SMS    MediCraft: agreement signed, thank you. Switching your account on now.
  REMOVE admin_msa_sent, admin_msa_resent

[partner_verified]
  EMAIL  Subject: You're verified — welcome to MediCraft
         {{contact.company_name}} is a verified MediCraft partner. Your agreed
         pricing is in force and you can start sending prescriptions.
         Button: Open your portal → /portal/welcome
  SMS    MediCraft: you're verified. {{contact.company_name}} is live — you can
         start sending prescriptions.
         medicraftpharmacy.com/portal/welcome
  REMOVE partner_msa_signed

[admin_application_rejected]
  EMAIL  Subject: About your MediCraft application
         We are not able to open an account for {{contact.company_name}} at
         this time. The reason is set out below. If you believe this is in
         error, reply to this email and a pharmacist will look again.
  SMS    MediCraft: there's an update on your application — please check your
         email.
         (Keep the SMS neutral. Never put the refusal itself in a text.)
  REMOVE every other event tag. A rejection can come from any step before
         verification, so this branch clears the lot:
         partner_applied, partner_identity_submitted,
         admin_identity_changes_requested, admin_identity_verified,
         partner_meeting_requested, admin_meeting_scheduled,
         admin_pricing_sent, admin_pricing_revised,
         partner_requested_new_pricing_round, partner_accepted_list_pricing,
         partner_accepted_negotiated_pricing, system_onboarding_started,
         partner_account_details_done, partner_documents_submitted,
         admin_onboarding_changes_requested, partner_onboarding_resubmitted,
         admin_onboarding_approved, admin_msa_sent, admin_msa_resent,
         partner_msa_declined, system_msa_voided

[admin_partner_suspended]
  EMAIL  Subject: Your MediCraft account has been suspended
         Your account is suspended and prescriptions cannot be submitted. The
         reason is set out below. Call the pharmacy and we will work through
         it with you.
  SMS    MediCraft: your account has been suspended — please check your email
         or call us.
  REMOVE partner_verified, admin_partner_reactivated
  INTERNAL also alert the account manager — a suspension deserves a phone
         call, not only an automation

[admin_partner_reactivated]
  EMAIL  Subject: Your account is active again
         Your account has been reactivated and you can submit prescriptions as
         normal.
  SMS    MediCraft: your account is active again — you can submit
         prescriptions as normal.
  REMOVE admin_partner_suspended

====================================================================
WORKFLOW 2 — "Pipeline board"
Trigger: Contact Tag · Tag is added · filtered to the 5 stage_ tags
====================================================================
No email, no SMS, and NO tag edits. Only move the Opportunity:
  stage_application → "Application"
  stage_pricing     → "Pricing"
  stage_onboarding  → "Onboarding"
  stage_agreement   → "Agreement"
  stage_verified    → "Verified", mark the Opportunity Won

====================================================================
WORKFLOW 3 — "Website enquiry acknowledgement"
Trigger: Contact Tag · Tag is added · contact_us_form
====================================================================
  EMAIL  Subject: We have your message
         Thanks for getting in touch with MediCraft Pharmacy. Someone will
         come back within one business day. Please do not send prescription or
         health details by email — call us for anything clinical.
  SMS    none — a website enquirer has not opted in to texts
  REMOVE nothing

====================================================================
SETTINGS FOR ALL WORKFLOWS
====================================================================
  Allow re-entry: YES — a partner passes through many steps
  Stop on response: NO
  Sending window: 08:00–18:00 America/New_York, queue outside those hours
  Skip SMS if the contact has no phone. Some partners share a practice
    switchboard already held by another contact, and this location rejects
    duplicate numbers, so phone can legitimately be empty.
  Email from: the pharmacy's verified sending domain
  Never put prescription details, health information, DEA numbers or pricing
    figures in an SMS.
  Never add, remove or edit a stage_ tag — the application owns those.
```
