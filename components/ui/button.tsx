import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ===========================================================================
   Button — the shadcn/ui component shape over MediCraft's own button system.

   The variants are NOT restyled here. Each one resolves to the `.btn-*` class
   already defined in globals.css, so the brand system stays the single source
   of truth for what a button looks like and this file is only the typed
   contract over it. Change a colour in globals.css and every button follows;
   change it here and the two drift apart.

   What this adds over writing `className="btn-primary btn-lg"` by hand:

     · the variant names are checked at compile time, so `variant="primry"` or
       a class that no longer exists is a build error rather than an unstyled
       button discovered in review
     · `asChild` lets a Next <Link> carry the button's styling without the
       invalid <a> inside <button> nesting that wrapping would produce — most
       of this site's buttons are links to /providers or /contact
     · `cn()` merges caller classes correctly instead of letting a caller's
       `px-8` lose to the variant's `px-7` on source order

   `btn-outline` is for light grounds and `btn-outline-invert` for navy ones;
   they are separate variants rather than one variant plus a prop because a
   caller picking the wrong ground should be a visible, greppable mistake.
   ========================================================================= */

const buttonVariants = cva("btn", {
  variants: {
    variant: {
      primary: "btn-primary",
      /* Cyan on navy — navy type, never white. See globals.css:159. */
      accent: "btn-accent",
      outline: "btn-outline",
      outlineInvert: "btn-outline-invert",
      /* Not a `.btn`: the inline arrow link used throughout the prose. */
      link: "link-arrow",
      linkInvert: "link-arrow-invert",
    },
    size: {
      sm: "btn-sm",
      md: "",
      lg: "btn-lg",
    },
    block: {
      true: "w-full",
    },
  },
  /* The link variants carry their own padding-free geometry, so `btn` and the
     size classes must not apply to them. */
  compoundVariants: [
    { variant: "link", class: "!p-0" },
    { variant: "linkInvert", class: "!p-0" },
  ],
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render the caller's child element instead of a <button>, passing the
   * styling down to it. Use for links:
   *
   *   <Button asChild><Link href="/providers">Open an account</Link></Button>
   */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        /* A <button> inside a <form> defaults to type="submit", which has
           surprised every codebase that has ever shipped a form. Default to
           "button" and make submitting explicit — but only when we actually
           render a <button>, since `asChild` targets may not take the attr. */
        {...(asChild ? {} : { type: type ?? "button" })}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
