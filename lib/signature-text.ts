import { createHash } from "node:crypto";

import { BUD_ROWS, MSA_TERMS, term, type MsaTerms } from "@/lib/msa-terms";

/* ===========================================================================
   The agreement text and its fingerprint.

   This is MediCraft Pharmacy's Master Service Agreement, MSA v2026.1, as
   supplied. The prose is the document's own; the only changes are the ones a
   plain-text rendering forces — no page furniture, and the two-column BUD and
   shipping tables laid out as lists.

   WHAT IS NOT HERE, AND WHY
   -------------------------
   The signed PDF carries four parts: the Agreement body (§1–16), Exhibit A
   (pricing and payment terms), Schedule A-1 (the 692-item Partner Formulary)
   and Exhibit B (change order). Only the body is reproduced here.

   Exhibit A and Schedule A-1 are per-partner and already live in the
   database: Exhibit A's commercial terms are the negotiated price list the
   partner accepted two steps earlier, and Schedule A-1 is the product
   catalogue. Pasting a snapshot of either into the signed text would create a
   second copy that drifts from the first, and §16.9 makes Exhibit A control
   over the body — so a stale copy here would purport to override the live
   one. The agreement references them instead, which is what the PDF does.

   The thirty-six INSERT fields are in lib/msa-terms.ts. Unfilled ones render
   as a visible blank rather than a plausible-looking default.

   Split from lib/services/signature.ts, which carries `server-only` and binds
   the driver, so a seed script or a test can produce the same hash the app
   produces. Same reasoning as lib/encryption.ts: the pure part is reusable,
   the part that touches configuration is guarded.
   ========================================================================= */

/**
 * SHA-256 of the exact agreement text.
 *
 * Whitespace-normalised so reflowing the source file does not invalidate
 * every existing signature, while any change to the WORDS does — which is the
 * property that makes a stored hash worth storing. Filling in a term in
 * msa-terms.ts therefore changes the hash, which is correct: it is a different
 * agreement, and anyone who signed the old one signed the old one.
 */
export function hashAgreement(text: string): string {
  return createHash("sha256").update(text.replace(/\s+/g, " ").trim(), "utf8").digest("hex");
}

const PHARMACY = "MediCraft Precision LLC, d/b/a MediCraft Pharmacy";

/**
 * The Master Service Agreement, MSA v2026.1.
 *
 * `companyName` is the Client. Every other party detail — addresses, permit
 * number, entity type — is captured on the signature page of the executed
 * document rather than interpolated here.
 */
export function agreementText(companyName: string, terms: MsaTerms = MSA_TERMS): string {
  const t = (key: keyof Omit<MsaTerms, "budTable">) => term(terms[key]);

  const budTable = BUD_ROWS.map((row) => {
    const cells = terms.budTable[row.key];
    return `    ${row.label}
      Typical BUD and storage: ${row.typical}
      Suggested maximum per order: ${term(cells.suggestedMaxPerOrder)}
      Minimum dating on arrival: ${term(cells.minimumDatingOnArrival)}`;
  }).join("\n\n");

  return `MASTER SERVICE AGREEMENT
MSA v2026.1 · Pharmacy Services for Provider Practices and Clinics

This Master Service Agreement (this "Agreement") is entered into as of the
Effective Date by and between the parties below. The Effective Date is the
date on which the last party signs, as recorded on the electronic signature
certificate.

  Pharmacy ("MediCraft," "we," "us"):  ${PHARMACY}
  Client ("Client," "you"):            ${companyName}

MediCraft is a licensed pharmacy compounding under section 503A of the Federal
Food, Drug, and Cosmetic Act. Client is a health care practice or clinic whose
prescribers issue prescriptions for their own patients.

────────────────────────────────────────────────────────────────────────────
1. WHAT MEDICRAFT WILL DO

1.1 Services. We will review, compound, label, dispense, and ship
    patient-specific prescriptions submitted by your prescribers, using our own
    licensed facility and personnel, for the preparations listed in the
    MediCraft Partner Formulary and any additions made under Exhibit B. We will
    perform prescription verification, drug utilization review, and patient
    counseling as our professional obligations require.

1.2 Standards. We will compound in accordance with USP <795>, <797>, and
    <800>, applicable Florida Board of Pharmacy rules, and the law of each
    state into which we are authorized to ship. We will maintain the licenses,
    registrations, and permits our operations require for as long as this
    Agreement is in effect.

1.3 Turnaround. Orders received by ${t("orderCutoff")} on a business day will
    be processed the same business day, subject to clinical review, ingredient
    availability, and matters outside our reasonable control. For the first
    ${t("standardisationDays")} days after onboarding or the introduction of a
    new formulation, that cutoff will not apply while prescribing and
    dispensing are standardized.

1.4 Cold chain and tracking. Preparations marked for cold shipping in the
    Partner Formulary ship in validated refrigerated packaging appropriate to
    the destination and season. Tracking information is sent automatically to
    the contacts you designate.

1.5 Access to a pharmacist. A licensed pharmacist is reachable at
    ${t("pharmacistPhone")} during business hours, and at ${t("afterHoursPhone")}
    after hours for urgent clinical, quality, or recall matters.

1.6 Notice of problems. We will tell you promptly if a preparation is delayed,
    backordered, discontinued, or reformulated, or if we decline an order, and
    we will tell you why.

1.7 Independent professional judgment. Our pharmacists retain independent
    professional judgment. We may contact the prescriber, request clarification
    or documentation, propose a clinically equivalent base or vehicle, or
    decline to fill an order where patient safety, formulation integrity, or
    law requires. Declining an order is not a breach of this Agreement.

────────────────────────────────────────────────────────────────────────────
2. WHAT CLIENT WILL DO

2.1 Valid prescriptions. You will submit only valid, patient-specific
    prescriptions issued by a prescriber who is licensed and authorized to
    prescribe in the state where the patient is located, within a valid
    practitioner-patient relationship, for a legitimate medical purpose, in the
    usual course of professional practice.

2.2 Clinical responsibility. Your prescribers remain solely responsible for
    patient screening, diagnosis, informed consent, prescribing decisions, dose
    selection, laboratory monitoring, and follow-up. We do not practice
    medicine and do not direct or review clinical decision-making.

2.3 Credentials. You will provide and keep current, for each prescriber,
    license and registration information and any supervisory or collaborative
    agreement your state requires, and will notify us in writing within
    ${t("credentialChangeNoticeDays")} days of any lapse, restriction,
    suspension, surrender, or adverse action. You authorize us to verify this
    information through official sources at onboarding and on a continuing
    basis.

2.4 Patient-specific use only. Medication dispensed under this Agreement is
    for the named patient only. You will not use it as office stock, relabel
    it, resell it, transfer it, pool it, or administer it to another patient.
    Compounding for in-office administration ("office use"), where state law
    permits it, requires a separate written office-use addendum.

2.5 Accurate information. Information you give us, including in the Provider
    Account Setup form (prescriber data, patient addresses, order data, and
    billing contacts), will be true, accurate, complete, and not misleading,
    and you will keep it current.

2.6 Prescriber network. If prescriptions are submitted to us by third-party
    prescribers engaged by or affiliated with you, you are responsible for
    those prescriptions and for the resulting charges as if issued by your own
    personnel, and you will not continue to engage any prescriber you
    reasonably suspect of unlawful, unethical, or abusive prescribing.

2.7 Account access. Each authorized user will hold individual credentials. You
    will remove access for departing personnel promptly and report any
    suspected compromise. Only a licensed prescriber may hold prescribing
    access.

────────────────────────────────────────────────────────────────────────────
3. PRESCRIPTIONS WE CANNOT FILL

Listing in the Partner Formulary does not override this Section. We will not
fill:

  · Anything that is essentially a copy of a commercially available drug
    product, except as the law permits and where you have documented the
    patient-specific clinical difference.

  · Any product on the FDA withdrawn-or-removed list, or any drug or bulk
    substance otherwise prohibited for 503A compounding.

  · Orders for office stock, resale, or distribution, and orders lacking a
    patient identity.

  · Controlled substances (shown with a DEA schedule in the Partner Formulary),
    unless the prescriber holds a current DEA registration and any required
    state registration and the prescription complies with federal and state
    telemedicine, electronic prescribing, and monitoring-program requirements.

  · Prescriptions for patients located in a state where we are not licensed or
    registered to dispense. We will confirm our authorized states during
    onboarding and notify you of changes.

────────────────────────────────────────────────────────────────────────────
4. PRICING, INVOICING, AND PAYMENT

4.1 Pricing. Pricing and payment terms are set out in Exhibit A, which
    incorporates the Provider Cost column of the MediCraft Partner Formulary
    (attached as Schedule A-1) in effect on the pricing effective date. Items
    shown as "Quote" in the Partner Formulary, and custom or non-formulary
    preparations, are priced by written quote or change order. We bill the
    price in effect when the prescription order is received. We will hold
    Exhibit A pricing for ${t("priceHoldDays")} days from the Effective Date
    and give you at least ${t("priceIncreaseNoticeDays")} days' written notice
    before any increase takes effect. Prices for commercially available drug
    products may move with market cost, and we will tell you when they do.

4.2 Self-pay only. Compounded preparations dispensed under this Agreement are
    not covered by, and will not be submitted to, Medicare, Medicaid, TRICARE,
    or any commercial payer. You will not submit or cause the submission of
    claims for them, and you will not represent to patients that they are
    reimbursable.

4.3 Payment method. Payment is due at or before shipment unless invoice terms
    are approved in Exhibit A. You authorize us to charge the payment method on
    file for approved orders, shipping, taxes, and agreed fees until you revoke
    that authorization in writing. Revocation does not affect amounts already
    incurred. Card and bank details are captured through a secure link held by
    a PCI-compliant processor; we do not receive or store full account numbers.

4.4 Declines and past-due amounts. If a payment method declines or expires,
    pending orders hold until payment clears. Where invoice terms apply,
    amounts more than ${t("pastDueDays")} days past due may accrue a late
    charge of ${t("lateChargePercent")} per month (or the maximum the law
    allows, if lower) and may pause new orders until the balance is current. We
    will contact you before pausing anything.

4.5 Billing questions. Tell us within ${t("billingQueryDays")} days of an
    invoice or charge if something looks wrong, identifying the order and the
    amount, and we will work it out with you directly. Please use that process
    rather than a card chargeback; undisputed amounts remain payable while we
    look into the rest.

4.6 Taxes. You are responsible for sales, use, and similar taxes on amounts
    payable under this Agreement, other than taxes on our income.

────────────────────────────────────────────────────────────────────────────
5. CANCELLATIONS

5.1 Formulary items. An order for a Partner Formulary item may be cancelled
    within ${t("formularyCancellationWindow")} of submission, or before it
    enters final verification, whichever comes first.

5.2 Custom and non-formulary compounds. Once compounding begins, a
    patient-specific custom preparation cannot be cancelled, because it is made
    for one patient and cannot be reassigned or returned to stock. We will tell
    you at order entry which category a product falls into.

5.3 How to cancel. Send cancellation requests through
    ${t("cancellationChannel")}. We will use reasonable efforts to locate and
    stop the order promptly and will confirm the outcome either way.

────────────────────────────────────────────────────────────────────────────
6. SHIPPING, DELIVERY, AND RESHIPMENT

We split responsibility the same way every time, so nobody has to argue about
it.

  MediCraft reships at our cost when:
    · We sent the wrong drug, strength, or form
    · An item or supply on the prescription was missing
    · We shipped to the wrong address
    · The product arrived damaged or defective
    · A cold-ship item was outside range on arrival
    · Dating on arrival is shorter than Exhibit A allows

  Client is responsible when:
    · The address given to us was wrong or incomplete
    · The patient or clinic refused or failed to accept delivery
    · A package was lost or stolen after confirmed delivery to the correct
      address
    · Signature was waived and the carrier confirmed delivery
    · Storage after delivery was outside labeled conditions

  We work it out together when:
    · A carrier delay spoils a shipment through nobody's fault: you can choose
      to wait for the carrier claim or pay for an early reship
    · Weather or a regional event disrupts delivery
    · Anything else not listed: we split or absorb it case by case, and we will
      not hide behind this table

6.1 Claim window. Report anything missing, damaged, incorrect, tampered with,
    or temperature-concerned within ${t("claimWindow")} of delivery through
    ${t("claimChannel")}, with photographs of the product and packaging. Keep
    the product, label, box, insulation, and coolant until we finish our
    review; the carrier requires them for a claim. Reports outside the window
    will still be reviewed, but we may be unable to recover from the carrier.

6.2 Returns. Prescription medication cannot be returned to pharmacy stock once
    it leaves our custody. Where a refund, credit, or replacement is not
    required by law, we will still review the circumstances and make it right
    where it is fair to do so.

6.3 Address changes. Reroutes and address corrections after shipment may incur
    carrier fees, which we pass through at cost.

────────────────────────────────────────────────────────────────────────────
7. BEYOND-USE DATING AND STORAGE

Compounded preparations carry a beyond-use date (BUD) assigned under USP
standards rather than a manufacturer expiration date. The date runs from the
date of compounding, and release testing, fulfillment, and transit consume part
of it. Please prescribe quantities the patient can reasonably use within the
labeled window. The product-level BUD shown in the Partner Formulary is a
reference; dating on the label always governs. Ask us before writing an
extended supply and we will tell you what dating that formulation will carry.

${budTable}

────────────────────────────────────────────────────────────────────────────
8. SAFETY, COMPLAINTS, AND RECALLS

8.1 Reporting. Report adverse events, medication errors, quality or sterility
    concerns, suspected tampering, and loss, theft, or diversion as soon as you
    become aware, through ${t("safetyReportChannel")}. Serious or unexpected
    adverse events should reach us within ${t("seriousAdverseEventHours")}
    hours. Treat the patient first; report second.

8.2 Administration records. Where a compounded preparation is administered in
    your office, record the drug name, lot number, and beyond-use date in the
    patient chart or medication administration record so affected patients can
    be identified quickly.

8.3 Recalls. If we issue a recall or product notice, you will stop use and
    distribution, quarantine affected product, help identify affected patients,
    assist with notification as directed, document return or destruction, and
    return the acknowledgment within the time stated in the notice. We handle
    regulatory reporting and carry the cost of the recall itself.

8.4 Regulatory cooperation. Each of us will cooperate reasonably with the
    other's inspections, audits, and board inquiries that relate to shared
    activity, and will give prompt notice of any inquiry that names the other
    party.

────────────────────────────────────────────────────────────────────────────
9. PRIVACY AND DATA

9.1 HIPAA. Each party is an independent covered entity and will comply with
    HIPAA, HITECH, and applicable state privacy law for the protected health
    information it handles. A pharmacy dispensing on a prescription for
    treatment purposes does not act as the prescriber's business associate; if
    your counsel prefers a business associate agreement, we will sign a
    reasonable one and it will control over this Section to the extent of any
    conflict.

9.2 Secure exchange. PHI will be exchanged only through approved secure
    methods. You are responsible for the security of your own devices,
    accounts, and personnel access.

9.3 Breach notice. Each party will notify the other without unreasonable delay,
    and in any event within ${t("breachNoticeDays")} days, of a breach of
    unsecured PHI affecting the other party's patients or records.

9.4 Communications and electronic signature. You consent to receive
    operational communications (order status, clinical clarifications, safety
    notices, recalls, and account notices) by email, phone, portal, and fax at
    the contacts you provide. Marketing communications are separate and may be
    declined at any time without affecting your account. Each party consents to
    electronic records and signatures, including through DocuSign or a similar
    platform, under the federal E-SIGN Act and applicable state law.

────────────────────────────────────────────────────────────────────────────
10. COMPLIANCE AND FAIR DEALING

10.1 No remuneration for referrals. Neither party has offered, solicited, paid,
     or received anything of value in exchange for referrals, prescribing, or
     the purchase or recommendation of any product or service. Each party will
     comply with the federal Anti-Kickback Statute, the Eliminating Kickbacks
     in Recovery Act, the Stark Law, and Florida's patient brokering and
     fee-splitting statutes.

10.2 Fair market value. Amounts payable under this Agreement reflect fair
     market value for the products and services provided and are not determined
     by the volume or value of referrals or other business generated between
     the parties.

10.3 No excluded persons. Neither party, nor any of its owners, officers, or
     prescribing personnel, is excluded, debarred, or suspended from
     participation in any federal or state health care program. Each party will
     notify the other promptly if that changes.

10.4 Marketing and use of names. Neither party will use the other's name, logo,
     formulations, pricing, or materials, including the Partner Formulary, in
     advertising or patient-facing content without prior written approval, and
     neither will make claims about compounded preparations beyond what the
     approved materials support.

10.5 Records. Each party will maintain records relating to prescriptions,
     orders, and this Agreement for the period its own law requires, and no
     less than ${t("recordRetentionYears")} years.

────────────────────────────────────────────────────────────────────────────
11. CONFIDENTIALITY

Each party will use the other's commercial, technical, and financial
information disclosed under this Agreement only for purposes of this Agreement,
will protect it with at least the care it uses for its own confidential
information, and will not disclose it to third parties without consent. This
does not apply to information that is public through no breach of this Section,
received lawfully from a third party, already in the recipient's possession, or
independently developed. Disclosure compelled by law, regulation, subpoena, or
a regulator is permitted, with prior notice to the other party where legally
permissible. Pricing under Exhibit A, including Provider Cost in the Partner
Formulary, is confidential. This Section survives termination for
${t("confidentialitySurvivalYears")} years, and indefinitely for PHI and trade
secrets. Nothing in this Agreement restricts either party from reporting a
concern to a regulator, and neither party is subject to any non-disparagement
obligation.

────────────────────────────────────────────────────────────────────────────
12. INSURANCE

Each party will maintain, at its own expense and with financially sound
insurers, general liability and professional liability coverage appropriate to
its operations, with limits of not less than ${t("insurancePerClaim")} per
claim and ${t("insuranceAggregate")} in the aggregate. On request, each party
will provide a certificate of insurance and will give the other
${t("insuranceNoticeDays")} days' written notice of cancellation or material
reduction in coverage.

────────────────────────────────────────────────────────────────────────────
13. MUTUAL INDEMNIFICATION

13.1 By Client. You will indemnify, defend, and hold harmless MediCraft and its
     owners, officers, employees, and agents from third-party claims, losses,
     damages, penalties, and reasonable attorneys' fees arising out of (a) your
     breach of this Agreement, (b) any prescribing, diagnostic, or clinical
     decision by you or your prescribers, (c) your handling, storage,
     relabeling, administration, or transfer of medication after delivery, or
     (d) information you gave us that was inaccurate or incomplete, except to
     the extent caused by our own negligence or breach.

13.2 By MediCraft. We will indemnify, defend, and hold harmless Client and its
     owners, officers, employees, and agents from third-party claims, losses,
     damages, penalties, and reasonable attorneys' fees arising out of (a) our
     breach of this Agreement, (b) a compounding, labeling, dispensing, or
     quality error by us, or (c) our violation of applicable pharmacy law,
     except to the extent caused by your own negligence or breach.

13.3 Procedure. The party seeking indemnity will give prompt written notice,
     allow the indemnifying party to control the defense with counsel of its
     choosing, and cooperate reasonably. No settlement that imposes an
     obligation on or admits fault by the other party may be made without that
     party's written consent.

────────────────────────────────────────────────────────────────────────────
14. LIMITATION OF LIABILITY

Except for the exclusions below, neither party is liable to the other for lost
profits, lost revenue, lost data, or indirect, incidental, special,
consequential, exemplary, or punitive damages, however arising, and each
party's total aggregate liability arising out of this Agreement will not exceed
the greater of (a) the total amounts paid or payable by Client to MediCraft in
the twelve months preceding the event giving rise to the claim, or (b)
${t("liabilityFloor")}.

These limits do not apply to: personal injury or death; a party's
indemnification obligations under Section 13; breach of confidentiality or of
privacy law; gross negligence, willful misconduct, or fraud; or Client's
obligation to pay amounts due. Except as expressly stated in this Agreement,
and without limiting our obligations under law, MediCraft makes no other
warranties, and implied warranties of merchantability and fitness for a
particular purpose are disclaimed.

This limitation is mutual and is a material part of the pricing in Exhibit A.
It does not limit any right a patient may have.

────────────────────────────────────────────────────────────────────────────
15. TERM, SUSPENSION, AND TERMINATION

15.1 Term. This Agreement begins on the Effective Date and continues for one
     year, then renews automatically for successive one-year terms until
     terminated. There is no minimum order commitment, no exclusivity, and no
     termination fee.

15.2 Termination for convenience. Either party may terminate on thirty days'
     written notice. Prescriptions already accepted will be completed unless
     you tell us otherwise.

15.3 Termination for cause. Either party may terminate immediately on written
     notice if the other (a) materially breaches and fails to cure within
     thirty days of notice, (b) fails to pay an undisputed amount within ten
     days of notice, (c) becomes insolvent or subject to a bankruptcy
     proceeding not dismissed within forty-five days, or (d) loses a license,
     registration, or authorization necessary to perform.

15.4 Suspension. We may pause an affected service (a single prescriber, a
     single state, or the account) where credentials lapse, a verification
     issue arises, an undisputed balance is past due, or patient safety or
     compliance requires it. We will tell you what happened, what resolves it,
     and restore service when it is resolved.

15.5 Re-verification. We re-verify prescriber credentials at least annually and
     at each license or registration expiration. Accounts with no ordering
     activity for ${t("inactivityMonths")} months may be deactivated and
     require re-verification to reopen.

15.6 Effect of termination. Amounts owed become due on the effective date of
     termination. Each party's recordkeeping, confidentiality, indemnification,
     privacy, and limitation-of-liability obligations survive, along with
     Sections 4, 8, 9, 10, 11, 13, 14, and 16.

────────────────────────────────────────────────────────────────────────────
16. GENERAL

16.1 Relationship. The parties are independent contractors. Nothing here
     creates an agency, partnership, joint venture, employment, or fee-sharing
     relationship, and neither party may bind the other.

16.2 Changes to these terms. We may update operational terms on
     ${t("operationalChangeNoticeDays")} days' written notice, applying to
     orders placed after the notice period. Changes to Sections 13, 14, or 15
     require a signed amendment. If you object to an operational change, you
     may terminate under Section 15.2 without penalty.

16.3 Change orders. New products, services, or pricing are added using the
     Change Order form in Exhibit B. No pricing change takes effect without a
     signed change order or amendment. An updated edition of the Partner
     Formulary takes effect for your account only with the notice required by
     Section 4.1.

16.4 Force majeure. Neither party is liable for a delay or failure caused by
     events beyond its reasonable control (natural disaster, hurricane, fire,
     epidemic, war, civil unrest, government action, embargo, utility or
     telecommunications failure, or ingredient or supply unavailability) other
     than the obligation to pay amounts due. The affected party will give
     notice and resume performance as soon as practicable.

16.5 Assignment. Neither party may assign this Agreement without the other's
     written consent, which will not be unreasonably withheld, except to an
     affiliate or to a successor of substantially all of its assets or equity.

16.6 Notices. Notices must be in writing and are effective on hand delivery, on
     receipt by overnight courier, on the date sent by email during the
     recipient's business hours (next business day if after), or five days
     after certified mail, to the addresses on the signature page.

16.7 Governing law and venue. Florida law governs, without regard to
     conflict-of-law principles. Before filing suit, the parties will attempt
     to resolve any dispute through a good-faith discussion between senior
     representatives within thirty days of written notice, and then non-binding
     mediation in Pinellas County. Any action may be brought in the state or
     federal courts serving Pinellas County, Florida, and each party consents
     to that jurisdiction. The prevailing party in any action to enforce this
     Agreement is entitled to reasonable attorneys' fees and costs at all
     levels.

16.8 Severability, waiver, and entire agreement. If a provision is
     unenforceable, the rest remains in effect. A waiver is effective only in
     writing and only for the instance given. This Agreement, with its
     exhibits, is the entire agreement on this subject and supersedes prior
     discussions and documents. It may be signed in counterparts, and an
     electronic or scanned signature has the same effect as an original.

16.9 Order of precedence. If there is a conflict, a signed amendment controls
     over a signed change order, which controls over Exhibit A (including the
     Partner Formulary it incorporates), which controls over the body of this
     Agreement, which controls over the Provider Account Setup form and any
     other onboarding document.

────────────────────────────────────────────────────────────────────────────
EXECUTION

Each person signing represents that they are authorized to bind the party for
which they sign, and that the party has read and agrees to this Agreement and
its exhibits. Client signs first; MediCraft countersigns. The Effective Date is
the date of the last signature.`;
}
