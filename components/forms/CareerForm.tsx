"use client";

import { useFormState } from "react-dom";
import { Send } from "lucide-react";

import { submitApplication } from "@/app/careers/actions";
import {
  FormAlert,
  RadioGroup,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/forms/Fields";
import { fieldClass } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { REFERRAL_SOURCES, initialFormState } from "@/lib/forms";

/**
 * The careers application.
 *
 * Rewritten onto the same server-action pattern as the other three forms. It
 * previously faked its own success — `preventDefault()` then `setSent(true)` —
 * so an applicant was thanked for an application that was never sent anywhere,
 * and the form did nothing whatsoever without JavaScript.
 *
 * It also carried its own copy of the input and label styling, on a different
 * radius and border colour to the rest of the site (`rounded-xl border-brand-200`
 * against the system's `rounded-lg border-line`). Composing the shared fields
 * removes both the duplication and the visual drift.
 */
export function CareerForm() {
  const [state, action] = useFormState(submitApplication, initialFormState);

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

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={state.errors?.email}
        />
        <TextField
          name="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          error={state.errors?.phone}
        />
      </div>

      <SelectField
        name="referral"
        label="How did you hear about us?"
        options={REFERRAL_SOURCES}
        error={state.errors?.referral}
      />

      <RadioGroup
        name="relocate"
        label="Are you willing to relocate?"
        options={["Yes", "No"]}
        error={state.errors?.relocate}
      />

      {/* The file input keeps its own markup: it is the one control whose
          `file:` pseudo-element styling has no counterpart in the shared field
          set, and wrapping it would mean threading those classes through for a
          single caller. It still sits on `fieldClass`, so the surface, border
          and focus ring match every field above it. */}
      <div>
        <Label htmlFor="resume">
          Resume{" "}
          <span className="text-xs text-ink-muted">(PDF or Word, max 25 MB)</span>
        </Label>
        <input
          id="resume"
          name="resume"
          type="file"
          accept=".pdf,.doc,.docx"
          required
          aria-invalid={!!state.errors?.resume}
          aria-describedby={state.errors?.resume ? "resume-error" : undefined}
          className={`${fieldClass} text-ink-soft file:mr-4 file:rounded-full file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-caption file:font-semibold file:text-white hover:file:bg-brand-500`}
        />
        <FieldError id="resume-error" message={state.errors?.resume} />
      </div>

      <SubmitButton>
        Submit application
        <Send className="h-4 w-4" />
      </SubmitButton>

      <FormAlert ok={state.ok} message={state.message} />
    </form>
  );
}
