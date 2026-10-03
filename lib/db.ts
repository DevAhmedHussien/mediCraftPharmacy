import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env, isProduction } from "@/lib/env";

/* ===========================================================================
   The Prisma client, as a singleton.

   Next.js hot-reloads modules in development without tearing down the Node
   process, so a plain `new PrismaClient()` at module scope opens a fresh
   connection pool on every file save and exhausts Postgres inside a morning's
   work. Stashing it on `globalThis` is the standard fix and the reason this
   file exists at all.

   Prisma 7 takes its connection through a driver adapter rather than from the
   schema, so the pool is configured here where it can be reasoned about:
   `max` is deliberately small because serverless functions each hold their own
   pool, and twenty functions times ten connections is over a stock Postgres
   `max_connections` of 100.
   ========================================================================= */

const createClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
      max: isProduction ? 5 : 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    }),
    // Queries are noisy; warnings and errors are not. In development the query
    // log is opt-in via PRISMA_LOG_QUERIES so an N+1 can be found on demand
    // without drowning every other log line the rest of the time.
    log: process.env.PRISMA_LOG_QUERIES === "true" ? ["query", "warn", "error"] : ["warn", "error"],
  });

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

if (!isProduction) globalForPrisma.prisma = db;
