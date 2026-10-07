"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { KeyRound, Mail } from "lucide-react";

import { login, signInWithCode } from "@/app/login/actions";
import { FormAlert, ActionSubmitButton, TextField } from "@/components/ui/form/native";
import { initialFormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

/**
 * Two ways in: a password, or a six-digit code emailed to you.
 *
 * WHY THE SECOND ONE EXISTS
 * -------------------------
 * A practice manager signs in a handful of times a year. They do not have the
 * password saved and they do not remember it, so the honest description of
 * today's flow is "forgot password, every time" — a reset link, a new
 * password, and a second credential nobody will remember either. A code sent
 * to the address on the account does that in one step and leaves nothing
 * behind to forget.
 *
 * PASSWORD IS STILL THE DEFAULT. Staff sign in daily with a manager filling
 * the fields, and making them click past a code form every morning to reach
 * the thing their browser already knows would be a worse trade than the one
 * it fixes.
 */
export function LoginForm({ next }: { next?: string }) {
  const [method, setMethod] = useState<"password" | "code">("password");

  return (
    <div className="mt-8">
      {/* A segmented control, not two pages. The address is typed into
          whichever panel is showing, so switching costs a field, not a page
          load. */}
      <div
        role="tablist"
        aria-label="How to sign in"
        /* A pill track, not a bordered box. The reference puts the whole
           control on `hair-soft` with a white "thumb" under the selected
           half — the shadow is what makes it read as raised rather than as
           two buttons that happen to differ in colour. */
        className="grid grid-cols-2 gap-1 rounded-full bg-hair-soft p-1"
      >
        <MethodTab
          id="password"
          current={method}
          onSelect={setMethod}
          icon={<KeyRound className="size-4" strokeWidth={1.9} aria-hidden />}
        >
          Password
        </MethodTab>
        <MethodTab
          id="code"
          current={method}
          onSelect={setMethod}
          icon={<Mail className="size-4" strokeWidth={1.9} aria-hidden />}
        >
          Email a code
        </MethodTab>
      </div>

      {method === "password" ? <PasswordForm next={next} /> : <CodeForm next={next} />}
    </div>
  );
}

function MethodTab({
  id,
  current,
  onSelect,
  icon,
  children,
}: {
  id: "password" | "code";
  current: "password" | "code";
  onSelect: (value: "password" | "code") => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const active = current === id;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`signin-${id}`}
      onClick={() => onSelect(id)}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-[14px] font-medium transition-colors duration-200 motion-reduce:transition-none",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        active
          ? "bg-white text-navy shadow-[0_1px_2px_rgba(13,25,62,.08)]"
          : "text-ink-soft hover:text-navy"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function PasswordForm({ next }: { next?: string }) {
  const [state, action] = useFormState(login, initialFormState);

  return (
    <form id="signin-password" role="tabpanel" action={action} className="mt-6 flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state.message && <FormAlert ok={state.ok} message={state.message} />}

      <TextField
        name="email"
        label="Email address"
        type="email"
        autoComplete="username"
        error={state.errors?.email}
      />
      <TextField
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={state.errors?.password}
      />

      <div className="pt-1">
        <ActionSubmitButton>Sign in</ActionSubmitButton>
      </div>
    </form>
  );
}

/**
 * Ask for a code, then type it in — in one form.
 *
 * ONE FORM, NOT TWO. The first version was a request form and a separate
 * verify form, with the address carried between them in a hidden input fed
 * from React state. A browser autofilling the email does not reliably fire
 * React's change event, so the state stayed empty while the field looked
 * full and the verify step posted a blank address — which came back as "that
 * code is not valid" about a code that was perfectly good.
 *
 * Here the email field is the same field throughout, the server says which
 * step we are on (`state.data.sent`), and the submit button carries the
 * intent. Nothing is held in client state, so nothing can disagree with what
 * is on screen.
 */
function CodeForm({ next }: { next?: string }) {
  const [state, action] = useFormState(signInWithCode, initialFormState);

  const sent = state.data?.sent === "1";

  return (
    <form id="signin-code" role="tabpanel" action={action} className="mt-6 flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state.message && <FormAlert ok={state.ok} message={state.message} />}

      <TextField
        name="email"
        label="Email address"
        type="email"
        autoComplete="username"
        // Echoed back from the server, so the address on screen is the one it
        // actually used.
        defaultValue={state.data?.email}
        error={state.errors?.email}
      />

      {!sent ? (
        <div className="pt-1">
          <ActionSubmitButton name="intent" value="send">
            Email me a code
          </ActionSubmitButton>
        </div>
      ) : (
        <>
          <TextField
            name="code"
            label="Six-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            hint="Check your inbox. The code expires ten minutes after it is sent."
            error={state.errors?.code}
            className="h-[58px] text-center font-mono text-[22px] tracking-[0.4em]"
          />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
            <ActionSubmitButton name="intent" value="verify" block={false}>
              Sign in
            </ActionSubmitButton>

            {/* A quiet second submit, not a button competing with the first.
                Same form, same email field, different intent. */}
            <ResendButton />
          </div>
        </>
      )}
    </form>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="intent"
      value="send"
      disabled={pending}
      className="text-[14px] font-medium text-ink-muted underline underline-offset-4 transition-colors hover:text-navy disabled:opacity-50 motion-reduce:transition-none"
    >
      Send a new code
    </button>
  );
}
