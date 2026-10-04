#!/usr/bin/env bash
# =============================================================================
# Restore a dump from S3.
#
#   ./scripts/restore-db.sh 2026-10-04              # on the server
#   ./scripts/restore-db.sh 2026-10-04 --verify     # restore to a scratch
#                                                   # container and discard
#
# RUN THE --verify FORM BEFORE GO-LIVE, AND AGAIN EVERY FEW MONTHS.
# A backup that has never been restored is a file, not a backup. The failure
# modes it catches are real and quiet: a dump taken with a mismatched client
# version, an extension the restore target lacks, a pg_dump that exited 0
# while writing a truncated file.
#
# The default form is DESTRUCTIVE — it drops and recreates the live
# database. It asks first.
# =============================================================================
set -euo pipefail

STAMP="${1:-}"
MODE="${2:-}"
COMPOSE=/opt/medicraft/docker-compose.yml

if [ -z "$STAMP" ]; then
  echo "Usage: $0 <YYYY-MM-DD> [--verify]" >&2
  echo >&2
  echo "Available backups:" >&2
  source /opt/medicraft/.env.infra 2>/dev/null || true
  aws s3 ls "s3://medicraft-db-backups-${ENV_NAME:-production}/" 2>/dev/null | tail -10 >&2
  exit 1
fi

source /opt/medicraft/.env.infra
source /opt/medicraft/.env.app

BUCKET="medicraft-db-backups-${ENV_NAME}"
LOCAL="/tmp/restore-${STAMP}.dump"

echo "Downloading s3://${BUCKET}/${STAMP}.dump"
aws s3 cp "s3://${BUCKET}/${STAMP}.dump" "$LOCAL" --region "$AWS_REGION"
echo "Got $(stat -c%s "$LOCAL") bytes"

if [ "$MODE" = "--verify" ]; then
  # ---------------------------------------------------------------------
  # Restore into a throwaway container on its own network. Touches nothing
  # that is running, so it is safe to do on a live server in the middle of
  # the afternoon — which is the point: a rehearsal nobody dares run is not
  # a rehearsal.
  # ---------------------------------------------------------------------
  echo "Verifying into a scratch container (the live database is untouched)…"
  NAME="pg-verify-$$"
  docker run -d --name "$NAME" \
    -e POSTGRES_PASSWORD=verify -e POSTGRES_USER=medicraft -e POSTGRES_DB=medicraft \
    postgres:16-alpine >/dev/null

  for _ in $(seq 1 30); do
    docker exec "$NAME" pg_isready -U medicraft -d medicraft >/dev/null 2>&1 && break
    sleep 2
  done

  docker cp "$LOCAL" "$NAME:/tmp/d.dump"
  if docker exec "$NAME" pg_restore -U medicraft -d medicraft --no-owner --no-acl /tmp/d.dump; then
    echo
    echo "Row counts in the restored copy:"
    docker exec "$NAME" psql -U medicraft -d medicraft -t -c "
      SELECT relname || ': ' || n_live_tup
      FROM pg_stat_user_tables
      WHERE n_live_tup > 0
      ORDER BY n_live_tup DESC LIMIT 15;"
    echo
    echo "VERIFIED — this dump restores."
    RESULT=0
  else
    echo "RESTORE FAILED. This dump is not usable; check the others." >&2
    RESULT=1
  fi

  docker rm -f "$NAME" >/dev/null
  rm -f "$LOCAL"
  exit $RESULT
fi

# --- The destructive path --------------------------------------------------
cat <<WARN

  This REPLACES the live database with the backup from ${STAMP}.
  Everything written since then is lost.

WARN
read -r -p "Type the date again to confirm: " CONFIRM
[ "$CONFIRM" = "$STAMP" ] || { echo "Aborted."; exit 1; }

echo "Stopping the application (the database stays up)…"
docker compose -f "$COMPOSE" stop app

echo "Recreating the schema…"
docker compose -f "$COMPOSE" exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -U medicraft -d postgres -c "DROP DATABASE IF EXISTS medicraft;"
docker compose -f "$COMPOSE" exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -U medicraft -d postgres -c "CREATE DATABASE medicraft OWNER medicraft;"

echo "Restoring…"
docker compose -f "$COMPOSE" exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  pg_restore -U medicraft -d medicraft --no-owner --no-acl < "$LOCAL"

echo "Starting the application…"
docker compose -f "$COMPOSE" up -d app

for i in $(seq 1 20); do
  curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1 && { echo "Healthy. Restore complete."; rm -f "$LOCAL"; exit 0; }
  sleep 5
done
echo "Restored, but /api/health is not answering. Check: docker compose -f $COMPOSE logs app" >&2
exit 1
