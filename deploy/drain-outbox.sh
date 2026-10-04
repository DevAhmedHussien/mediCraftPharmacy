#!/usr/bin/env bash
# =============================================================================
# Drain the email outbox.
#
# WHY THIS EXISTS
# ---------------
# Two paths send mail. Server actions that must be immediate — a sign-in
# code, a pricing notification — call sendEmail directly. Everything driven
# by a status change is enqueued to EmailOutbox by applyTransition, so a
# provider outage cannot roll back the transition that caused it.
#
# The queue needs a worker. On App Runner that was a scheduled POST to
# /api/cron/email; moving to EC2 dropped it, and eight messages — application
# received, identity received, formulary sent, meeting requested — sat
# PENDING forever while the admin screens showed the pipeline advancing
# normally. A queue nobody drains is worse than no queue: it looks like it
# worked.
#
# Every five minutes, through Caddy over the public hostname, so the path
# exercised is the real one.
# =============================================================================
set -euo pipefail

source /opt/medicraft/.env.infra
source /opt/medicraft/.env.app   # CRON_SECRET

URL="${APP_URL:-https://www.medicraftpharmacy.com}/api/cron/email"
LOG=/var/log/medicraft-outbox.log

RESPONSE=$(curl -sS -m 60 -X POST "$URL" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -w '\n%{http_code}' 2>&1) || {
    echo "[$(date -u +%FT%TZ)] curl failed: $RESPONSE" >> "$LOG"
    exit 1
  }

CODE=$(printf '%s' "$RESPONSE" | tail -1)
BODY=$(printf '%s' "$RESPONSE" | sed '$d')

if [ "$CODE" != "200" ]; then
  echo "[$(date -u +%FT%TZ)] HTTP $CODE — $BODY" >> "$LOG"
  exit 1
fi

# Only log when something moved. A line every five minutes saying "0 sent"
# fills the disk and buries the runs that mattered.
case "$BODY" in
  *'"sent":0'*'"failed":0'*'"dead":0'*) : ;;
  *) echo "[$(date -u +%FT%TZ)] $BODY" >> "$LOG" ;;
esac
