#!/bin/bash
# =============================================================================
# First boot. Runs once, as root, before anything is deployed.
#
# Deliberately does NOT start the application. It prepares a host that a
# deploy can land on: Docker, the data volume, and the directory layout. The
# application arrives from CI, which is the only thing that should decide
# which image is running.
# =============================================================================
set -euxo pipefail
exec > >(tee /var/log/medicraft-bootstrap.log) 2>&1

REGION="${region}"
ENV_NAME="${env_name}"
ECR_REGISTRY="${ecr_registry}"

dnf update -y
dnf install -y docker cronie awscli-2 jq postgresql16

systemctl enable --now docker crond
usermod -aG docker ec2-user

# Compose v2 as a CLI plugin. AL2023 does not package it, and the standalone
# `docker-compose` binary is the abandoned v1.
install -d /usr/local/lib/docker/cli-plugins
ARCH=$(uname -m)
curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$${ARCH}" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# --- The data volume -------------------------------------------------------
# Attached as /dev/sdf, which the kernel presents as /dev/nvme1n1 on Nitro.
# Formatted ONLY if it has no filesystem — this script also runs on a
# replacement instance, and reformatting a reattached volume would destroy
# the database it exists to protect.
DEVICE=""
for candidate in /dev/nvme1n1 /dev/sdf /dev/xvdf; do
  [ -b "$candidate" ] && { DEVICE="$candidate"; break; }
done

if [ -n "$DEVICE" ]; then
  if ! blkid "$DEVICE" >/dev/null 2>&1; then
    echo "No filesystem on $DEVICE — formatting (first boot)."
    mkfs -t xfs "$DEVICE"
  else
    echo "$DEVICE already has a filesystem — reattached, leaving it alone."
  fi

  mkdir -p /data
  UUID=$(blkid -s UUID -o value "$DEVICE")
  grep -q "$UUID" /etc/fstab || echo "UUID=$UUID /data xfs defaults,nofail 0 2" >> /etc/fstab
  mount -a
  mkdir -p /data/postgres /data/backups
  # The postgres image runs as uid 999.
  chown -R 999:999 /data/postgres
fi

# --- Layout ----------------------------------------------------------------
mkdir -p /opt/medicraft /opt/medicraft/caddy
chown -R ec2-user:ec2-user /opt/medicraft

cat > /opt/medicraft/.env.infra <<ENVEOF
AWS_REGION=$REGION
ENV_NAME=$ENV_NAME
ECR_REGISTRY=$ECR_REGISTRY
ENVEOF
chown ec2-user:ec2-user /opt/medicraft/.env.infra

# --- Housekeeping ----------------------------------------------------------
# Weekly image prune. A box that deploys often fills 30 GB with old layers,
# and the failure mode is a deploy that cannot pull.
cat > /etc/cron.weekly/docker-prune <<'CRONEOF'
#!/bin/sh
/usr/bin/docker system prune -af --filter "until=168h" >> /var/log/docker-prune.log 2>&1
CRONEOF
chmod +x /etc/cron.weekly/docker-prune

# Log in to ECR now and hourly after. The token lasts 12 hours; refreshing
# hourly means a deploy never waits on an expired login.
cat > /etc/cron.hourly/ecr-login <<CRONEOF
#!/bin/sh
/usr/bin/aws ecr get-login-password --region $REGION \
  | /usr/bin/docker login --username AWS --password-stdin $ECR_REGISTRY >/dev/null 2>&1
CRONEOF
chmod +x /etc/cron.hourly/ecr-login
/etc/cron.hourly/ecr-login || true

echo "Bootstrap complete. Waiting for a deploy."
