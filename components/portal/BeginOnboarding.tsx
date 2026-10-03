"use client";

import { useEffect, useRef } from "react";

import { beginOnboarding } from "@/app/(site)/portal/onboarding/actions";

/**
 * Moves PRICING_PARTNER_ACCEPTED → ONBOARDING_IN_PROGRESS when the applicant
 * first opens the form.
 *
 * A client effect rather than a server-component side effect, because
 * rendering must not mutate: a server component that transitions state on
 * render fires again on every revalidation, every prefetch and every refresh.
 *
 * The action is idempotent and checks the status itself, so a double-mount in
 * React strict mode costs one wasted query and nothing else.
 */
export function BeginOnboarding({ active }: { active: boolean }) {
  const fired = useRef(false);

  useEffect(() => {
    if (!active || fired.current) return;
    fired.current = true;
    void beginOnboarding().catch(() => undefined);
  }, [active]);

  return null;
}
