"use client";

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";

import { CheckboxField, MaskedField, TextAreaField, TextField } from "@/components/ui/form/fields";
import { FormBanner, SubmitButton, useFormAction } from "@/components/ui/form/submit";
import { DocumentRow, type UploadedDocument } from "@/components/portal/DocumentUploader";
import { specFor } from "@/lib/partner/documents";
import { emptyIdentity, identitySchema, type IdentityValues } from "@/lib/schemas/identity";
import { submitIdentity } from "@/app/(site)/portal/identity/actions";

/* ===========================================================================
   Confirming who is asking for the price list.

   Four fields and a photo. It sits between the enquiry and the formulary
   because Provider Cost is confidential under MSA §11, and the public enquiry
   form is fourteen fields anyone can fill in.

   The ID upload reuses the same component and the same presigned path as the
   onboarding documents, so there is one upload implementation with one set of
   ownership checks rather than a second one written for this page.
   ========================================================================= */

export function IdentityForm({
  defaults,
  idDocuments,
}: {
  defaults?: Partial<IdentityValues>;
  idDocuments: UploadedDocument[];
}) {
  const form = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema) as never,
    defaultValues: {
      ...emptyIdentity,
      ...defaults,
      // Never restored: they confirm against what is on screen now.
      attested: false as never,
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const { banner, onSubmit } = useFormAction(form, submitIdentity);
  const { isSubmitting } = form.formState;

  const spec = specFor("GOVERNMENT_ID")!;
  const hasId = idDocuments.some((doc) => doc.status !== "REJECTED");

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <FormBanner banner={banner} />

        <section className="card space-y-5 p-6 md:p-8">
          <div>
            <h2 className="text-[1.125rem] font-bold text-ink">Who is asking</h2>
            <p className="mt-1 max-w-prose text-caption text-ink-muted">
              The person who will receive our formulary. A direct line matters more than a
              switchboard — we may call to confirm before releasing pricing.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField<IdentityValues> name="requesterName" label="Your full name" autoComplete="name" />
            <TextField<IdentityValues>
              name="requesterTitle"
              label="Your role"
              placeholder="Practice Manager"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MaskedField<IdentityValues>
              name="requesterPhone"
              label="Direct phone"
              mask="phone"
              autoComplete="tel"
            />
            <TextField<IdentityValues>
              name="requesterEmail"
              label="Work email"
              type="email"
              autoComplete="email"
            />
          </div>

          <TextAreaField<IdentityValues>
            name="requesterNote"
            label="Anything we should know"
            rows={2}
            optional
            placeholder="Which prescribers you order for, or who else should receive pricing."
          />
        </section>

        <section className="card space-y-5 p-6 md:p-8">
          <div>
            <h2 className="text-[1.125rem] font-bold text-ink">Photo ID</h2>
            <p className="mt-1 max-w-prose text-caption text-ink-muted">
              A driver&rsquo;s licence or passport. Photograph it with a phone — PDF, JPG, PNG and
              WebP all work. It goes straight to encrypted storage and is visible only to you and
              the reviewer handling your account.
            </p>
          </div>

          <DocumentRow spec={spec} documents={idDocuments} locked={false} />
        </section>

        <section className="card space-y-4 p-6 md:p-8">
          <CheckboxField<IdentityValues>
            name="attested"
            label="This is my own government-issued ID"
            hint="We match the name on it against the name above before releasing any pricing."
          />

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <SubmitButton pending={isSubmitting} pendingLabel="Submitting…">
              Submit for verification
            </SubmitButton>

            {!hasId && (
              <p className="flex items-center gap-1.5 text-caption text-ink-muted">
                <ShieldCheck className="size-3.5" strokeWidth={2.2} aria-hidden />
                Upload your ID above to finish.
              </p>
            )}
          </div>
        </section>
      </form>
    </FormProvider>
  );
}
