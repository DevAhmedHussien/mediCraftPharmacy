import type { Metadata } from "next";
import { breadcrumbJsonLd, jsonLdProps, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import {
  CardGrid,
  ClosingCta,
  Faq,
  IconCard,
  PageHero,
  SectionHead,
} from "@/components/blocks";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { Reveal } from "@/components/ui/Reveal";
import { closingCta, resources } from "@/lib/content";
import { media } from "@/lib/media";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Resources & FAQ",
  description:
    "Answers for patients and providers on compounded medications, prescriptions, insurance, turnaround times, refills, EMR integration and state coverage.",
  path: "/support",
});

export default function ResourcesPage() {
  /**
   * FAQ structured data, built from the same arrays the page renders. Both
   * audiences' questions are included so the whole page is eligible for rich
   * results rather than only half of it.
   */
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      ...resources.patientFaqs.items,
      ...resources.providerFaqs.items,
    ].map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <ScrollProgress />
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "Resources & FAQ", path: "/support" }]))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        media={media.support}
        eyebrow={resources.intro.eyebrow}
        title={resources.intro.title}
        lead={resources.intro.lead}
      />

      {/* ---- Patient FAQ ---- */}
      <section className="section">
        <div className="container-narrow">
          <Reveal>
            <SectionHead
              title={resources.patientFaqs.title}
              lead={resources.patientFaqs.lead}
              size="sm"
            />
          </Reveal>
          <Reveal delay={0.05} className="mt-8">
            <Faq items={resources.patientFaqs.items} />
          </Reveal>
        </div>
      </section>

      {/* ---- Provider FAQ ---- */}
      <section className="band section">
        <div className="container-narrow">
          <Reveal>
            <SectionHead
              title={resources.providerFaqs.title}
              lead={resources.providerFaqs.lead}
              size="sm"
            />
          </Reveal>
          <Reveal delay={0.05} className="mt-8">
            <Faq items={resources.providerFaqs.items} />
          </Reveal>
        </div>
      </section>

      {/* ---- Clinical guides ----
          Not yet written, so each card says so on its face rather than
          linking somewhere empty. */}
      <section id="resources" className="section scroll-mt-32">
        <div className="container-x">
          <Reveal>
            <SectionHead
              eyebrow={resources.guides.eyebrow}
              title={resources.guides.title}
              lead={resources.guides.lead}
            />
          </Reveal>
          <Reveal delay={0.1} className="mt-12">
            <CardGrid cols={3}>
              {resources.guides.items.map((guide) => (
                <IconCard
                  key={guide.title}
                  {...guide}
                  status={resources.guides.status}
                />
              ))}
            </CardGrid>
          </Reveal>

          <Reveal delay={0.15} className="mt-10">
            <p className="text-meta text-ink-soft">
              Need something that isn&rsquo;t here?{" "}
              <Link href="/contact" className="link-arrow">
                Ask our clinical team
              </Link>{" "}
              or call{" "}
              <a
                href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
                className="font-bold text-brand-600 hover:underline"
              >
                {site.phone}
              </a>
              .
            </p>
          </Reveal>
        </div>
      </section>

      <ClosingCta {...closingCta} />
    </>
  );
}
