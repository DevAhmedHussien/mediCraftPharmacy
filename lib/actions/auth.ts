"use server";

import { signOut } from "@/lib/auth";

/* ===========================================================================
   Sign out, as a server action.

   The admin and the portal both used `<Link href="/api/auth/signout">`. That
   is a GET, and two things are wrong with it:

     IT IS NOT A DESTRUCTIVE-ACTION METHOD. Anything that follows links —
     Next's own router prefetching what is in the viewport, a crawler, a link
     scanner in an email client — can hit it. A GET should never change state.

     IT IS A DETOUR. Auth.js answers that GET with its own unstyled
     "are you sure you want to sign out?" page, so signing out was two clicks
     through a screen that looks nothing like the rest of the product.

   A server action is a POST, carries Next's action-origin protection, and
   ends the session on the first click.
   ========================================================================= */

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
