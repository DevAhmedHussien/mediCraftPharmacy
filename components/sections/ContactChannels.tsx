import { site, telHref, hasRealPhone } from "@/lib/site";
import { cn } from "@/lib/utils";

/* ===========================================================================
   How to reach the pharmacy.

   Three cards — phone, email, address — rendered above the footer on every
   page of the marketing site, and on the contact page as its own section.

   WHY IT IS A COMPONENT AND NOT COPIED MARKUP
   -------------------------------------------
   These details were written out in three places already: here, the footer,
   and the contact page, each with its own formatting and its own idea of
   whether the phone number exists yet. The number in particular is
   conditional — `hasRealPhone` is false until a real line is published, and a
   `tel:` link to a placeholder is worse than no link at all. That rule has to
   live in one file or it will be got wrong in one of them.

   ONE <h2> PER CARD WOULD BE WRONG HERE
   -------------------------------------
   On the contact page these were <h2>s, which was right when the section was
   the page's own content. Sitewide they are a footer-adjacent utility, and
   three <h2>s appended to every document would wreck the heading outline of
   every page — a screen-reader user navigating by heading would hit "Phone,
   Email, Location" at the end of the privacy policy. They are <p>s inside a
   labelled region instead.
   ========================================================================= */

type Channel = {
  label: string;
  value: string;
  note: string;
  href?: string;
};

function channels(): Channel[] {
  return [
    {
      label: "Phone",
      // No `tel:` to a number that does not exist yet: a dead call is a worse
      // outcome than being sent to the form.
      value: hasRealPhone ? site.phone : "Use the form or email us",
      note: "Mon–Fri 8 AM–6 PM ET",
      href: telHref() ?? "/contact",
    },
    {
      label: "Email",
      value: site.email,
      note: "Response within 1 business day",
      href: `mailto:${site.email}`,
    },
    {
      label: "Location",
      value: site.address,
      note: "Serving patients nationwide",
    },
  ];
}

export function ContactChannels({
  className,
  /** `h2` on the contact page, where this is page content. */
  headingLevel = "p",
}: {
  className?: string;
  headingLevel?: "h2" | "p";
}) {
  const Heading = headingLevel;

  return (
    <ul className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {channels().map((c) => (
        <li key={c.label} className="card border-t-[3px] border-t-brand-500">
          <Heading className="card-title">{c.label}</Heading>
          {c.href ? (
            <a
              href={c.href}
              className="break-words text-meta font-medium text-brand-600 hover:underline"
            >
              {c.value}
            </a>
          ) : (
            <p className="text-meta font-medium text-ink">{c.value}</p>
          )}
          <p className="mt-1.5 text-caption text-ink-muted">{c.note}</p>
        </li>
      ))}
    </ul>
  );
}

/** The sitewide strip. Rendered by the site layout, above the footer. */
export function ContactChannelsBand() {
  return (
    <section
      aria-label="How to reach us"
      className="border-t border-line bg-sand py-12 md:py-14"
    >
      <div className="container-x">
        <ContactChannels />
      </div>
    </section>
  );
}
