import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma CLI configuration.
 *
 * Prisma 7 no longer accepts `url` inside `datasource` in the schema, so the
 * connection string lives here for migrate/introspect and is supplied to the
 * runtime client separately through a driver adapter (see lib/db.ts). The
 * practical benefit: prisma/schema.prisma holds no environment coupling at
 * all, so the same schema file is used unchanged in CI, locally and in
 * production.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
