"use client";

import { useEffect, useRef } from "react";
// `useFormState` from react-dom, not React 19's `useActionState` — this project
// is on React 18.3, and it is what the other forms here use.
import { useFormState } from "react-dom";
import { submitContact } from "@/app/(site)/contact/actions";
import {
  FormAlert,
  PhoneField,
  SelectField,
  ActionSubmitButton,
  TextArea,
  TextField,
} from "@/components/ui/form/native";
import { contact } from "@/lib/content";
import { initialFormState } from "@/lib/forms";

export function ContactForm() {
  const [state, action] = useFormState(submitContact, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  /* Which state object we have already cleared for. `state.ok` stays true
     after a send, so without this the effect would re-clear the form on every
     later render — including while someone is typing their next message. */
  const cleared = useRef<unknown>(null);

  /* Empty the form once a message is actually away.
   *
   * These are uncontrolled inputs posting to a server action, so nothing
   * resets them on its own: the success banner appeared above a form still
   * holding the message that had just been sent, which reads as "it did not
   * go" and gets the same inquiry submitted two or three times. */
  useEffect(() => {
    if (state.ok && cleared.current !== state) {
      cleared.current = state;
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-5">
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

      <PhoneField
        name="phone"
        label="Phone number"
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

      <ActionSubmitButton>
        {contact.form.submit} <span aria-hidden>→</span>
      </ActionSubmitButton>

      <FormAlert ok={state.ok} message={state.message} />

      <p className="fine-print">
        Please don&rsquo;t include prescription details or health information in
        this form. For anything clinical, call us or use the Provider Portal.
      </p>
    </form>
  );
}
