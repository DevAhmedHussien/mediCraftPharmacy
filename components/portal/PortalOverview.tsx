import Link from "next/link";

import { Card } from "@/components/ui/glass";
import { cn } from "@/lib/utils";
import type { PartnerStatus } from "@/lib/partner/status";
import { PUBLIC_PHASES, isWaitingOnUs, nextAction, stepPosition, stepStates } from "@/lib/partner/steps";

/**
 * Redesigned portal overview. Server component.
 * Render from app/portal/page.tsx with the partner you already load there:
 *   <PortalOverview status={partner.status} practiceName={partner.practiceName} />
 * Everything is derived from lib/partner/steps.ts — the same table the
 * tracker and route guards use — so the screen cannot disagree with access.
 */
export function PortalOverview({ status, practiceName }: { status: PartnerStatus; practiceName: string }) {
  const steps = stepStates(status);
  const waiting = isWaitingOnUs(status);
  const action = nextAction(status);
  const { current, total } = stepPosition(status);
  const currentStep = steps.find((s) => s.state === "current");
  const done = steps.filter((s) => s.state === "complete").length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-ink-muted">
            {practiceName} · Step {current} of {total}
          </p>
          <h1 className="text-[clamp(1.9rem,3.4vw,2.6rem)] font-normal leading-tight tracking-title">Your account</h1>
        </div>
      </header>

      {/* Next step */}
      <section
        aria-labelledby="next-h"
        className="grid items-center gap-x-12 gap-y-6 rounded-hero border border-hair-soft bg-gradient-to-b from-white to-[#f1f3f8] p-[clamp(1.5rem,3.4vw,2.5rem)] md:grid-cols-[1fr_auto]"
      >
        <div className="flex flex-col gap-3">
          <p className={cn("flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em]", waiting ? "text-cyan-700" : "text-brand-500")}>
            <span aria-hidden className={cn("h-2 w-2 rounded-full", waiting ? "bg-cyan-400" : "bg-brand-500")} />
            {waiting ? "Waiting on us" : "Your next step"}
          </p>
          <h2 id="next-h" className="text-[clamp(1.6rem,3vw,2.25rem)] font-normal leading-[1.12] tracking-[-0.03em] text-balance">
            {action?.label ?? currentStep?.label}
          </h2>
          {currentStep && <p className="max-w-[520px] text-[15.5px] leading-relaxed text-ink-soft text-pretty">{currentStep.publicDetail}</p>}
        </div>
        {action && (
          <Link href={action.href} className="justify-self-start rounded-full bg-navy px-6 py-[15px] text-[15px] font-medium text-white transition-colors hover:bg-brand-500 md:justify-self-end">
            {action.label} →
          </Link>
        )}
      </section>

      {/* Tracker, grouped by phase */}
      <Card className="flex flex-col gap-6 p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium">Onboarding</h2>
          <div className="flex items-center gap-3 font-mono text-xs text-ink-muted">
            <span>{done} / {total} complete</span>
            <span className="block h-1 w-[120px] overflow-hidden rounded bg-hair">
              <span className="block h-full bg-brand-500" style={{ width: `${(done / total) * 100}%` }} />
            </span>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {PUBLIC_PHASES.map((phase) => (
            <div key={phase.phase}>
              <p className="mb-1.5 border-b border-hair pb-2 font-mono text-[10.5px] uppercase tracking-eyebrow text-ink-muted">{phase.phase}</p>
              <ol className="flex flex-col gap-0.5">
                {phase.steps.map((p) => {
                  const s = steps.find((x) => x.id === p.id)!;
                  const isWaiting = s.state === "current" && waiting;
                  return (
                    <li
                      key={s.id}
                      aria-current={s.state === "current" ? "step" : undefined}
                      className={cn("grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-2.5", s.state === "current" && "bg-tint")}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "grid h-[22px] w-[22px] place-items-center rounded-full font-mono text-[10.5px]",
                          s.state === "complete" && "bg-navy text-white",
                          s.state === "current" && "bg-brand-500 text-white",
                          s.state === "locked" && "border border-hair-strong bg-white text-ink-muted"
                        )}
                      >
                        {s.state === "complete" ? "✓" : p.number}
                      </span>
                      <span className="flex flex-col">
                        <span className={cn("text-[14.5px]", s.state === "current" && "font-medium", s.state === "locked" && "text-ink-muted")}>{s.label}</span>
                        <span className="text-[12.5px] text-ink-muted">{s.blurb}</span>
                      </span>
                      <span className={cn("font-mono text-[10.5px] uppercase tracking-[0.06em]", isWaiting ? "text-cyan-700" : "text-brand-500")}>
                        {isWaiting ? "With us" : s.state === "current" ? "Now" : s.state === "complete" ? "Done" : ""}
                        <span className="sr-only">{s.state === "locked" ? "Locked" : ""}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-[12.5px] text-ink-muted">Sections unlock as each stage is completed. Stages cannot be skipped.</p>
    </div>
  );
}

/* Sidebar: wrap the existing <PortalNav> (client, uses usePathname) in a
   Glass panel inside PortalShell — the nav data and gating stay as they are:

   <aside className="sticky top-0 h-screen p-4">
     <Glass className="flex h-full min-h-0 flex-col gap-[22px] overflow-y-auto rounded-card px-3.5 py-5">
       <Logo className="ml-2 h-7 w-auto" />
       <PortalNav groups={PORTAL_NAV_GROUPS} status={status} />
       <Card className="mt-auto p-3.5 text-[13px]">…provider team contact…</Card>
     </Glass>
   </aside>

   Locked items: text-ink-muted, aria-disabled, plus a "LOCKED" mono tag. */
