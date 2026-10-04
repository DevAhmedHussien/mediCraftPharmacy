/* --- Secrets ---------------------------------------------------------------
   Created empty. Terraform defines that a secret EXISTS and who may read it;
   it never carries a value, because `terraform.tfstate` is a plaintext file
   and anything passed through a variable ends up in it.

   Populate each one once with `aws secretsmanager put-secret-value` — see
   infra/README.md. `ignore_changes` on the value means a rotation does not
   show up as drift on the next plan.
   ------------------------------------------------------------------------ */

resource "aws_secretsmanager_secret" "app" {
  for_each = toset(local.secret_names)

  name                    = "medicraft/${var.env_name}/${each.value}"
  description             = "${each.value} for ${var.env_name}"
  recovery_window_in_days = var.env_name == "production" ? 30 : 0
  tags                    = local.tags
}

/* --- The role App Runner itself runs as ---------------------------------- */

data "aws_iam_policy_document" "apprunner_assume_build" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["build.apprunner.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "apprunner_assume_tasks" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["tasks.apprunner.amazonaws.com"]
    }
  }
}

# Pulls the image. App Runner requires this to be a separate role from the
# one the running container uses.
resource "aws_iam_role" "apprunner_ecr_access" {
  name               = "${local.name}-apprunner-ecr"
  assume_role_policy = data.aws_iam_policy_document.apprunner_assume_build.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# What the running application may do. Deliberately small: read its own
# secrets, and read and write its own uploads prefix. Nothing else.
resource "aws_iam_role" "apprunner_instance" {
  name               = "${local.name}-apprunner-instance"
  assume_role_policy = data.aws_iam_policy_document.apprunner_assume_tasks.json
  tags               = local.tags
}

data "aws_iam_policy_document" "instance" {
  statement {
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue"]
    resources = concat(
      [for s in aws_secretsmanager_secret.app : s.arn],
      [aws_db_instance.main.master_user_secret[0].secret_arn],
    )
  }

  statement {
    effect  = "Allow"
    actions = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    # Scoped to this environment's prefix so staging cannot read or overwrite
    # a production partner's uploaded licence.
    resources = ["arn:aws:s3:::medicraft-uploads/${var.env_name}/*"]
  }
}

resource "aws_iam_role_policy" "instance" {
  name   = "${local.name}-instance"
  role   = aws_iam_role.apprunner_instance.id
  policy = data.aws_iam_policy_document.instance.json
}

/* --- The service ---------------------------------------------------------- */

resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = local.name
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.apprunner.id]
  tags               = local.tags
}

resource "aws_apprunner_service" "main" {
  service_name = local.name

  source_configuration {
    # CI pushes an image and calls UpdateService. Auto-deploy is off so a
    # push to ECR cannot ship itself without going through the pipeline that
    # ran the tests.
    auto_deployments_enabled = false

    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_identifier      = "${data.aws_ecr_repository.app.repository_url}:bootstrap"
      image_repository_type = "ECR"

      image_configuration {
        port = "3000"

        runtime_environment_variables = {
          NODE_ENV                = "production"
          APP_URL                 = var.app_url
          NEXT_PUBLIC_SITE_URL    = var.app_url
          EMAIL_DRIVER            = "resend"
          STORAGE_DRIVER          = "s3"
          S3_REGION               = var.aws_region
          S3_BUCKET               = "medicraft-uploads"
          NEXT_TELEMETRY_DISABLED = "1"
        }

        # Injected by App Runner at start, read from Secrets Manager. They
        # are never environment variables in the image, never in the task
        # definition, and never in Terraform state.
        runtime_environment_secrets = merge(
          { for name, s in aws_secretsmanager_secret.app : name => s.arn },
          {}
        )
      }
    }
  }

  instance_configuration {
    cpu               = var.app_runner_cpu
    memory            = var.app_runner_memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  health_check_configuration {
    protocol = "HTTP"
    # Unauthenticated and database-backed — /api/pulse answers 401 without a
    # session, which a load balancer reads as a dead instance.
    path              = "/api/health"
    interval          = 10
    timeout           = 5
    healthy_threshold = 1
    # Three strikes before replacing an instance, so one slow query during a
    # migration does not start a restart loop.
    unhealthy_threshold = 3
  }

  tags = local.tags

  lifecycle {
    # CI owns which image is deployed. Without this, every `terraform apply`
    # would roll the service back to the bootstrap tag.
    ignore_changes = [source_configuration[0].image_repository[0].image_identifier]
  }
}

output "service_url" {
  value = "https://${aws_apprunner_service.main.service_url}"
}
