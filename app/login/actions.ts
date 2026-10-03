"use server";

import { isRedirectError } from "next/dist/client/components/redirect";
import { AuthError } from "next-auth";
import { z } from "zod";

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
  const home = homeForRole(account?.role);

  /* Only same-origin paths. An open redirect on a login form is a phishing
     primitive: the victim authenticates on the real domain and is then bounced
     to an attacker's page that asks them to "confirm" the password.

     A `next` that belongs to the other role is dropped rather than followed —
     a partner who bookmarked /admin/partners gets their own portal, not a
     round trip through a guard. */
  const requested = parsed.data.next;
  const sameOrigin = requested && /^\/(?!\/)/.test(requested);
  const allowed =
    sameOrigin &&
    (account?.role === "PARTNER" ? !requested.startsWith("/admin") : !requested.startsWith("/portal"));

  const target = allowed ? requested : home;

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
