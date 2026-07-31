"use client";

import { useFormState } from "react-dom";
import { requestRefill } from "@/app/refill/actions";
import { initialFormState, US_STATES } from "@/lib/forms";
import {
  TextField,
  SelectField,
  TextArea,
  SubmitButton,
  FormAlert,
  SectionTitle,
} from "@/components/forms/Fields";

export function RefillForm() {
  const [state, formAction] = useFormState(requestRefill, initialFormState);
  const e = state.errors ?? {};

  if (state.ok) {
    return <FormAlert ok message={state.message} />;
  }

  return (
    <form action={formAction} className="space-y-10">
      <FormAlert ok={false} message={state.message} />

      {/* Section 1 — Patient details */}
      <section className="space-y-5">
        <SectionTitle step={1} title="Patient details" />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="firstName" label="First name" error={e.firstName} autoComplete="given-name" />
          <TextField name="lastName" label="Last name" error={e.lastName} autoComplete="family-name" />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField name="dob" label="Date of birth" type="date" error={e.dob} autoComplete="bday" />
          <TextField name="phone" label="Phone" type="tel" error={e.phone} autoComplete="tel" />
          <TextField name="email" label="Email" type="email" error={e.email} autoComplete="email" />
        </div>
      </section>

      {/* Section 2 — Prescription */}
      <section className="space-y-5">
        <SectionTitle step={2} title="Prescription" />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="rxNumber" label="Rx number" optional error={e.rxNumber} />
          <TextField name="prescriber" label="Prescribing provider" optional error={e.prescriber} />
        </div>
        <TextField name="medication" label="Medication name" error={e.medication} />
      </section>

      {/* Section 3 — Shipping address */}
      <section className="space-y-5">
        <SectionTitle step={3} title="Shipping address" />
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

      {/* Section 4 — Notes */}
      <section className="space-y-5">
        <SectionTitle step={4} title="Anything else?" />
        <TextArea name="notes" label="Notes for the pharmacy" rows={3} optional error={e.notes} />
      </section>

      <SubmitButton>Request refill</SubmitButton>
    </form>
  );
}
