variable "env_name" {
  description = "staging or production. Names every resource and scopes the OIDC trust to one branch."
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.env_name)
    error_message = "env_name must be staging or production."
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "github_repo" {
  description = "owner/name. The OIDC trust policy is scoped to this repository and nothing else."
  type        = string
  default     = "DevAhmedHussien/mediCraftPharmacy"
}

variable "app_url" {
  description = "Public origin, e.g. https://www.medicraftpharmacy.com. Used for CORS and APP_URL."
  type        = string
}

variable "domain" {
  description = "Hostname Caddy obtains a certificate for. The apex redirects to it."
  type        = string
}

/* --- The application server ---------------------------------------------- */

variable "instance_type" {
  description = "Graviton. t4g.small is 2 vCPU / 2 GB for about $12/month."
  type        = string
  default     = "t4g.small"
}

variable "root_volume_gb" {
  description = "Root disk. Holds the OS, Docker images and nothing that matters."
  type        = number
  default     = 30
}

variable "data_volume_gb" {
  description = <<-EOT
    A separate volume for Postgres, mounted at /data.

    Separate on purpose. The root volume is disposable — replacing the
    instance replaces it — and a database living on a disposable disk is a
    database one `terraform taint` away from being gone. This one detaches
    and reattaches instead.
  EOT
  type        = number
  default     = 20
}

variable "ssh_cidr" {
  description = <<-EOT
    Who may reach port 22, as a CIDR. Your own address, not 0.0.0.0/0.

    A home connection's address changes; when SSH stops working this is the
    first thing to re-check. `curl -s https://checkip.amazonaws.com` gives
    the current one.
  EOT
  type        = string
}

variable "ssh_public_key" {
  description = <<-EOT
    OpenSSH public key for the deploy user. The PRIVATE half goes in a GitHub
    secret named EC2_SSH_KEY and nowhere else — never in this file, never in
    tfvars, never in a chat window.

    Generate with:
      ssh-keygen -t ed25519 -C medicraft-deploy -f ~/.ssh/medicraft-deploy
  EOT
  type        = string
}

variable "enable_app_server" {
  description = <<-EOT
    Create the EC2 instance. FALSE on the first apply.

    The instance pulls its image from ECR at boot and fetches secrets from
    Secrets Manager. Created before either exists, it comes up with nothing
    to run — not fatal, but it means debugging a half-working box instead of
    starting a working one.

      1. apply with false        — buckets, secrets, roles, security group
      2. populate secrets, push an ARM64 image
      3. apply with true         — the server, which boots into a running app

    After the first successful deploy, leave it true.
  EOT
  type        = bool
  default     = false
}

variable "alert_email" {
  description = <<-EOT
    Where the backup alarm goes. Empty disables the subscription.

    AWS sends a confirmation link that must be clicked before anything is
    delivered — an alarm wired to an unconfirmed address is an alarm that
    fires into nothing.
  EOT
  type        = string
  default     = ""
}
