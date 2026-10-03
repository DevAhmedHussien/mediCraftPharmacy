import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { PERMISSION, type Permission } from "@/lib/partner/status";
import { peek, RATE_LIMITS, rateLimit, resetLimit } from "@/lib/rate-limit";

/* ===========================================================================
   Auth.js configuration.

   SESSION STRATEGY IS JWT, NOT DATABASE
   -------------------------------------
   Every admin page render and every API call needs the caller's role and
   permissions. With a database session that is a query per request before any
   real work starts; with a JWT it is a signature check. The cost of that
   choice is staleness: a permission revoked by a super admin stays in the
   holder's token until it refreshes. `SESSION_MAX_AGE` is therefore short, and
   `requirePermission` re-reads permissions from the database for anything
   that mutates state — the token is a fast path for rendering, never the
   authority for a write.

   WHY THE LOGIN ERROR IS ALWAYS THE SAME
   --------------------------------------
   "Unknown email" and "wrong password" are the same message and the same
   response time. Distinguishing them turns the login form into an account
   enumeration oracle, which for a pharmacy partner portal means confirming
   which practices hold accounts.
   ========================================================================= */

const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours — a working day, then re-auth.

const credentialsSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

/**
 * A dummy hash with the same cost as a real one.
 *
 * When the email does not exist there is nothing to compare against, so a
 * naive implementation returns immediately while a real account spends ~250ms
 * in bcrypt. That timing difference is readable over a handful of requests
 * and leaks which addresses are registered. Comparing against this constant
 * keeps both paths the same length.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO1eQ0Gu0Q7dFqZ3QqjxZcZ5rQ7bW1lJ2";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,

  providers: [
    Credentials({
      credentials: { email: {}, password: {} },

      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        /* Rate limit before the database and before bcrypt.
         *
         * Keyed on the ADDRESS, not the IP: an attacker spraying one password
         * across ten thousand accounts is limited per-target either way, but a
         * shared office NAT must not lock out a whole practice because one
         * person fat-fingered their password. Returning null is the same
         * answer a wrong password gets, so a blocked attempt reveals nothing
         * about whether the account exists.
         *
         * bcrypt at cost 12 is ~250ms of CPU per guess, so checking BEFORE the
         * hash is what stands between a credential-stuffing run and the event
         * loop. Only failures are counted, and a success clears the window —
         * the budget is for guesses, not for logins. */
        const limitKey = `login:${email}`;
        if (!peek(limitKey, RATE_LIMITS.login).ok) return null;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            passwordHash: true,
            permissions: { select: { permission: true } },
          },
        });

        // Always run bcrypt, even with no user — see DUMMY_HASH above.
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

        if (!user || !ok || !user.isActive) {
          rateLimit(limitKey, RATE_LIMITS.login);
          return null;
        }

        resetLimit(limitKey);

        // Not awaited: a slow write here would delay every login, and a failed
        // "last seen" update must never block someone signing in.
        void db.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => undefined);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          // Prisma returns the member name (PRODUCTS_SEND); the whole app
          // speaks the dotted wire string (products.send). Convert once, here,
          // so nothing downstream has to know the mapping exists.
          permissions: user.permissions.map(
            (p) => PERMISSION[p.permission as keyof typeof PERMISSION] as Permission
          ),
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.permissions = user.permissions;
        token.uid = user.id;
      }

      // `update()` from the client forces a refresh — used right after a super
      // admin changes someone's permissions so the change lands immediately
      // rather than at the next login.
      if (trigger === "update" && token.uid) {
        const fresh = await db.user.findUnique({
          where: { id: token.uid as string },
          select: { role: true, isActive: true, permissions: { select: { permission: true } } },
        });
        if (!fresh?.isActive) return null;
        token.role = fresh.role;
        token.permissions = fresh.permissions.map(
          (p) => PERMISSION[p.permission as keyof typeof PERMISSION] as Permission
        );
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as never;
        session.user.permissions = (token.permissions ?? []) as Permission[];
      }
      return session;
    },
  },
});
