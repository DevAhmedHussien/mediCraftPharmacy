import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

import type { Permission } from "@/lib/partner/status";

/* Auth.js ships a deliberately minimal session type. Widening it here is what
   makes `session.user.permissions` type-checked at every call site instead of
   an `any` that silently returns undefined when a callback is edited. */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      permissions: Permission[];
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    permissions: Permission[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    permissions?: Permission[];
  }
}

export {};
