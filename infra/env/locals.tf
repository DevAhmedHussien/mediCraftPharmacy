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
  ]
}
