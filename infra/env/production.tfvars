env_name = "production"
app_url  = "https://www.medicraftpharmacy.com"
domain   = "www.medicraftpharmacy.com"

# Your address, for port 22. Changes when your ISP reassigns it:
#   curl -s https://checkip.amazonaws.com
ssh_cidr = "196.151.30.23/32"

# The PUBLIC half of the deploy key. The private half goes in the GitHub
# secret EC2_SSH_KEY and nowhere else.
#   ssh-keygen -t ed25519 -C medicraft-deploy -f ~/.ssh/medicraft-deploy
ssh_public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIM4iZxBgEVPEEoy1msmMLv+Ec1YA1trBsvUkEssvJSGk medicraft-deploy"

# Where the backup alarm goes. Confirm the AWS subscription email.
alert_email = "admin@medicraftpharmacy.com"

# ---------------------------------------------------------------------------
# THE SERVER EXISTS. This must stay true.
#
# `enable_app_server` is the two-phase bootstrap flag from variables.tf:
# false for the first apply (buckets, secrets, roles), true for the second
# (the instance itself). The second apply was made with `-var` on the command
# line and the value was never written here — so the file said false while
# production said true, and `terraform apply -var-file=production.tfvars`
# planned to DESTROY the running instance, its volume attachment and the
# elastic IP. Three resources, including the box serving the site.
#
# Found by reading a plan that was only supposed to change one SSH address.
# ---------------------------------------------------------------------------
enable_app_server = true
