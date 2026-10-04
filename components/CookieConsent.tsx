"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ===========================================================================
   Cookie consent.

   WHY THE FIRST PAINT HAS NO BANNER
   ---------------------------------
   The choice lives in localStorage, which the server cannot read. Rendering
   the banner on the server and hiding it on the client would show it for a
   frame to people who dismissed it months ago — so it mounts hidden and
   appears only once the client has checked. That is also why the markup is
   not in the server tree at all: a consent banner in the initial HTML is
   something crawlers index and screen readers announce before the page.

   WHAT IT DOES NOT DO
   -------------------
   It does not gate anything. This site sets no advertising or analytics
   cookies today — page views are counted first-party and cookieless, which
   the admin dashboard says out loud. So "Reject" and "Accept" currently
   record the same amount of tracking: none. The banner exists because the
   privacy policy promises one and because that will stop being true the day
   someone adds a pixel.

   If an analytics or ad script is ever added, it must read
   `cookieConsent === "accepted"` before loading — not simply assume the
   banner's presence means consent was given.
   ========================================================================= */

const STORAGE_KEY = "cookieConsent";

type Choice = "accepted" | "rejected";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Private browsing, or storage disabled entirely. Showing a banner we
      // cannot remember dismissing would mean showing it on every page, so
      // this stays quiet instead.
    }
  }, []);

  const choose = (choice: Choice) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Nothing to do — the banner still closes for this session.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      /* `region` rather than `dialog`: it does not trap focus and must not.
         A modal over the whole site before anyone has read a word is hostile,
         and a pharmacy's safety information should never be behind one. */
      role="region"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-line bg-white p-5 shadow-[0_-4px_24px_0_rgb(16_31_77_/_0.08)] sm:p-6"
    >
      <div className="container-x flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="min-w-0">
          <p className="font-display text-[1.0625rem] font-bold text-ink">
            We value your privacy
          </p>
          <p className="mt-1.5 max-w-3xl text-meta leading-relaxed text-ink-soft text-pretty">
            We use cookies to enhance your browsing experience, serve personalised
            ads or content, and analyse our traffic. By clicking &ldquo;Accept
            All&rdquo;, you consent to our use of cookies. Read our{" "}
            <Link href="/privacy" className="font-medium text-brand-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          {/* Reject is a real button of equal weight, not a greyed link.
              A choice that is visibly harder to make is not a choice. */}
          <button type="button" onClick={() => choose("rejected")} className="btn-outline btn-sm">
            Reject
          </button>
          <button type="button" onClick={() => choose("accepted")} className="btn-primary btn-sm">
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
