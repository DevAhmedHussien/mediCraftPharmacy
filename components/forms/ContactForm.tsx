"use client";

// `useFormState` from react-dom, not React 19's `useActionState` — this project
// is on React 18.3, and it is what the other forms here use.
import { useFormState } from "react-dom";
import { submitContact } from "@/app/contact/actions";
import {
  FormAlert,
  SelectField,
  SubmitButton,
  TextArea,
  TextField,
} from "@/components/forms/Fields";
import { contact } from "@/lib/content";
import { initialFormState } from "@/lib/forms";

export function ContactForm() {
  const [state, action] = useFormState(submitContact, initialFormState);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="firstName"
          label="First name"
          autoComplete="given-name"
          error={state.errors?.firstName}
        />
        <TextField
          name="lastName"
          label="Last name"
          autoComplete="family-name"
          error={state.errors?.lastName}
        />
      </div>

      <TextField
        name="email"
        label="Email address"
        type="email"
        autoComplete="email"
        error={state.errors?.email}
      />

      <TextField
        name="phone"
        label="Phone number"
        type="tel"
        autoComplete="tel"
        optional
        error={state.errors?.phone}
      />

      <SelectField
        name="role"
        label="I am a…"
        options={contact.form.roles}
        placeholder="Select one…"
        optional
        error={state.errors?.role}
      />

      <TextArea
        name="message"
        label="Message"
        rows={5}
        error={state.errors?.message}
      />

      <SubmitButton>
        {contact.form.submit} <span aria-hidden>→</span>
      </SubmitButton>

      <FormAlert ok={state.ok} message={state.message} />

      <p className="fine-print">
        Please don&rsquo;t include prescription details or health information in
        this form. For anything clinical, call us or use the Provider Portal.
      </p>
    </form>
  );
}
