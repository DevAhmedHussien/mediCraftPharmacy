locals {
  name = "medicraft-${var.env_name}"

  # Which branch may assume this environment's deploy role. Production is
  # reachable only from main; staging only from staging.
  deploy_branch = var.env_name == "production" ? "main" : "staging"

  tags = {
    Project     = "medicraft-pharmacy"
    Environment = var.env_name
    ManagedBy   = "terraform"
  }

  /* Everything the application needs that must not be in an image, a
     compose file, or this repository.

     NO DATABASE_URL. Postgres runs beside the app on the same host, so the
     connection string is `postgres:5432` plus the password — the entrypoint
     assembles it from POSTGRES_PASSWORD rather than storing the same secret
     twice under two names, which is how the two drift apart. */
  secret_names = [
    "POSTGRES_PASSWORD",
    "AUTH_SECRET",
    "FIELD_ENCRYPTION_KEY",
    "RESEND_API_KEY",
    "CRON_SECRET",
    # Not obviously a secret, and that is the trap. visitorHash HMACs
    # `ip|userAgent` with it, so a salt anyone can read from the repository
    # makes every stored analytics hash reversible by trying IP addresses —
    # which turns "cookieless, no IP retained" into a claim that is not true.
    "ANALYTICS_SALT",
    # GoHighLevel. Optional to the APP — `ghlConfigured` is
    # `Boolean(GHL_API_TOKEN && GHL_LOCATION_ID)` and the site runs fine
    # without a CRM — but NOT optional here: this list is what the instance
    # role is allowed to read, and a secret missing from it is a secret the
    # box gets AccessDenied on. `fetch-secrets.sh` then logs "not set" and
    # the sync silently stays off, which is exactly how it went unnoticed
    # that no contact had ever reached GoHighLevel.
    "GHL_API_TOKEN",
    "GHL_LOCATION_ID",
  ]
}
