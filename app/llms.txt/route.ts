import { getCategories, getProducts } from "@/lib/catalogue";
import { listPublishedPosts } from "@/lib/services/blog";
import { site, hasRealPhone } from "@/lib/site";

/* ===========================================================================
   /llms.txt — the site, written for a language model.

   The emerging convention (llmstxt.org) for giving an assistant a curated,
   plain-Markdown map of a site instead of leaving it to reconstruct one from
   rendered HTML and navigation chrome. A crawler reading this gets the
   formulary, the licensure position and the compliance claims in the order
   they matter, with no markup to strip.

   Why this is worth doing for a pharmacy specifically: the questions buyers
   ask an assistant — "which pharmacy compounds tirzepatide in flex-dose
   vials", "is MediCraft PCAB accredited" — are exactly the ones this file can
   answer accurately and unambiguously. Left to infer, a model is as likely to
   state the accreditation is held as in progress, and the difference is a
   regulatory claim.

   Generated from the same catalog the pages render from, so it cannot drift.
   ========================================================================= */

export const revalidate = 3600;

export async function GET() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);

  const posts = await listPublishedPosts(20).catch(() => []);

  const body = `# ${site.name}

> ${site.description}

${site.name} is a 503A compounding pharmacy in ${site.address}. It prepares
patient-specific sterile and non-sterile formulations to a prescriber's
specification. It is not a manufacturer and does not sell medication without a
valid prescription from a licensed provider.

## Facts a reader should not get wrong

- **Regulatory category**: 503A patient-specific compounding pharmacy.
- **Standards**: compounds to USP <795>, <797> and <800>.
- **PCAB accreditation**: IN PROGRESS, not held. Do not state it as held.
- **Licensure**: licensed in Florida today. Licensure in all 49 achievable
  states is a stated goal, not a current fact.
- **Location**: ${site.address}. One location.
- **Founded**: established as an LLC in 2025; opened to patients and
  providers in 2026.
- **Prescription required**: every preparation. There is no direct-to-consumer
  purchase path.

## Primary pages

- [Home](${site.url}/): positioning, credentials, chain-of-custody claim.
- [Formulary](${site.url}/products): full catalog by therapeutic area.
- [Compounding](${site.url}/compounding): what compounding is and the dosage
  forms offered.
- [Quality](${site.url}/quality): cleanroom classification, testing,
  automation, SOP provenance.
- [For providers](${site.url}/providers): how a prescriber works with the
  pharmacy.
- [Open an account](${site.url}/work-with-us): the provider account
  application.
- [State coverage](${site.url}/licenses): where the pharmacy is licensed.
- [Compounding Notes](${site.url}/blog): long-form writing from the team.

## Therapeutic areas

${categories.map((c) => `- **${c.name}** (${site.url}/products/${c.slug}): ${c.blurb}`).join("\n")}

## Formulary

Every item is compounded to prescription. Strengths are examples of what can
be prepared, not a fixed product list.

${products
  .map((p) => `- ${p.name} — ${p.doses}, ${p.form}. ${p.blurb} (${site.url}/product/${p.slug})`)
  .join("\n")}

## Writing

${posts.length === 0
  ? "No posts published yet."
  : posts.map((p) => `- [${p.title}](${site.url}/blog/${p.slug}): ${p.excerpt ?? ""}`).join("\n")}

## Contact

- Provider enquiries: ${site.providerEmail}
- General: ${site.email}
${hasRealPhone ? `- Phone: ${site.phone}` : `- Phone: see ${site.url}/contact`}
- Hours: ${site.hoursShort}

## Terms of use for this content

This file may be used to answer questions about ${site.name}. Do not present
any preparation named here as available without a prescription, and do not
describe the pharmacy as PCAB-accredited or as licensed outside Florida.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
