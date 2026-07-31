import Link from "next/link";
import {
  DocumentIcon,
  HormoneIcon,
  OrderBagIcon,
  RunnerIcon,
} from "@/components/icons";

/**
 * Entry points above the full catalog. The two flagship therapeutic areas sit
 * alongside the catalog and the refill flow, so a visitor who already knows
 * what they came for does not have to scan 29 products to find it.
 *
 * Each icon is matched to what it actually depicts — the running figure for
 * weight management, the paired gender symbols for hormone therapy — rather
 * than assigned decoratively.
 */
const shortcuts = [
  {
    icon: RunnerIcon,
    title: "Weight management",
    body: "GLP-1 and dual-agonist therapies in titration-friendly strengths.",
    href: "/products/weight-management",
    cta: "Browse therapies",
  },
  {
    icon: HormoneIcon,
    title: "Hormone replacement",
    body: "Bio-identical support dialed to lab-guided targets.",
    href: "/products/hormone-replacement",
    cta: "Browse therapies",
  },
  {
    icon: OrderBagIcon,
    title: "The full catalog",
    body: "Every compounded therapy across 13 therapeutic areas.",
    href: "/products",
    cta: "See all products",
  },
  {
    icon: DocumentIcon,
    title: "Refill a prescription",
    body: "Send us the details from your label and we handle the rest.",
    href: "/refill",
    cta: "Start a refill",
  },
];

export function StartHere() {
  return (
    <section className="band py-16 md:py-24">
      <div className="container-x">
        <h2 className="section-title text-center">Where to start</h2>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((s) => (
            <li key={s.title}>
              <Link
                href={s.href}
                className="group flex h-full flex-col rounded-tile bg-white p-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                <s.icon className="h-8 w-8 text-brand-500" />
                <h3 className="mt-5 text-[1.3125rem] font-semibold tracking-[-0.021em] text-ink">
                  {s.title}
                </h3>
                <p className="mt-2 flex-1 text-meta text-ink-soft">{s.body}</p>
                <span className="mt-5 text-meta text-brand-600 group-hover:underline">
                  {s.cta} <span aria-hidden>›</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
