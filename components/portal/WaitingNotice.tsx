import { Clock } from "lucide-react";

/**
 * Shown whenever the ball is in our court.
 *
 * The most common support question from an applicant mid-pipeline is "is it
 * my turn?". Answering it on the page, with what we are doing and roughly how
 * long, is cheaper than answering it on the phone.
 */
export function WaitingNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-tile border border-cyan-200 bg-cyan-50/60 px-4 py-3 text-meta text-ink-soft">
      <Clock className="mt-0.5 size-4 shrink-0 text-cyan-700" strokeWidth={2} aria-hidden />
      <span className="text-pretty">{children}</span>
    </p>
  );
}
