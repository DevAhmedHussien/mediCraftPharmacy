"use client";

import { useFormState } from "react-dom";
import { enrollProvider } from "@/app/providers/actions";
import {
  initialFormState,
  PROVIDER_ROLES,
  ORG_TYPES,
  REFERRAL_SOURCES,
  US_STATES,
} from "@/lib/forms";
import {
  TextField,
  SelectField,
  TextArea,
  RadioGroup,
  SubmitButton,
  FormAlert,
  SectionTitle,
} from "@/components/forms/Fields";

export function ProviderForm() {
  const [state, formAction] = useFormState(enrollProvider, initialFormState);
  const e = state.errors ?? {};

  if (state.ok) {
    return <FormAlert ok message={state.message} />;
  }

  return (
    <form action={formAction} className="space-y-10">
      <FormAlert ok={false} message={state.message} />

      {/* Section 1 — Primary Contact */}
      <section className="space-y-5">
        <SectionTitle step={1} title="Primary contact" />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="firstName" label="First name" error={e.firstName} autoComplete="given-name" />
          <TextField name="lastName" label="Last name" error={e.lastName} autoComplete="family-name" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="email" label="Email" type="email" error={e.email} autoComplete="email" />
          <TextField name="phone" label="Phone" type="tel" error={e.phone} autoComplete="tel" />
        </div>
        <SelectField name="role" label="Your role" options={PROVIDER_ROLES} error={e.role} />
      </section>

      {/* Section 2 — Practice / Company profile */}
      <section className="space-y-5">
        <SectionTitle step={2} title="Practice / company profile" />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="practiceName" label="Practice / company name" error={e.practiceName} />
          <TextField name="website" label="Website" optional error={e.website} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="street" label="Street address" error={e.street} autoComplete="address-line1" />
          <TextField name="suite" label="Suite / unit" optional error={e.suite} />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField name="city" label="City" error={e.city} autoComplete="address-level2" />
          <SelectField name="state" label="State" options={US_STATES} placeholder="State" error={e.state} />
          <TextField name="zip" label="ZIP code" error={e.zip} autoComplete="postal-code" />
        </div>
      </section>

      {/* Section 3 — Operational snapshot */}
      <section className="space-y-5">
        <SectionTitle step={3} title="Operational snapshot" />
        <RadioGroup name="orgType" label="Which best describes your organization?" options={ORG_TYPES} error={e.orgType} />
      </section>

      {/* Section 4 — Workflow & notes */}
      <section className="space-y-5">
        <SectionTitle step={4} title="Workflow & notes" />
        <TextArea name="medications" label="Medications of interest" rows={3} optional error={e.medications} />
        <TextArea name="notes" label="Additional information" rows={3} optional error={e.notes} />
      </section>

      {/* Section 5 — How did you hear about us */}
      <section className="space-y-5">
        <SectionTitle step={5} title="How did you hear about us?" />
        <SelectField name="referral" label="Referral source" options={REFERRAL_SOURCES} error={e.referral} />
      </section>

      <SubmitButton>Submit enrollment</SubmitButton>
    </form>
  );
}
