"use client";

import { useFormState } from "react-dom";

import { login } from "@/app/login/actions";
import { FormAlert, ActionSubmitButton, TextField } from "@/components/ui/form/native";
import { initialFormState } from "@/lib/forms";

/**
 * The login form.
 *
 * Built from the same `Fields` set as every other form on this site rather
 * than from hand-rolled inputs, so it inherits the label/error wiring, the
 * `useId` pairing and the disabled-JS behaviour for free — and so a change to
 * the input styling reaches this page too.
 *
 * `autoComplete` is `username` / `current-password` because those are the
 * exact tokens a password manager looks for; anything else and saved
 * credentials silently stop being offered.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useFormState(login, initialFormState);

  return (
    <form action={action} className="mt-7 space-y-4">
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

      <div className="pt-2">
        <ActionSubmitButton>Sign in</ActionSubmitButton>
      </div>
    </form>
  );
}
