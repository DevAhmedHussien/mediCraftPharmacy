import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "@/components/admin/LoginForm";
import { auth } from "@/lib/auth";
import { homeForRole } from "@/lib/home-route";
import { pageMetadata } from "@/lib/seo";

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
    /* Two halves on a laptop, one column on a phone.
     *
     * The picture is `hidden lg:block` rather than scaled down, because a
     * decorative half-screen above a sign-in form on a 390px phone is just
     * something to scroll past before reaching the two fields you came for.
     * It also means the image is never fetched on mobile at all.
     */
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ---- The form ---- */}
      <div className="flex items-center justify-center bg-white px-5 py-16 sm:px-10">
        <div className="w-full max-w-[26rem]">
          <Link href="/" className="mb-10 block w-fit">
            <Logo className="h-9 w-auto" />
          </Link>

          <h1 className="text-[1.75rem] font-black leading-tight tracking-tight text-ink">
            Sign in
          </h1>
          <p className="mt-2.5 text-meta text-ink-soft">
            Staff and partner access to the MediCraft portal.
          </p>

          <LoginForm next={searchParams.next} />

          <p className="mt-8 text-caption text-ink-muted">
            Not a partner yet?{" "}
            <Link href="/providers" className="font-medium text-brand-600 hover:underline">
              Apply for an account
            </Link>
          </p>
        </div>
      </div>

      {/* ---- The picture ----
          The identity's own product shot, in a card on the brand tint.

          Not full-bleed: this is a studio sweep that lifts to pure white and
          the vial fills nearly the whole frame, so `object-cover` on a tall
          half-screen box crops the cap and the glass shelf it is standing on.
          Contained in a card, the shot keeps its proportions and the white of
          the sweep reads as the card itself. */}
      <div className="relative hidden items-center justify-center bg-sand p-12 lg:flex">
        <figure className="w-full max-w-[30rem]">
          <div className="overflow-hidden rounded-tile border border-line bg-white p-6 shadow-card">
            <Image
              src="/images/brand/vial-clear-glass-shelf.webp"
              alt="A MediCraft semaglutide vial on a glass shelf"
              width={1086}
              height={1448}
              priority
              sizes="(min-width: 1024px) 30rem, 0px"
              className="h-auto w-full"
            />
          </div>
          <figcaption className="mt-6 text-meta leading-relaxed text-ink-soft">
            <span className="font-display font-black text-ink">Wellness is crafted.</span>{" "}
            Compounded to the prescription, documented at every step.
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
