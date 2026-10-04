"use server";

import { isRedirectError } from "next/dist/client/components/redirect";
import { AuthError } from "next-auth";
import { z } from "zod";
import type { Role } from "@prisma/client";

import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { homeForRole } from "@/lib/home-route";
import type { FormState } from "@/lib/forms";

const schema = z.object({
  email: z.string().trim().min(1, "Email address is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  /**
   * `.nullish()`, not `.optional()`.
   *
   * `FormData.get()` returns `null` for a field that is not present, and
   * `z.string().optional()` accepts `undefined` but rejects `null`. The hidden
   * `next` input only renders when there is a redirect target, so on an
   * ordinary sign-in the whole form failed validation on a field that has no
   * error message to display — a silent 200 with no session and nothing on
   * screen.
   */
  next: z.string().nullish(),
});

/**
 * Where to send someone once they are in.
 *
 * Only same-origin paths. An open redirect on a login form is a phishing
 * primitive: the victim authenticates on the real domain and is then bounced
 * to an attacker's page that asks them to "confirm" the password.
 *
 * A `next` that belongs to the other role is dropped rather than followed — a
 * partner who bookmarked /admin/partners gets their own portal, not a round
 * trip through a guard.
 *
 * Shared by both sign-in paths. Duplicating it would mean a second place to
 * forget the `//` check, and the forgotten one is always the newer one.
 */
function safeTarget(requested: string | null | undefined, role: Role | undefined): string {
  const home = homeForRole(role);
  if (!requested || !/^\/(?!\/)/.test(requested)) return home;

  const forbidden = role === "PARTNER" ? "/admin" : "/portal";
  return requested.startsWith(forbidden) ? home : requested;
}

/**
 * Sign in.
 *
 * Only one failure message exists, and it names neither field. Telling a
 * caller that the email was fine but the password was wrong confirms the
 * account exists — for a pharmacy partner portal that discloses which
 * practices we work with, to anyone with a list of addresses to try.
 */
export async function login(_prev: FormState, data: FormData): Promise<FormState> {
  const parsed = schema.safeParse({
    email: data.get("email")?.toString(),
    password: data.get("password")?.toString(),
    next: data.get("next")?.toString(),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;

    // Only `email` and `password` render an error node. Anything else would
    // fail invisibly, so it gets surfaced in the banner instead.
    const visible = new Set(["email", "password"]);
    const hidden = Object.entries(errors).filter(([field]) => !visible.has(field));

    return {
      ok: false,
      errors,
      message: hidden.length ? "Something went wrong with the sign-in form. Please try again." : undefined,
    };
  }

  /* Where this account belongs.
   *
   * Everyone used to land on /admin and a partner was then bounced to /portal
   * by the layout guard — a redirect, a flash of the wrong shell, and an
   * address bar that briefly said "admin" to someone who is not one.
   *
   * Looking the role up before signing in discloses nothing: the answer never
   * reaches the caller, and a wrong password still fails below with the same
   * message it always gave. */
  const account = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { role: true },
  });

  const target = safeTarget(parsed.data.next, account?.role);

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: target,
    });
  } catch (error) {
    // A successful signIn redirects by throwing; that must pass through.
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { ok: false, message: "That email and password do not match an account." };
    }
    throw error;
  }

  return { ok: true };
}

/* ===========================================================================
   Signing in with an emailed code.

   ONE FORM, ONE ACTION, TWO INTENTS.
   ----------------------------------
   This was two forms — one to ask for a code, one to submit it — with the
   address carried between them in a hidden input fed from React state. It
   failed exactly as that design always fails: a browser autofilling the email
   field does not necessarily fire React's change event, so the state stayed
   empty while the field looked full, and the second form posted a blank
   address. Validation then rejected it with "that code is not valid", which
   is true and completely unhelpful, because the code was fine.

   Now there is one form carrying one email field, and the submit button says
   which of the two things it wants via `intent`. A clicked button's
   name/value is part of the FormData the browser sends, so this works
   natively, needs no client state, and cannot disagree with what is on
   screen.

   NEITHER INTENT EVER SAYS WHETHER THE ADDRESS HAS AN ACCOUNT. `send` returns
   the same sentence for a partner, a former employee and a stranger. The
   password form has been careful about this since it was written; a second
   way in that is careless about it would undo that work entirely.
   ========================================================================= */

const codeSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .email("Enter a valid email address."),
  code: z.string().trim().optional(),
  next: z.string().nullish(),
});

export async function signInWithCode(_prev: FormState, data: FormData): Promise<FormState> {
  const parsed = codeSchema.safeParse({
    email: data.get("email")?.toString(),
    // Spaces stripped: people paste "272 001" off a phone screen.
    code: data.get("code")?.toString().replace(/\s/g, ""),
    next: data.get("next")?.toString(),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
    return { ok: false, errors };
  }

  const email = parsed.data.email.toLowerCase();
  const code = parsed.data.code ?? "";

  /* Which button was pressed. Defaults to sending, so a stray Enter in the
     email field with no code typed asks for one rather than failing. */
  const intent = data.get("intent")?.toString() === "verify" && code ? "verify" : "send";

  /* The form is rebuilt from this, not from client state — see FormState.data
     and the header above. */
  const sticky = { email, sent: "1" };

  const { peek, rateLimit, RATE_LIMITS } = await import("@/lib/rate-limit");

  if (intent === "send") {
    /* Its own budget, because this one puts a message in somebody's inbox:
       the limit that matters is "how many emails can one address be made to
       receive", not "how many guesses". Exceeding it returns the same success
       sentence — telling a flooder they have been throttled tells them the
       address is worth flooding. */
    const within = rateLimit(`login-code:${email}`, RATE_LIMITS.email).ok;

    if (within) {
      const { issueLoginCode } = await import("@/lib/services/login-codes");
      const issued = await issueLoginCode(email);

      if (issued) {
        const { sendEmail } = await import("@/lib/services/email");
        await sendEmail("auth/login-code", email, {
          contactName: issued.name,
          code: issued.code,
        }).catch(() => {
          /* Swallowed on purpose. A send failure must not become "that
             address has an account but our mail is down" — the caller sees
             the same sentence, and the code expires in ten minutes. */
        });
      }
    }

    return {
      ok: true,
      message: `If ${email} has an account, a six-digit code is on its way. It expires in ten minutes.`,
      data: sticky,
    };
  }

  if (!/^\d{6}$/.test(code)) {
    return {
      ok: false,
      errors: { code: "Enter the six digits from the email." },
      data: sticky,
    };
  }

  /* Checked here as well as inside the provider, which returns a bare null.
     Without this, someone who has burned the budget sees "that code is not
     valid" forever and reasonably concludes the feature is broken — the code
     IS valid, they are just locked out for a quarter of an hour. The limiter
     is keyed on the typed string and counts the same for an address with no
     account, so saying so reveals nothing. */
  if (!peek(`login:${email}`, RATE_LIMITS.login).ok) {
    return {
      ok: false,
      message: "Too many sign-in attempts. Wait fifteen minutes and try again.",
      data: sticky,
    };
  }

  const account = await db.user.findUnique({
    where: { email },
    select: { role: true },
  });
  const target = safeTarget(parsed.data.next, account?.role);

  try {
    await signIn("otp", { email, code, redirectTo: target });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      /* One message for expired, wrong, reused and out-of-guesses. The
         difference between them is only useful to somebody guessing. */
      return {
        ok: false,
        message: "That code did not work. It may have expired — ask for a new one.",
        data: sticky,
      };
    }
    throw error;
  }

  return { ok: true, data: sticky };
}
