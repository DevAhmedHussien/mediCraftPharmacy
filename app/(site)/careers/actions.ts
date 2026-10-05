"use server";

import { headers } from "next/headers";


import { RESUME_MAX_BYTES, RESUME_TYPES, type FormState } from "@/lib/forms";
import { careerSchema, validate } from "@/lib/forms.schema";
import { clientIp } from "@/lib/rate-limit";
import { recordInquiry } from "@/lib/services/inquiries";
import { notifyStaffOfInquiry } from "@/lib/services/inquiry-notify";

/**
 * Careers application handler.
 *
 * This action is new. The careers form previously had no server side at all:
 * it called `preventDefault()` and set a local `sent` flag, so an applicant saw
 * "our team will review your application" for an application that was never
 * transmitted anywhere and existed only in React state until they navigated
 * away. It also did nothing at all with JavaScript disabled.
 *
 * It now posts like every other form on the site. Delivery is still a TODO —
 * the same one the other three carry — but the submission is validated on the
 * server and reaches a point where wiring it up is a one-line change.
 */
export async function submitApplication(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const result = validate(careerSchema, data);
  if (!result.ok) return result.state;

  /* The resume is checked here rather than in the schema because it arrives as
     a File. The `accept` attribute on the input is a picker filter, not a
     constraint — anything can be posted to a server action directly — so the
     type and size are both re-checked on this side. */
  const resume = data.get("resume");
  if (!(resume instanceof File) || resume.size === 0) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      errors: { resume: "Attach your resume." },
    };
  }
  if (resume.size > RESUME_MAX_BYTES) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      errors: { resume: "That file is over the 25 MB limit." },
    };
  }
  if (!RESUME_TYPES.includes(resume.type)) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      errors: { resume: "Attach a PDF or Word document." },
    };
  }

  /* Stored, not logged. The resume itself is not kept here: a CV is personal
     data with its own retention question, and the honest thing is to record
     that one was attached and ask the candidate for it when someone picks the
     application up, rather than quietly warehousing files nobody has decided
     how long to keep. */
  try {
    const inquiry = await recordInquiry({
      kind: "CAREER",
      name: [result.data.firstName, result.data.lastName].filter(Boolean).join(" "),
      email: result.data.email,
      phone: result.data.phone,
      subject: `Application — ${String((result.data as Record<string, unknown>).role ?? "general")}`,
      payload: {
        ...result.data,
        resume: { name: resume.name, type: resume.type, size: resume.size },
      },
      ip: clientIp(headers()),
    });

    await notifyStaffOfInquiry(inquiry.id, "CAREER");
  } catch (error) {
    console.error("[careers] could not record the application", (error as Error)?.message);
    return {
      ok: false,
      message: "We could not submit that. Please try again, or email us directly.",
    };
  }

  return {
    ok: true,
    message:
      "Thank you for applying — our team will review your application and be in touch soon.",
  };
}
