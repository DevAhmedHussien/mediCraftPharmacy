import type { Metadata } from "next";
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
    <div className="flex min-h-screen items-center justify-center bg-sand px-5 py-16">
      <div className="w-full max-w-[26rem]">
        <Link href="/" className="mx-auto mb-8 block w-fit">
          <Logo className="h-9 w-auto" />
        </Link>

        <div className="card p-8">
          <h1 className="text-[1.5rem] font-black leading-tight text-ink">Sign in</h1>
          <p className="mt-2 text-meta text-ink-soft">
            Staff and partner access to the MediCraft portal.
          </p>

          <LoginForm next={searchParams.next} />
        </div>

        <p className="mt-6 text-center text-caption text-ink-muted">
          Not a partner yet?{" "}
          <Link href="/providers" className="font-medium text-brand-600 hover:underline">
            Apply for an account
          </Link>
        </p>
      </div>
    </div>
  );
}
