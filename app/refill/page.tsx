import type { Metadata } from "next";
import { ShieldCheck, Truck, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { RefillForm } from "@/components/forms/RefillForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Patient Refill Request",
  description: `Request a prescription refill from ${site.name}. Fast turnaround and real-time status updates.`,
  alternates: { canonical: "/refill" },
};

const notes = [
  { icon: Clock, text: "Most refills ship within 24–48 hours of confirmation." },
  { icon: Truck, text: "Discreet, temperature-appropriate shipping nationwide." },
  { icon: ShieldCheck, text: "Your information is handled securely and confidentially." },
];

export default function RefillPage() {
  return (
    <>
      <PageHeader
        cover="/images/site/cover-refill.jpg"
        eyebrow="Patient Refill"
        title="Request your prescription refill"
        subtitle="Enter the details from your prescription label and shipping address. Our team confirms every request before it enters the fulfillment queue."
      />

      <section className="bg-white py-14 md:py-20">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              What to expect
            </h2>
            <ul className="mt-6 space-y-4">
              {notes.map((n) => (
                <li key={n.text} className="flex items-start gap-3 text-ink-soft">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
                    <n.icon className="h-5 w-5" />
                  </span>
                  <span className="pt-2">{n.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl border border-brand-100 bg-sand p-6 text-sm text-ink-soft">
              Need help with your order? Call{" "}
              <a href={`tel:${site.phone}`} className="font-semibold text-brand-700 hover:underline">
                {site.phone}
              </a>{" "}
              during business hours.
            </div>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-sand p-6 sm:p-8">
            <RefillForm />
          </div>
        </div>
      </section>
    </>
  );
}
