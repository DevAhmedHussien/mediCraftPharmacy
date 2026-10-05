"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  MaskedField,
  RadioCards,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/form/fields";
import { FormBanner, Honeypot, SubmitButton, useFormAction } from "@/components/ui/form/submit";
import { ORG_TYPES, PROVIDER_ROLES, REFERRAL_SOURCES, US_STATES } from "@/lib/forms";
import { emptyLead, leadSchema, type LeadValues } from "@/lib/schemas/lead";
import { submitInquiry } from "@/app/(site)/work-with-us/actions";
import { Logo } from "@/components/brand/Logo";

/* ===========================================================================
   The public inquiry form.

   One component, rendered on both /work-with-us and /providers, because two
   pages asking the same practice the same questions through two different
   forms into two different backends is how a lead ends up in one system and
   not the other. The version on /providers used to post to a server action
   whose entire body was a console.log.

   Short on purpose — see lib/schemas/lead.ts. Everything regulated is asked
   later, in the portal, once there is a relationship to justify asking.
   ========================================================================= */

export function PartnerInquiryForm() {
  const form = useForm<LeadValues>({
    resolver: zodResolver(leadSchema) as never,
    defaultValues: emptyLead,
    // On blur, not on every keystroke: an error appearing mid-word reads as
    // the form arguing with someone who is still typing.
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const { banner, onSubmit } = useFormAction(form, submitInquiry, { resetTo: emptyLead });
  const { isSubmitting } = form.formState;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        {/* Letterhead: the lockup heads the form. Its own glyph-id namespace,
            because the navbar already renders a light-tone lockup on the page. */}
        <div className="card flex-row flex-wrap items-center justify-between gap-x-8 gap-y-4 p-6 md:px-8">
          <Logo animate="none" idPrefix="mc-inquiry" className="h-11 w-auto md:h-14" />
          <div className="sm:text-right">
            <p className="eyebrow">Provider inquiry</p>
            <p className="mt-1.5 text-caption text-ink-muted">503A compounding pharmacy</p>
          </div>
        </div>

        <Honeypot register={form.register("nickname")} />
        <FormBanner banner={banner} />

        <section className="card space-y-5 p-6 md:p-8">
          <h2 className="text-[1.125rem] font-bold text-ink">About you</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField<LeadValues> name="firstName" label="First name" autoComplete="given-name" />
            <TextField<LeadValues> name="lastName" label="Last name" autoComplete="family-name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MaskedField<LeadValues> name="phone" label="Phone" mask="phone" autoComplete="tel" />
            <SelectField<LeadValues>
              name="role"
              label="Your role"
              options={PROVIDER_ROLES.map((r) => ({ value: r, label: r }))}
            />
          </div>
        </section>

        <section className="card space-y-5 p-6 md:p-8">
          <h2 className="text-[1.125rem] font-bold text-ink">Your practice</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField<LeadValues> name="practiceName" label="Practice or company name" />
            <TextField<LeadValues> name="website" label="Website" optional />
          </div>

          <TextField<LeadValues> name="street" label="Street address" optional autoComplete="address-line1" />
          <TextField<LeadValues> name="suite" label="Suite or unit" optional />

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
            <TextField<LeadValues> name="city" label="City" optional autoComplete="address-level2" />
            <SelectField<LeadValues>
              name="state"
              label="State"
              optional
              options={US_STATES.map((s) => ({ value: s, label: s }))}
            />
            <MaskedField<LeadValues> name="zip" label="ZIP" mask="zip" optional />
          </div>

          <RadioCards<LeadValues>
            name="orgType"
            label="Which best describes how you operate?"
            options={ORG_TYPES.map((o) => ({ value: o, label: o }))}
          />
        </section>

        <section className="card space-y-5 p-6 md:p-8">
          <div>
            <h2 className="text-[1.125rem] font-bold text-ink">What you are looking for</h2>
            <p className="mt-1 text-caption text-ink-muted">
              Optional, and it makes the first conversation a much better one.
            </p>
          </div>

          <TextAreaField<LeadValues>
            name="medications"
            label="Medications of interest"
            rows={3}
            optional
            placeholder="Semaglutide, tirzepatide, testosterone cypionate…"
          />
          <TextAreaField<LeadValues>
            name="notes"
            label="Anything else"
            rows={3}
            optional
            placeholder="Roughly how many prescriptions a month, which states you ship to, timelines."
          />
          <SelectField<LeadValues>
            name="referral"
            label="How did you hear about us?"
            optional
            options={REFERRAL_SOURCES.map((r) => ({ value: r, label: r }))}
          />
        </section>

        <section className="card space-y-5 p-6 md:p-8">
          <div>
            <h2 className="text-[1.125rem] font-bold text-ink">Portal sign-in</h2>
            <p className="mt-1 text-caption text-ink-muted">
              We will send your formulary to your portal rather than as an attachment, so you need
              a way back in. You are signed in as soon as you submit.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField<LeadValues>
              name="email"
              label="Email address"
              type="email"
              autoComplete="username"
            />
            <TextField<LeadValues>
              name="password"
              label="Choose a password"
              type="password"
              autoComplete="new-password"
              hint="At least 12 characters."
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton pending={isSubmitting} pendingLabel="Sending…">
            Send inquiry
          </SubmitButton>
          <p className="text-caption text-ink-muted">
            We reply within one to two business days. No card details, ever.
          </p>
        </div>
      </form>
    </FormProvider>
  );
}
