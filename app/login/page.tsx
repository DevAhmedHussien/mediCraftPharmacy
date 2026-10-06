import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "@/components/admin/LoginForm";
import { auth } from "@/lib/auth";
import { homeForRole } from "@/lib/home-route";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Sign in",
    description: "Sign in to the MediCraft Pharmacy portal.",
    path: "/login",
  }),
  // A login page has no business in an index, and a crawled one invites
  // credential-stuffing traffic.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  /* Already signed in? Then this page has nothing to offer.
   *
   * It used to render the form regardless, so clicking "Provider Portal Login"
   * from the header while signed in put a partner back on a sign-in screen
   * they had already passed — and typing the same credentials again was the
   * only way out of it. */
  const session = await auth();
  if (session?.user) {
    const requested = searchParams.next;
    const sameOrigin = requested && /^\/(?!\/)/.test(requested);
    const home = homeForRole(session.user.role);

    // A `next` belonging to the other role is dropped rather than followed, so
    // nobody is bounced through a guard to get where they were going.
    const allowed =
      sameOrigin &&
      (session.user.role === "PARTNER"
        ? !requested.startsWith("/admin")
        : !requested.startsWith("/portal"));

    redirect(allowed ? requested : home);
  }

  return (
    /* Two halves that collapse at 520px per column, not at a named
       breakpoint — `auto-fit` + `minmax(min(100%,520px),1fr)`, from the
       reference. The picture simply stops fitting and the form takes the
       row, which is the right behaviour on a 900px tablet where `lg:` would
       still be showing two cramped columns.
     *
     * The aside is `aria-hidden`: it is a photograph and a caption that
     * repeats the home page's headline. A screen reader reaching the sign-in
     * page should land on the form.
     */
    <div
      className="grid min-h-screen bg-paper"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 520px), 1fr))" }}
    >
      {/* ---- The form ---- */}
      <main id="main" className="flex items-center justify-center px-5 py-16">
        <div className="flex w-full max-w-[400px] flex-col">
          <Link href="/" aria-label={`${site.name} home`} className="mb-12 flex self-start">
            <Logo className="h-8 w-auto" />
          </Link>

          <h1 className="font-display text-[40px] font-normal leading-[1.08] tracking-title text-navy">
            Sign in
          </h1>
          <p className="mt-2.5 text-[15.5px] leading-[1.6] text-ink-soft">
            Staff and partner access to the MediCraft portal.
          </p>

          <LoginForm next={searchParams.next} />

          <p className="mt-9 border-t border-hair pt-5 text-[14px] text-ink-muted">
            Not a partner yet?{" "}
            <Link href="/providers" className="font-medium text-brand-500 hover:text-navy">
              Apply for an account
            </Link>
          </p>
        </div>
      </main>

      {/* ---- The picture ----
          Full-bleed inside a 32px-radius box with 16px of page padding, and a
          glass caption sitting on it — not a contained card with the caption
          underneath. `object-cover` is right here because the box is tall and
          the crop is intended. */}
      <aside aria-hidden className="hidden p-4 lg:flex">
        <div className="relative min-h-[560px] flex-1 overflow-hidden rounded-hero bg-stone">
          <Image
            src="/images/brand/vial-clear-glass-shelf.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 0px"
            className="object-cover"
          />
          <div className="absolute inset-x-5 bottom-5 max-w-[420px] rounded-[20px] border border-white/90 bg-white/60 px-5 py-[18px] shadow-float backdrop-blur-xl backdrop-saturate-150">
            <p className="text-[17px] font-medium tracking-[-0.01em] text-navy">
              Wellness is crafted.
            </p>
            <p className="mt-1 text-[14.5px] leading-[1.5] text-ink-soft">
              Compounded to the prescription, documented at every step.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
