locals {
  name = "medicraft-${var.env_name}"

  # Which branch may assume this environment's role. Production is reachable
  # only from main; staging only from staging. A run on any other branch
  # cannot mint a token AWS will accept, so a feature branch cannot deploy
  # even if its workflow asks to.
  deploy_branch = var.env_name == "production" ? "main" : "staging"

  # A distinct range per environment. Separate VPCs may legally reuse a CIDR
  # — until somebody peers them, or attaches both to a transit gateway, at
  # which point overlapping ranges cannot be routed and the fix is rebuilding
  # a VPC. Costs nothing to get right now.
  vpc_cidr = var.env_name == "production" ? "10.20.0.0/16" : "10.30.0.0/16"

  tags = {
    Project     = "medicraft-pharmacy"
    Environment = var.env_name
    ManagedBy   = "terraform"
  }

  # Every value the app's env schema requires at boot. Created empty here and
  # populated out of band — see infra/README.md.
  secret_names = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "FIELD_ENCRYPTION_KEY",
    "RESEND_API_KEY",
    "CRON_SECRET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "SITE_PHONE",
  ]
}
