import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/* ===========================================================================
   Class-name helper.

   tailwind-merge resolves conflicts by keeping the last class in a group, and
   it works out the groups from Tailwind's DEFAULT scale. This project renames
   the font-size scale entirely — `text-meta`, `text-body`, `text-display-lg`
   and the rest, from tailwind.config.ts — and none of those names mean anything
   to the stock matcher. It files them under `text-color` instead, alongside
   `text-ink` and `text-white`.

   The result is a silent bug rather than a loud one:

     cn("text-meta text-ink")  ->  "text-ink"

   The size is dropped, the element inherits whatever it inherits, and nothing
   errors. It surfaced on the form fields, where the intended 14px field text
   was rendering at the body's 17px because `fieldClass` carries `text-meta`
   and `text-ink` together and the merge discarded the first.

   Declaring the scale here is what makes the two groups distinct, so a size and
   a colour can coexist. Every custom key in the config's `fontSize` block must
   be listed — add to both places or the class goes back to being eaten.
   ========================================================================= */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "label",
            "caption",
            "meta",
            "body",
            "intro",
            "display-sm",
            "display-md",
            "display-lg",
            "display-xl",
            "display-2xl",
          ],
        },
      ],
    },
  },
});

/** shadcn/ui class-name helper: merges conditional classes and dedupes Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
