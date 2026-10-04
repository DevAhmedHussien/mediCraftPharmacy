#!/usr/bin/env bash
# =============================================================================
# Populate an environment's secrets in AWS Secrets Manager.
#
# Nothing is printed. Every value is generated or read in-process and piped
# straight into `put-secret-value`; the script reports only a name and "ok".
# Five secrets have leaked through a chat window on this project already, and
# the fix is not being careful — it is never having the value on screen.
#
#   ./scripts/seed-secrets.sh production
#
# Safe to re-run: `put-secret-value` adds a new version rather than failing,
# and the random values are regenerated. Do NOT re-run casually once the app
# is live — rotating AUTH_SECRET signs every partner out, and rotating
# FIELD_ENCRYPTION_KEY makes existing encrypted columns unreadable.
# =============================================================================
set -euo pipefail

ENV_NAME="${1:-}"
if [ -z "$ENV_NAME" ]; then
  echo "Usage: $0 <staging|production>" >&2
  exit 1
fi

: "${AWS_PROFILE:?Set AWS_PROFILE, e.g. export AWS_PROFILE=medicraft}"
REGION="${AWS_REGION:-us-east-1}"

put() {
  local name="$1" value="$2"
  if [ -z "$value" ]; then
    echo "  $name: SKIPPED (no value available)"
    return
  fi
  aws secretsmanager put-secret-value \
    --secret-id "medicraft/${ENV_NAME}/${name}" \
    --secret-string "$value" \
    --region "$REGION" >/dev/null
  echo "  $name: ok (${#value} chars)"
}

echo "Populating secrets for ${ENV_NAME} in ${REGION}…"

# --- Generated. 32 bytes of CSPRNG, base64. --------------------------------
# FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes — AES-256-GCM accepts
# nothing else, and lib/encryption.ts rejects anything that does not.
put AUTH_SECRET          "$(openssl rand -base64 32)"
put FIELD_ENCRYPTION_KEY "$(openssl rand -base64 32)"
put CRON_SECRET          "$(openssl rand -hex 32)"

# --- The database password -------------------------------------------------
# Postgres runs in a container beside the app. This password is the whole of
# the database's authentication, so it is generated at the same strength as
# the signing keys above and never typed by a human.
#
# `tr -d` strips the base64 punctuation: the value is interpolated into a
# connection URL, and a `/` or `+` there would have to be percent-encoded at
# every use site. Dropping them costs a few bits of entropy from 32 bytes,
# which is not the weak link in anything.
put POSTGRES_PASSWORD "$(openssl rand -base64 48 | tr -d '/+=' | head -c 40)"

# --- Carried across from the local .env ------------------------------------
RESEND=$(grep -E '^RESEND_API_KEY=' .env 2>/dev/null | sed -E 's/^RESEND_API_KEY=["'"'"']?//; s/["'"'"']?$//' || true)
put RESEND_API_KEY "$RESEND"

echo
echo "Done. Verify without revealing anything:"
echo "  aws secretsmanager get-secret-value --secret-id medicraft/${ENV_NAME}/AUTH_SECRET --query 'ARN' --output text"
