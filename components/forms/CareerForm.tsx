"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FileText, Send, Upload } from "lucide-react";

import { submitApplication } from "@/app/(site)/careers/actions";
import {
  FormAlert,
  PhoneField,
  RadioGroup,
  SelectField,
  ActionSubmitButton,
  TextField,
} from "@/components/ui/form/native";
import { FieldError } from "@/components/ui/label";
import { REFERRAL_SOURCES, initialFormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

const GENERAL = "General application";

/**
 * The careers application.
 *
 * Rewritten onto the same server-action pattern as the other three forms. It
 * previously faked its own success — `preventDefault()` then `setSent(true)` —
 * so an applicant was thanked for an application that was never sent anywhere,
 * and the form did nothing whatsoever without JavaScript.
 *
 * Three groups — who you are, the role, the resume — so a long form reads as
 * three short ones. The phone is `PhoneField`, the same self-punctuating box
 * the contact form uses, and the server checks it is a real US number.
 */
export function CareerForm({ roles }: { roles: string[] }) {
  const [state, action] = useFormState(submitApplication, initialFormState);

  return (
    <form action={action} className="space-y-9">
      <Group step="01" title="Your details">
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
          <TextField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            error={state.errors?.email}
          />
          <PhoneField name="phone" label="Phone" error={state.errors?.phone} />
        </div>
      </Group>

      <Group step="02" title="The role">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="role"
            label="Position"
            options={[...roles, GENERAL]}
            defaultValue={GENERAL}
            error={state.errors?.role}
          />
          <SelectField
            name="referral"
            label="How did you hear about us?"
            options={REFERRAL_SOURCES}
            error={state.errors?.referral}
          />
        </div>
        <RadioGroup
          name="relocate"
          label="Are you willing to relocate?"
          options={["Yes", "No"]}
          error={state.errors?.relocate}
        />
      </Group>

      <Group step="03" title="Resume">
        <ResumeInput error={state.errors?.resume} />
      </Group>

      <div className="space-y-4 border-t border-hair pt-7">
        <ActionSubmitButton>
          Submit application
          <Send className="h-4 w-4" />
        </ActionSubmitButton>
        <p className="text-caption text-ink-muted">
          We review every application and reply by email.
        </p>
        <FormAlert ok={state.ok} message={state.message} />
      </div>
    </form>
  );
}

function Group({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-5 flex items-baseline gap-3">
        <span className="font-mono text-caption text-brand-600">{step}</span>
        <span className="text-[1.0625rem] font-medium text-navy">{title}</span>
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * The file input as a drop area: the real `<input type="file">` covers the
 * whole box, so clicking anywhere or dropping a file on it works natively and
 * the form still posts with JavaScript off. The chosen file's name replaces
 * the prompt, which the bare input showed only as tiny grey text.
 */
function ResumeInput({ error }: { error?: string }) {
  const [file, setFile] = useState<string | null>(null);
  const errorId = "resume-error";

  return (
    <div>
      <label
        htmlFor="resume"
        className={cn(
          "relative flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed px-6 py-8 text-center transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-500 motion-reduce:transition-none",
          error ? "border-danger" : "border-hair hover:border-brand-500 hover:bg-tint/40"
        )}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tint">
          {file ? (
            <FileText className="h-5 w-5 text-brand-600" aria-hidden />
          ) : (
            <Upload className="h-5 w-5 text-brand-600" aria-hidden />
          )}
        </span>
        <span className="text-[0.9375rem] font-medium text-navy [overflow-wrap:anywhere]">
          {file ?? "Upload your resume"}
        </span>
        <span className="text-caption text-ink-muted">
          {file ? "Click to choose a different file" : "PDF or Word · up to 25 MB"}
        </span>
        <input
          id="resume"
          name="resume"
          type="file"
          accept=".pdf,.doc,.docx"
          required
          onChange={(event) => setFile(event.currentTarget.files?.[0]?.name ?? null)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
