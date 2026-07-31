import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Global pre-footer call-to-action, set as an Apple-style dark panel: near
 * black (#1d1d1f), a single oversized centred headline, a blue fill button and
 * a blue text link. The eyebrow carries the reference site's "where health and
 * partnership meet" line as a blue subhead rather than a chip.
 */
export function PartnershipCTA() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-x">
        <div className="overflow-hidden rounded-panel bg-ink px-8 py-20 text-center md:px-16 md:py-28">
          <Reveal>
            <p className="text-intro font-semibold text-brand-400">
              Where health and partnership meet
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mx-auto mt-3 max-w-3xl text-display-md font-semibold text-white md:text-display-xl">
              Wellness is crafted, not manufactured.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <Link href="/providers" className="btn-primary">
                Become a provider
              </Link>
              <Link
                href="/refill"
                className="inline-flex items-center gap-1 text-body text-brand-400 hover:underline"
              >
                Request a refill <span aria-hidden>›</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
