import "server-only";

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/* ===========================================================================
   Markdown → HTML, sanitised.

   An admin is a trusted author, not a trusted source of HTML. That
   distinction matters because the admin account is precisely what an attacker
   would phish: its output is published on the pharmacy's own origin, where a
   single <script> would run with the site's session cookies in scope.

   So the pipeline is parse → sanitise → render, and `dangerouslySetInnerHTML`
   only ever receives the sanitised string. The allow-list is deliberately
   narrow: the elements a clinical article actually needs, and no more. No
   <iframe>, no <style>, no event handlers, no javascript: URLs.
   ========================================================================= */

marked.setOptions({ gfm: true, breaks: false });

const ALLOWED_TAGS = [
  "h2", "h3", "h4", "p", "a", "ul", "ol", "li", "blockquote",
  "strong", "em", "code", "pre", "hr", "br",
  "table", "thead", "tbody", "tr", "th", "td",
];

export function renderMarkdown(source: string): string {
  const raw = marked.parse(source, { async: false }) as string;

  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    // http/https/mailto only. Blocks javascript: and data: URLs, which are
    // the two that turn a link into script execution.
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      // Anything off-site opens in a new tab and cannot reach back through
      // window.opener to rewrite this page's location.
      a: (tagName, attribs) => {
        const href = attribs.href ?? "";
        const external = /^https?:\/\//.test(href) && !href.includes("medicraftpharmacy.com");
        return {
          tagName,
          attribs: external
            ? { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" }
            : attribs,
        };
      },
    },
  });
}

/** First ~160 characters of prose, for a meta description fallback. */
export function excerptFromMarkdown(source: string, length = 160): string {
  const text = source
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/[*_`>#\-]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return text.length <= length ? text : `${text.slice(0, length).replace(/\s+\S*$/, "")}…`;
}
