import {
  ShieldCheck,
  BadgeCheck,
  FlaskConical,
  ScrollText,
  Building2,
  Award,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Accreditation / partner strip. Real compounding pharmacies display the
 * credentialing bodies they answer to — PCAB, USP, NABP, LegitScript, etc.
 * Swap these for licensed partner logos (SVG in /public) when available.
 */
const partners = [
  { icon: ShieldCheck, name: "PCAB Accredited" },
  { icon: FlaskConical, name: "USP 795 & 797" },
  { icon: BadgeCheck, name: "NABP Verified" },
  { icon: ScrollText, name: "LegitScript Certified" },
  { icon: Building2, name: "FDA Registered 503A" },
  { icon: Award, name: "Third-Party Tested" },
];

export function Partners() {
  return (
    <section className="border-y border-brand-100 bg-white py-14">
      <div className="container-x">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Accredited, verified & trusted
          </p>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {partners.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.06}>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-brand-100 bg-sand text-brand-600">
                  <p.icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <span className="text-xs font-semibold text-ink-soft">
                  {p.name}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
