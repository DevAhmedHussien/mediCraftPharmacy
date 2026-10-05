#!/usr/bin/env bash
# =============================================================================
# Apply pending migrations by hand, the same way CI does.
#
# WHY THIS EXISTS
# ---------------
# The deploy workflow builds a second image from the `migrator` stage and runs
# it with `docker run` before the new app image serves anything. There is no
# `migrator` service in docker-compose.yml, so the obvious guess —
# `docker compose run --rm migrator` — fails with "no such service", and the
# app then starts against a schema that is missing its new columns. That has
# already happened once during a hotfix.
#
# Run this on the box when deploying outside CI:
#     sudo /opt/medicraft/migrate.sh <registry>/medicraft:<tag>-migrate
# =============================================================================
set -euo pipefail

MIGRATE_IMAGE="${1:-}"
if [ -z "$MIGRATE_IMAGE" ]; then
  echo "usage: $0 <migrate-image>" >&2
  echo "  e.g. $0 226635093339.dkr.ecr.us-east-1.amazonaws.com/medicraft:production-abc123-migrate" >&2
  exit 2
fi

cd /opt/medicraft
source .env.infra
set -a; source .env.app; set +a

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY" >/dev/null

docker compose up -d postgres
for _ in $(seq 1 30); do
  docker compose exec -T postgres pg_isready -U medicraft -d medicraft >/dev/null 2>&1 && break
  sleep 2
done

docker pull "$MIGRATE_IMAGE"

# The compose project is the directory name, so the network is
# `medicraft_default`. Read from docker rather than assumed — a renamed
# directory would otherwise fail with "network not found" instead of
# something that says what is wrong.
NET=$(docker network ls --format '{{.Name}}' | grep -E '^medicraft.*_default$' | head -1)
[ -n "$NET" ] || { echo "Cannot find the compose network" >&2; exit 1; }

docker run --rm --network "$NET" \
  -e DATABASE_URL="postgresql://medicraft:${POSTGRES_PASSWORD}@postgres:5432/medicraft?sslmode=disable" \
  "$MIGRATE_IMAGE"

echo "Migrations applied. Now: docker compose up -d app"
