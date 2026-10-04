/* ===========================================================================
   The server. One of them.

   Postgres, the application and Caddy, in containers on a single Graviton
   instance. This is the cheapest shape that is still defensible, and the
   places it gives ground are worth naming:

     · ONE INSTANCE, ONE AZ. A failure or a reboot is downtime measured in
       minutes. For a portal used by a few dozen prescribers during business
       hours that is tolerable; for a consumer checkout it would not be.
     · POSTGRES IN A CONTAINER. No managed backups, no point-in-time
       recovery, no failover. Which is exactly why the nightly dump to S3 in
       backup.sh is not optional and why restore-db.sh exists to be
       rehearsed — an untested backup is a hope, not a backup.

   What is NOT given up: the database is not reachable from the internet (no
   published port, container network only), secrets stay in Secrets Manager,
   and the data volume survives the instance being replaced.
   ========================================================================= */

resource "aws_key_pair" "deploy" {
  key_name   = "${local.name}-deploy"
  public_key = var.ssh_public_key
  tags       = local.tags
}

resource "aws_security_group" "app" {
  name        = "${local.name}-app"
  description = "Web from anywhere, SSH from one address"
  vpc_id      = data.aws_vpc.default.id
  tags        = merge(local.tags, { Name = "${local.name}-app" })
}

resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.app.id
  description       = "HTTP: the redirect to HTTPS, and ACME challenges"
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "ssh" {
  security_group_id = aws_security_group.app.id
  description       = "SSH from one address only (var.ssh_cidr)"
  cidr_ipv4         = var.ssh_cidr
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}

# Postgres has NO ingress rule. It is reachable on the compose network and
# publishes no port to the host, so there is nothing for the internet to
# reach even if a rule were added by mistake.

resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.app.id
  description       = "Outbound: ECR, Secrets Manager, S3, Resend, ACME"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

/* --- What the instance may do -------------------------------------------- */

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "${local.name}-app"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
  tags               = local.tags
}

data "aws_iam_policy_document" "app" {
  statement {
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = ["*"] # GetAuthorizationToken is account-wide by design
  }

  # Its own secrets, and nothing else in Secrets Manager.
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [for s in aws_secretsmanager_secret.app : s.arn]
  }

  # Partner documents.
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.uploads.arn}/*"]
  }

  statement {
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.uploads.arn]
  }

  # Nightly dumps. No DeleteObject — a compromised instance must not be able
  # to erase the backups that would recover from it. Expiry is the bucket's
  # lifecycle rule, which the instance cannot touch.
  statement {
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.backups.arn}/*"]
  }

  statement {
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.backups.arn]
  }

  # The backup metric the alarm watches. Scoped by namespace rather than
  # resource, which is the only condition PutMetricData supports.
  statement {
    effect    = "Allow"
    actions   = ["cloudwatch:PutMetricData"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "cloudwatch:namespace"
      values   = ["MediCraft/Backups"]
    }
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "${local.name}-app"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app.json
}

# The way back in when a home IP changes and the port-22 rule stops matching.
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "app" {
  name = "${local.name}-app"
  role = aws_iam_role.app.name
  tags = local.tags
}

/* --- The instance -------------------------------------------------------- */

# Resolved, not pinned: a rebuild should pick up a patched image. The box
# holds nothing that matters — images come from ECR, data lives on /data.
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-arm64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "app" {
  count = var.enable_app_server ? 1 : 0

  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.app.name
  key_name               = aws_key_pair.deploy.key_name

  user_data = templatefile("${path.module}/user-data.sh", {
    region       = var.aws_region
    env_name     = var.env_name
    ecr_registry = split("/", data.aws_ecr_repository.app.repository_url)[0]
  })
  # Editing the bootstrap script must not rebuild a running server. It runs
  # once at first boot; later changes are deployed, not re-imaged.
  user_data_replace_on_change = false

  root_block_device {
    volume_size           = var.root_volume_gb
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
    tags                  = merge(local.tags, { Name = "${local.name}-root" })
  }

  metadata_options {
    http_tokens = "required" # IMDSv2 only
    # 2, not the default 1. A container on the docker bridge sits one hop
    # further from the metadata service than the host, so at 1 anything
    # inside a container is refused the instance role — and the symptom is a
    # 403 from the AWS SDK that reads like a policy mistake.
    http_put_response_hop_limit = 2
  }

  tags = merge(local.tags, { Name = local.name })

  lifecycle {
    # Amazon publishes a new AMI constantly. Replacing a running server
    # because of that is not a decision to make automatically.
    ignore_changes = [ami]
  }
}

/* --- The database volume --------------------------------------------------
   Separate from the instance, and deliberately NOT destroyed with it. If the
   server is replaced, this detaches and reattaches with the data intact —
   which is the difference between rebuilding a box and losing the database.
   ------------------------------------------------------------------------ */

resource "aws_ebs_volume" "data" {
  # Must match the instance's AZ — an EBS volume cannot cross one.
  availability_zone = data.aws_subnet.first.availability_zone
  size              = var.data_volume_gb
  type              = "gp3"
  encrypted         = true
  tags              = merge(local.tags, { Name = "${local.name}-data" })

  lifecycle {
    # The one resource here that must never be destroyed by a careless plan.
    prevent_destroy = true
  }
}

data "aws_subnet" "first" {
  id = data.aws_subnets.default.ids[0]
}

resource "aws_volume_attachment" "data" {
  count = var.enable_app_server ? 1 : 0

  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.app[0].id

  # Detaching a mounted filesystem by force corrupts it. On a normal
  # replacement the instance is stopped first, which unmounts cleanly.
  force_detach = false
}

resource "aws_eip" "app" {
  count    = var.enable_app_server ? 1 : 0
  instance = aws_instance.app[0].id
  domain   = "vpc"
  tags     = merge(local.tags, { Name = local.name })
}

output "server_ip" {
  description = "Point the DNS A record at this."
  value       = var.enable_app_server ? aws_eip.app[0].public_ip : "(no server — apply with enable_app_server=true)"
}

output "ssh_command" {
  value = var.enable_app_server ? "ssh -i ~/.ssh/medicraft-deploy ec2-user@${aws_eip.app[0].public_ip}" : "(no server yet)"
}
