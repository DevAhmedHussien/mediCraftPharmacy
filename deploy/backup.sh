#!/usr/bin/env bash
# =============================================================================
# Nightly database dump to S3.
#
# This is the ENTIRE disaster-recovery story. Postgres runs in a container on
# one instance: no managed snapshots, no point-in-time recovery, no failover.
# If this script stops working and nobody notices, the first sign will be a
# restore that cannot happen.
#
# So it is loud. Any failure exits non-zero, logs, and — because an exit code
# nobody reads is not an alert — refrains from writing the success marker and
# pushes a 0 to CloudWatch, which the alarm watches.
#
# Cron: 03:00 UTC daily.
# =============================================================================
set -euo pipefail

source /opt/medicraft/.env.infra          # AWS_REGION, ENV_NAME
source /opt/medicraft/.env.app            # POSTGRES_PASSWORD

LOG=/var/log/medicraft-backup.log
BUCKET="medicraft-db-backups-${ENV_NAME}"
STAMP=$(date -u +%F)
LOCAL="/data/backups/${STAMP}.dump"

log() { echo "[$(date -u +%FT%TZ)] $*" | tee -a "$LOG"; }

metric() {
  # 1 on success, 0 on failure. The alarm fires on the absence of a 1 as
  # well as on a 0, so a cron that never runs is caught too.
  aws cloudwatch put-metric-data \
    --namespace MediCraft/Backups \
    --metric-name BackupSuccess \
    --dimensions Environment="$ENV_NAME" \
    --value "$1" \
    --region "$AWS_REGION" >/dev/null 2>&1 || true
}

fail() {
  log "FAILED: $*"
  metric 0
  exit 1
}

log "Starting backup for $STAMP"

# --- Dump ------------------------------------------------------------------
# Custom format (-Fc): compressed, and restorable selectively with pg_restore.
# Through the container's own pg_dump so the client version always matches
# the server.
mkdir -p /data/backups
docker compose -f /opt/medicraft/docker-compose.yml exec -T \
  -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  pg_dump -U medicraft -d medicraft -Fc --no-owner --no-acl \
  > "$LOCAL" || fail "pg_dump returned non-zero"

# A dump of an empty or broken database still exits 0 and writes a tiny file.
SIZE=$(stat -c%s "$LOCAL" 2>/dev/null || echo 0)
[ "$SIZE" -gt 4096 ] || fail "dump is only ${SIZE} bytes — refusing to upload it"
log "Dumped ${SIZE} bytes"

# --- Upload ----------------------------------------------------------------
aws s3 cp "$LOCAL" "s3://${BUCKET}/${STAMP}.dump" --region "$AWS_REGION" \
  >> "$LOG" 2>&1 || fail "upload to s3://${BUCKET}/${STAMP}.dump failed"

# Read it back. An upload that reports success but stored nothing is the
# failure this whole script exists to prevent.
REMOTE=$(aws s3api head-object --bucket "$BUCKET" --key "${STAMP}.dump" \
  --query ContentLength --output text --region "$AWS_REGION" 2>/dev/null || echo 0)
[ "$REMOTE" = "$SIZE" ] || fail "uploaded size $REMOTE does not match local $SIZE"
log "Verified s3://${BUCKET}/${STAMP}.dump"

# --- Marker ----------------------------------------------------------------
# A file whose timestamp can be eyeballed without digging through logs.
echo "$(date -u +%FT%TZ) ${STAMP}.dump ${SIZE} bytes" \
  | aws s3 cp - "s3://${BUCKET}/_status/last-success.txt" --region "$AWS_REGION" \
  >> "$LOG" 2>&1 || log "WARNING: marker write failed (the backup itself is fine)"

# --- Local housekeeping ----------------------------------------------------
# Two days of local copies, so a restore right after a bad deploy does not
# need a download. S3 keeps thirty via the bucket lifecycle.
find /data/backups -name '*.dump' -mtime +2 -delete

metric 1
log "Backup complete"
