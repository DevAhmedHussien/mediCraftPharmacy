import { PageHero } from "@/components/blocks";
import { legal } from "@/lib/content";
import { site } from "@/lib/site";

/**
 * Shared shell for the two legal documents.
 *
 * In the owner's identity file these lived in modal dialogs. They are real
 * pages here instead: a privacy policy and terms of use need to be linkable,
 * printable, and indexable, and a modal is none of those.
 */
export function LegalPage({
  doc,
  contactEmail,
  contactLabel,
}: {
  doc: typeof legal.privacy | typeof legal.terms;
  contactEmail: string;
  contactLabel: string;
}) {
  return (
    <>
      <PageHero eyebrow="Legal" title={doc.title}>
        <p className="mt-5 font-mono text-caption uppercase tracking-wider text-cyan-300">
          Effective {legal.effectiveDate}
        </p>
      </PageHero>

      <article className="section">
        <div className="container-narrow">
          <p className="text-body text-ink-soft text-pretty">{doc.intro}</p>

          {doc.sections.map((section) => (
            <section key={section.heading} className="mt-10">
              <h2 className="text-[1.25rem] font-bold text-ink">{section.heading}</h2>
              <p className="mt-3 text-body text-ink-soft text-pretty">{section.body}</p>
            </section>
          ))}

          <section className="mt-10 border-t border-line pt-8">
            <h2 className="text-[1.25rem] font-bold text-ink">Contact</h2>
            <p className="mt-3 text-body text-ink-soft">
              {contactLabel}{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="font-bold text-brand-600 hover:underline"
              >
                {contactEmail}
              </a>{" "}
              ·{" "}
              <a
                href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
                className="font-bold text-brand-600 hover:underline"
              >
                {site.phone}
              </a>
            </p>
          </section>
        </div>
      </article>
    </>
  );
}
