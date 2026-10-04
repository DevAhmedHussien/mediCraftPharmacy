"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/* ===========================================================================
   The modal shell.

   Every dialog in the admin and the portal is this component with different
   children, so the behaviour below is written once and is correct everywhere
   rather than approximated per screen.

   WHAT A DIALOG HAS TO DO, AND WHY EACH PIECE IS HERE
   ---------------------------------------------------
   A dialog that merely paints a panel over the page is a trap for anyone not
   using a mouse. Four things are load-bearing:

     FOCUS MOVES IN.     On open, focus goes to the panel. Otherwise the
                         keyboard is still in the page behind, and the first
                         Tab walks the document underneath while the overlay
                         covers it.

     FOCUS STAYS IN.     Tab and Shift+Tab cycle inside. Without this the user
                         tabs out into content that is visually obscured and
                         `inert` to the eye but not to the browser.

     FOCUS COMES BACK.   On close, focus returns to whatever opened the dialog.
                         A reviewer who opens a document from row 40 of a table
                         and closes it should not be returned to the top of the
                         page.

     THE PAGE DOES NOT SCROLL.  The body is locked while open, so a scroll
                         gesture over the overlay does not move the page behind
                         it. The scrollbar's width is compensated, because
                         removing it shifts the whole layout sideways by ~15px
                         and the dialog appears to jump as it opens.

   `aria-modal` is a promise to assistive technology that the rest of the page
   is unavailable. The focus trap is what makes that promise true; the
   attribute alone does not.

   WHY THE TRAP IS TWO MECHANISMS, NOT ONE
   ---------------------------------------
   A `keydown` handler on `document` is the usual way to trap Tab, and it is
   necessary but not sufficient. When a dialog contains an <iframe> — which
   every document preview here does — focus can move *into* that frame's own
   document. Key events then fire in the frame and never reach this document,
   so the keydown trap goes silent and the next Tab walks straight out of the
   dialog and into the page behind it. That is exactly how the PDF viewer
   leaked focus on the third Tab.

   So there is also a pair of focus guards: empty tabbable spans bracketing the
   panel. `focus` does cross the frame boundary back to the parent, so when Tab
   leaves the frame the guard receives focus and sends it to the other end of
   the dialog. The guards are siblings of the panel rather than children, so
   the focusable query below never returns them as real stops.

   AND WHY EMBEDDED VIEWERS ARE NOT TAB STOPS
   ------------------------------------------
   The same boundary breaks Escape, and no guard can repair that one: if focus
   is inside the browser's PDF viewer, Escape is delivered to the viewer and
   this document never hears it, so the dialog appears frozen to anyone who
   tabbed into the document and then tried to leave.

   The fix is to keep the keyboard out of the frame entirely. Callers embedding
   a viewer pass `tabIndex={-1}` on the iframe, so Tab cycles only the dialog's
   own controls and Escape is always heard. The frame is still click-focusable,
   so a mouse user can scroll the document; if they click into it, Escape stops
   working but the Close button and the backdrop both still do, and neither is
   hidden from them.

   WHY NOT <dialog>
   ----------------
   The native element gives focus trapping and the top layer for free, and in
   a greenfield build it would be the right call. It is not used here because
   `showModal()` must be driven from an effect — the element cannot be rendered
   open — which means a frame where the panel is in the DOM but not yet modal,
   and because styling `::backdrop` does not compose with the Tailwind tokens
   the rest of this UI is built from.
   ========================================================================= */

/** Elements that can hold focus — the ones the trap cycles between. */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  // An iframe is only a tab stop if it opts in; see the note on Escape below.
  'iframe:not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Tabbable elements inside the panel, in document order. */
function focusableWithin(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // `offsetParent` is null for anything display:none; an <iframe> can be a
    // legitimate stop while reporting no offset parent, so it is kept.
    (el) => el.offsetParent !== null || el.tagName === "IFRAME"
  );
}

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Shown as the dialog's accessible name and its heading. */
  title: ReactNode;
  /** Secondary line under the title — a filename, a status, a count. */
  subtitle?: ReactNode;
  /** Actions in the header, left of the close button. */
  actions?: ReactNode;
  /** Pinned below the body; use for the primary action of a form dialog. */
  footer?: ReactNode;
  /** Defaults to a reading width. `wide` suits documents and tables. */
  size?: "default" | "wide";
  /** Body padding is on by default; `false` for edge-to-edge content. */
  padded?: boolean;
  children: ReactNode;
  className?: string;
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  actions,
  footer,
  size = "default",
  padded = true,
  children,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  /* The element that had focus when the dialog opened. Captured in a ref
     rather than state so that restoring it never schedules a render. */
  const openerRef = useRef<HTMLElement | null>(null);

  // Keep the latest onClose without re-running the key/focus effect each time
  // a parent re-renders with a fresh inline closure.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement as HTMLElement | null;

    /* Lock the page. The padding replaces the scrollbar that overflow:hidden
       removes, so the layout behind does not jump sideways as it opens. */
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    // Focus the panel itself rather than its first control: the dialog's
    // heading should be what a screen reader announces, not its Download
    // button.
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = focusableWithin(panel);

      // Nothing to cycle between — hold focus on the panel rather than
      // letting Tab escape into the page behind.
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      // `isConnected` guards the case where the opener was itself unmounted by
      // whatever the dialog did — focusing a detached node throws focus to
      // <body> and loses the user's place entirely.
      if (openerRef.current?.isConnected) openerRef.current.focus();
    };
  }, [open]);

  const onOverlayMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // mousedown, not click: a click handler fires when a drag that started
      // inside the panel (selecting text in a document) ends on the overlay,
      // which closes the dialog out from under the user.
      if (event.target === event.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/50 p-4 backdrop-blur-[2px]"
      onMouseDown={onOverlayMouseDown}
    >
      {/* Leading guard: Shift+Tab off the first control lands here. */}
      <span
        tabIndex={0}
        aria-hidden
        onFocus={() => {
          const panel = panelRef.current;
          if (!panel) return;
          const items = focusableWithin(panel);
          (items[items.length - 1] ?? panel).focus();
        }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-tile border border-line bg-white shadow-lift outline-none",
          size === "wide" ? "max-w-5xl" : "max-w-xl",
          className
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <p id="modal-title" className="truncate text-meta font-bold text-ink">
              {title}
            </p>
            {subtitle ? (
              <p className="truncate text-caption text-ink-muted">{subtitle}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-sand hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X className="size-4" strokeWidth={2.2} aria-hidden />
            </button>
          </div>
        </header>

        <div className={cn("min-h-0 flex-1 overflow-auto", padded && "p-5")}>
          {children}
        </div>

        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-sand px-5 py-3.5">
            {footer}
          </footer>
        ) : null}
      </div>

      {/* Trailing guard: Tab off the last control — including out of an
          embedded PDF viewer — lands here and wraps to the top. */}
      <span
        tabIndex={0}
        aria-hidden
        onFocus={() => {
          const panel = panelRef.current;
          if (!panel) return;
          (focusableWithin(panel)[0] ?? panel).focus();
        }}
      />
    </div>
  );
}
