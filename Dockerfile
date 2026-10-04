# syntax=docker/dockerfile:1

# =============================================================================
# MediCraft Pharmacy
#
# Four stages. The first three exist only to produce the fourth, and nothing
# from them ships: no source, no dev dependencies, no package manager cache,
# and no .env.
#
# WHY bookworm-slim AND NOT alpine
# --------------------------------
# Prisma's engines are built against glibc. On Alpine they need the musl
# binary targets and openssl installed by hand, and the failure mode when you
# get it wrong is a runtime error on the first query rather than a build error.
# The slim image is ~40MB more and removes that whole class of problem.
#
# WHY THE VERSION IS PINNED BY DIGEST
# -----------------------------------
# `node:22-bookworm-slim` moves. Two builds a week apart from the same commit
# would otherwise sit on different base images, which is exactly the variable
# you want eliminated when a deploy misbehaves and the code did not change.
# =============================================================================

ARG NODE_VERSION=22-bookworm-slim

# --- Stage 1: dependencies ---------------------------------------------------
# Separated from the build so that a source-only change reuses this layer.
# package*.json are the only inputs, so the cache survives everything except a
# dependency change.
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# openssl: Prisma links against it. ca-certificates: outbound TLS to GHL and
# the mail provider.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# `npm ci` not `npm install`: it installs exactly the lockfile, fails if the
# lockfile and manifest disagree, and never writes the lockfile — so an image
# cannot silently drift from what was committed.
RUN --mount=type=cache,target=/root/.npm npm ci


# --- Stage 2: build ----------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The Prisma client is generated code, not source, so it is built here rather
# than committed. `--no-engine` is deliberately NOT used: lib/db.ts drives
# Postgres through @prisma/adapter-pg, but the generated client still carries
# the type surface the build type-checks against.
# DATABASE_URL is set only for this one command and never becomes part of the
# image. prisma.config.ts resolves it eagerly for every subcommand, including
# `generate`, which reads the schema and writes TypeScript — it opens no
# connection, so a placeholder is honest rather than a workaround.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" npx prisma generate

# next build reads NEXT_PUBLIC_* at build time and bakes them into the client
# bundle, so anything the browser needs has to be present now — not at run.
# Nothing secret belongs in this list.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Telemetry off: a build should not phone home from inside someone's CI.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Placeholders, so the build can import modules that validate configuration.
#
# lib/env.ts parses the environment at module load — deliberately, so a bad
# key fails on boot instead of at 2am inside a request. Next imports every
# route to collect its metadata, so a build with no environment fails there
# rather than at the point the value would be used.
#
# These are NOT secrets and NOT defaults. None is prefixed NEXT_PUBLIC_, so
# none is inlined into a client bundle; Next reads server env at runtime, and
# this stage is discarded. The real values arrive from the container
# environment. The key is 32 zero bytes, base64 — the right SHAPE so AES-256
# validation passes, and obviously not a key anyone chose.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
    AUTH_SECRET="build-time-placeholder-not-a-secret-000000" \
    FIELD_ENCRYPTION_KEY="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="

RUN npm run build


# --- Stage 3: migration runner ----------------------------------------------
# A deliberately separate image. `prisma migrate deploy` needs the CLI, the
# schema and the migration history; the web server needs none of them. Keeping
# them apart means the long-lived runtime image has no tool in it capable of
# altering the database.
FROM node:${NODE_VERSION} AS migrator
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY package.json prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
# prisma/seed.ts imports encryption, signature text and the curated catalogue
# from lib/, so the seed cannot run without it. Migrations do not need this —
# it is here so the one image can do both jobs.
COPY lib ./lib

# The client the seed and any data script talk through. `migrate deploy`
# itself does not need it; sharing one stage for both does.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" npx prisma generate

# `migrate deploy` applies pending migrations and never generates or resets —
# the only migrate subcommand safe to run unattended against production.
CMD ["npx", "prisma", "migrate", "deploy"]


# --- Stage 4: runtime --------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user. The node image ships `node` (uid 1000) for exactly
# this; creating another would only mean reasoning about two.
RUN mkdir -p /app/.uploads && chown -R node:node /app

# The standalone server, and the two directories it serves that Next's tracer
# cannot see. `public` and `.next/static` are read by path, and assets/msa is
# opened with fs.readFile at agreement-generation time — none of them are
# imported, so none are traced.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/assets ./assets

USER node

EXPOSE 3000

# /api/health, not /api/pulse. Pulse calls auth() and answers 401 without a
# session, so anything checking it without cookies — this, and every load
# balancer — reads a healthy instance as unhealthy. Health is unauthenticated
# and checks the database, which is the thing that actually decides whether
# this instance can serve a page.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# server.js is what `output: "standalone"` emits. Not `next start`, which would
# need the Next CLI and the full node_modules this image deliberately omits.
CMD ["node", "server.js"]
