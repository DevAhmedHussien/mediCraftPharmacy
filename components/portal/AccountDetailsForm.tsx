"use client";

import { useEffect, useRef, useState } from "react";
import { FormProvider, useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

import {
  CheckboxField,
  MaskedField,
  RadioCards,
  SelectField,
  TextField,
} from "@/components/ui/form/fields";
import { FormBanner, SubmitButton, useFormAction } from "@/components/ui/form/submit";
import { US_STATES } from "@/lib/forms";
import {
  accountDetailsSchema,
  emptyAccountDetails,
  emptyPrescriber,
  type AccountDetailsValues,
} from "@/lib/schemas/account-details";
import {
  saveAccountDetailsDraft,
  submitAccountDetails,
} from "@/app/portal/onboarding/actions";

/* ===========================================================================
   The full account details, inside the portal.

   Long, and full of regulated identifiers, which is why it is here rather
   than on a public page: by the time anyone sees this form they have a signed
   session, agreed pricing and a reason to hand over a DEA number.

   AUTOSAVE IS DEBOUNCED AND SILENT. Someone typing an EIN pauses mid-number; a
   save per keystroke is a request per character, and a save that announces
   itself is a toast every two seconds. It fires two seconds after typing stops
   and says so once, quietly, next to the button.
   ========================================================================= */

const AUTOSAVE_DELAY = 2000;

export function AccountDetailsForm({
  defaults,
  practiceState,
}: {
  defaults?: Partial<AccountDetailsValues>;
  /** Pre-ticks the practice's own state in the operating-states list. */
  practiceState?: string | null;
}) {
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<AccountDetailsValues>({
    resolver: zodResolver(accountDetailsSchema) as never,
    defaultValues: {
      ...emptyAccountDetails,
      statesOfOperation: practiceState ? [practiceState] : [],
      ...defaults,
      // Never restored from a draft: the applicant confirms accuracy against
      // what is on screen NOW, not against what it said when they last saved.
      attested: false as never,
    },
    // On blur, not on every keystroke: an error appearing mid-word reads as
    // the form arguing with someone still typing their DEA number.
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  /* Cancel any pending autosave before the submit goes out. The server
     refuses a late write as well, but stopping it here saves a pointless
     round trip and keeps the "Saved 14:32" line from ticking over after the
     form has already closed. */
  const { banner, onSubmit } = useFormAction(form, async (values) => {
    if (timer.current) clearTimeout(timer.current);
    return submitAccountDetails(values);
  });
  const prescribers = useFieldArray({ control: form.control, name: "prescribers" });

  const values = useWatch({ control: form.control });
  const billingSame = form.watch("billingSameAsBusiness");

  // Skips the first render, so opening the form does not immediately write an
  // empty draft over a real one.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await saveAccountDetailsDraft(form.getValues()).catch(() => undefined);
      setSavedAt(new Date());
    }, AUTOSAVE_DELAY);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [values, form]);

  const { isSubmitting } = form.formState;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <FormBanner banner={banner} />

        <Section
          title="Account"
          blurb="Whether this is a brand-new account or one you already hold with us."
        >
          <RadioCards<AccountDetailsValues>
            name="accountType"
            label="Account type"
            options={[
              { value: "new", label: "New account", hint: "We have not worked together before." },
              {
                value: "existing",
                label: "Existing account",
                hint: "Adding a location or a prescriber.",
              },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField<AccountDetailsValues>
              name="howDidYouHearAboutUs"
              label="How did you hear about us?"
              optional
              hint="Optional. A conference, a colleague, a search — whatever you remember."
            />
            <TextField<AccountDetailsValues>
              name="medicraftPharmacyRep"
              label="MediCraft representative"
              optional
              hint="Optional. Leave blank if nobody from MediCraft introduced you."
            />
          </div>
        </Section>

        <Section
          title="Prescribers"
          blurb="Up to two on this form. Add more once your account is open."
          action={
            prescribers.fields.length < 2 ? (
              <button
                type="button"
                onClick={() => prescribers.append({ ...emptyPrescriber })}
                className="btn-outline btn-sm shrink-0"
              >
                <Plus className="size-3.5" strokeWidth={2.4} aria-hidden />
                Add prescriber
              </button>
            ) : null
          }
        >
          {prescribers.fields.map((field, index) => (
            <fieldset key={field.id} className="rounded-[0.6rem] border border-line p-5">
              <legend className="px-2 font-mono text-label uppercase tracking-wide text-ink-muted">
                Prescriber {index + 1}
              </legend>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField<AccountDetailsValues>
                    name={`prescribers.${index}.name`}
                    label="Prescriber name"
                    autoComplete="off"
                    hint="Required. As it appears on their state licence."
                  />
                  <TextField<AccountDetailsValues>
                    name={`prescribers.${index}.signature`}
                    label="Signature"
                    hint="Type the full legal name to attest to this application."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <MaskedField<AccountDetailsValues>
                    name={`prescribers.${index}.deaNumber`}
                    label="DEA #"
                    mask="dea"
                    optional
                    hint="Two letters, seven digits. Leave blank if this prescriber has no DEA registration."
                  />
                  <MaskedField<AccountDetailsValues>
                    name={`prescribers.${index}.deaExpiration`}
                    label="DEA expiration"
                    mask="date"
                    optional
                    hint="MM-DD-YYYY. Leave blank if there is no DEA number above."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <MaskedField<AccountDetailsValues>
                    name={`prescribers.${index}.npi`}
                    label="NPI #"
                    mask="npi"
                    optional
                    hint="Ten digits. We verify the check digit, so a transposed one is caught here."
                  />
                  <TextField<AccountDetailsValues>
                    name={`prescribers.${index}.stateLicenseNumber`}
                    label="State license #"
                    optional
                    hint="Optional. Encrypted at rest and shown back as the last four only."
                  />
                </div>

                {prescribers.fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => prescribers.remove(index)}
                    className="inline-flex items-center gap-1.5 text-caption font-medium text-danger-fg hover:underline"
                  >
                    <Trash2 className="size-3.5" strokeWidth={2} aria-hidden />
                    Remove this prescriber
                  </button>
                )}
              </div>
            </fieldset>
          ))}
        </Section>

        <Section title="Practice">
          <TextField<AccountDetailsValues> name="practice.name" label="Practice or clinic name" hint="Required. The name patients see, if it differs from the legal entity below." />
          <CheckboxField<AccountDetailsValues>
            name="practice.isPrimaryLocation"
            label="This is our primary location"
            hint="Leave ticked unless this practice is a satellite of another site."
          />
          <TextField<AccountDetailsValues>
            name="practice.address"
            label="Street address"
            optional
            autoComplete="street-address"
            hint="Optional here — the address we ship to is set further down."
          />
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
            <TextField<AccountDetailsValues> name="practice.city" label="City" optional autoComplete="address-level2" hint="Optional." />
            <SelectField<AccountDetailsValues>
              name="practice.state"
              label="State"
              optional
              options={US_STATES.map((s) => ({ value: s, label: s }))}
              hint="Optional."
            />
            <MaskedField<AccountDetailsValues> name="practice.zip" label="ZIP" mask="zip" optional hint="Five digits, or ZIP+4. Optional." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MaskedField<AccountDetailsValues> name="practice.phone" label="Practice phone" mask="phone" optional autoComplete="tel" hint="Ten digits, US numbers only. Optional." />
            <MaskedField<AccountDetailsValues> name="practice.fax" label="Practice fax" mask="phone" optional hint="Ten digits, US numbers only. Optional." />
          </div>

          <fieldset className="rounded-[0.6rem] border border-line p-5">
            <legend className="px-2 font-mono text-label uppercase tracking-wide text-ink-muted">
              Office contact
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField<AccountDetailsValues> name="practice.officeContact.name" label="Name" optional hint="Optional. Who we call about a prescription, if not the prescriber." />
              <MaskedField<AccountDetailsValues> name="practice.officeContact.phone" label="Phone" mask="phone" optional hint="Ten digits, US numbers only. Optional." />
              <TextField<AccountDetailsValues> name="practice.officeContact.email" label="Email" type="email" optional hint="Optional. Must be a working address if given." />
            </div>
          </fieldset>
        </Section>

        <Section
          title="Communications preference"
          blurb="Where each kind of message should go. Leave any blank to use the office contact."
        >
          <ContactPair topic="Prescription questions" base="prescriptionQuestions" second="phone" secondLabel="Phone" />
          <ContactPair topic="Shipping and tracking" base="shippingTracking" second="fax" secondLabel="Fax" />
          <ContactPair topic="Invoices and receipts" base="invoicesReceipts" second="fax" secondLabel="Fax" />
        </Section>

        <Section
          title="The legal entity"
          blurb="As it appears on your W-9 — this is what goes on the agreement and your invoices."
        >
          <TextField<AccountDetailsValues> name="legalBusinessName" label="Legal business name" hint="Required. Exactly as it appears on your W-9 — this goes on the agreement." />
          <TextField<AccountDetailsValues>
            name="dba"
            label="Trading as (DBA)"
            optional
            hint="If you trade under a different name."
          />
        </Section>

        <Section title="Business address" blurb="Where the entity is registered, and where invoices go.">
          <TextField<AccountDetailsValues> name="businessStreet" label="Street address" autoComplete="street-address" hint="Required. The registered address of the entity above." />
          <TextField<AccountDetailsValues> name="businessSuite" label="Suite or unit" optional hint="Optional." />
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
            <TextField<AccountDetailsValues> name="businessCity" label="City" autoComplete="address-level2" hint="Required." />
            <SelectField<AccountDetailsValues>
              name="businessState"
              label="State"
              options={US_STATES.map((s) => ({ value: s, label: s }))}
              hint="Required."
            />
            <MaskedField<AccountDetailsValues> name="businessZip" label="ZIP" mask="zip" hint="Required. Five digits, or ZIP+4." />
          </div>

          <CheckboxField<AccountDetailsValues>
            name="billingSameAsBusiness"
            label="Billing address is the same"
            hint="Untick if invoices go somewhere else."
          />

          {!billingSame && (
            <fieldset className="rounded-[0.6rem] border border-line p-5">
              <legend className="px-2 font-mono text-label uppercase tracking-wide text-ink-muted">
                Billing address
              </legend>
              <div className="space-y-4">
                <TextField<AccountDetailsValues> name="billingStreet" label="Street address" optional hint="Required unless billing matches the business address." />
                <TextField<AccountDetailsValues> name="billingSuite" label="Suite or unit" optional hint="Optional." />
                <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                  <TextField<AccountDetailsValues> name="billingCity" label="City" optional hint="Required unless billing matches the business address." />
                  <SelectField<AccountDetailsValues>
                    name="billingState"
                    label="State"
                    optional
                    options={US_STATES.map((s) => ({ value: s, label: s }))}
                    hint="Required unless billing matches the business address."
                  />
                  <MaskedField<AccountDetailsValues> name="billingZip" label="ZIP" mask="zip" optional hint="Required unless billing matches the business address." />
                </div>
              </div>
            </fieldset>
          )}
        </Section>

        <Section
          title="Where you operate"
          blurb="We can only ship to states where we hold a licence. Choosing one we do not serve yet will not block your account — we will tell you which."
        >
          <StatesPicker />
        </Section>

        <Section
          title="Authorised signer"
          blurb="Whoever can sign the Master Service Agreement for the practice. They receive it at the address below."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField<AccountDetailsValues> name="signerName" label="Full name" hint="Required. The person authorised to sign for the entity." />
            <TextField<AccountDetailsValues> name="signerTitle" label="Title" placeholder="Practice Owner" hint="Required. Their role — Owner, Medical Director, Practice Manager." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField<AccountDetailsValues> name="signerEmail" label="Email" type="email" hint="Required. The agreement is sent here to be signed." />
            <MaskedField<AccountDetailsValues> name="signerPhone" label="Phone" mask="phone" optional hint="Ten digits, US numbers only. Optional." />
          </div>
        </Section>

        <Section
          title="Card on file"
          blurb="Billed against your agreed pricing when you order. Nothing is charged today."
        >
          <TextField<AccountDetailsValues>
            name="cardholderName"
            label="Name on card"
            autoComplete="cc-name"
            hint="Required. As printed on the card."
          />
          <MaskedField<AccountDetailsValues>
            name="cardNumber"
            label="Card number"
            mask="card"
            autoComplete="cc-number"
            hint="Required. 13 to 19 digits. We check it before you submit."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <MaskedField<AccountDetailsValues>
              name="cardExpiry"
              label="Expires"
              mask="expiry"
              autoComplete="cc-exp"
              hint="Required. MM / YY, and it must not already have passed."
            />
            {/* Not a MaskedField: there is nothing to format, and a controlled
                rewrite on every keystroke would fight the browser's own
                autofill of a saved card. */}
            <TextField<AccountDetailsValues>
              name="cardCvv"
              label="Security code"
              autoComplete="cc-csc"
              hint="Three digits on the back, or four on the front of an Amex."
            />
          </div>

          {/* Said here rather than only in the terms, because this is where
              someone is deciding whether to type it. */}
          <p className="text-caption text-ink-muted">
            The number is encrypted the moment it reaches us and is shown back to
            you and to our staff only as the last four digits. The security code
            is used to verify the card and is never stored.
          </p>
        </Section>

        <section className="card space-y-4 p-6 md:p-8">
          <CheckboxField<AccountDetailsValues>
            name="attested"
            label="These details are accurate and complete"
            hint="You are confirming on behalf of the practice. We check licences against state registries before activating an account."
          />

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <SubmitButton pending={isSubmitting} pendingLabel="Saving…">
              Save and continue
            </SubmitButton>
            <p className="text-caption text-ink-muted" aria-live="polite">
              {savedAt
                ? `Saved ${savedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                : "Your answers save automatically."}
            </p>
          </div>
        </section>
      </form>
    </FormProvider>
  );
}

/* --- Pieces ---------------------------------------------------------------- */

function Section({
  title,
  blurb,
  action,
  children,
}: {
  title: string;
  blurb?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card space-y-5 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[1.125rem] font-bold text-ink">{title}</h2>
          {blurb && <p className="mt-1 max-w-prose text-caption text-ink-muted">{blurb}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** One topic, two channels. Three of these is the whole preferences section. */
function ContactPair({
  topic,
  base,
  second,
  secondLabel,
}: {
  topic: string;
  base: "prescriptionQuestions" | "shippingTracking" | "invoicesReceipts";
  second: "phone" | "fax";
  secondLabel: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr] sm:items-end">
      <TextField<AccountDetailsValues>
        name={`communicationsPreference.${base}.email` as never}
        label={`${topic} — email`}
        type="email"
        optional
        hint="Optional. Leave blank to use the office contact above."
      />
      <MaskedField<AccountDetailsValues>
        name={`communicationsPreference.${base}.${second}` as never}
        label={secondLabel}
        mask="phone"
        optional
        hint="Ten digits, US numbers only. Optional."
      />
    </div>
  );
}

/**
 * States of operation.
 *
 * A toggle grid rather than a multi-select: a practice picks two or three
 * neighbouring states, and a native multi-select hides every option they did
 * not scroll to while requiring a modifier key most people do not know about.
 */
function StatesPicker() {
  const form = useFormContext<AccountDetailsValues>();
  const selected: string[] = form.watch("statesOfOperation") ?? [];

  const toggle = (state: string) => {
    const next = selected.includes(state)
      ? selected.filter((s) => s !== state)
      : [...selected, state];
    form.setValue("statesOfOperation", next, { shouldValidate: true, shouldDirty: true });
  };

  const error = form.formState.errors.statesOfOperation?.message as string | undefined;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {US_STATES.map((state) => {
          const on = selected.includes(state);
          return (
            <button
              key={state}
              type="button"
              onClick={() => toggle(state)}
              aria-pressed={on}
              className={
                on
                  ? "rounded-full border border-brand-500 bg-brand-50 px-3 py-1 text-caption font-medium text-brand-700"
                  : "rounded-full border border-line bg-white px-3 py-1 text-caption text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600"
              }
            >
              {state}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-caption font-medium text-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
}
