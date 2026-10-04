env_name = "production"
app_url  = "https://www.medicraftpharmacy.com"
domain   = "www.medicraftpharmacy.com"

# Your address, for port 22. Changes when your ISP reassigns it:
#   curl -s https://checkip.amazonaws.com
ssh_cidr = "156.218.178.205/32"

# The PUBLIC half of the deploy key. The private half goes in the GitHub
# secret EC2_SSH_KEY and nowhere else.
#   ssh-keygen -t ed25519 -C medicraft-deploy -f ~/.ssh/medicraft-deploy
ssh_public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIM4iZxBgEVPEEoy1msmMLv+Ec1YA1trBsvUkEssvJSGk medicraft-deploy"

# Where the backup alarm goes. Confirm the AWS subscription email.
alert_email = "admin@medicraftpharmacy.com"
