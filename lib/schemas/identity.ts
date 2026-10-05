import { z } from "zod";

import { isValidUsPhone, parseUsPhone } from "@/lib/masks";

/* ===========================================================================
   Who is asking for the price list.

   Short on purpose — four fields and a photo. This is not a second
   application; it is the one question the inquiry form cannot answer, which
   is whether the person behind the email address is who they say they are.
   MSA §11 makes Provider Cost confidential, so it is worth the minute.

   Same idempotency rule as every schema here: transforms accept their own
   output, because the client validates and the server parses the result
   again.
   ========================================================================= */

const required = (label: string) =>
  z.string({ message: `${label} is required.` }).trim().min(1, `${label} is required.`);

export const identitySchema = z.object({
  requesterName: required("Your full name").max(120),
  requesterTitle: required("Your role at the practice").max(120),
  requesterPhone: z
    .string()
    .trim()
    .refine(isValidUsPhone, "Enter a valid US phone number.")
    .transform((v) => parseUsPhone(v)!),
  requesterEmail: z.string().trim().toLowerCase().email("Enter a valid email address."),
  requesterNote: z.string().trim().max(500).optional().or(z.literal("")),
  /** Ticked to confirm the uploaded ID is theirs. */
  attested: z.literal(true, { message: "Please confirm the ID is yours." }),
});

export type IdentityValues = z.input<typeof identitySchema>;

export const emptyIdentity: IdentityValues = {
  requesterName: "",
  requesterTitle: "",
  requesterPhone: "",
  requesterEmail: "",
  requesterNote: "",
  attested: true as const,
};
