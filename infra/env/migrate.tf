/* ===========================================================================
   Running migrations.

   THE PROBLEM THIS SOLVES
   -----------------------
   The Dockerfile already builds a migrator image whose whole job is
   `prisma migrate deploy`. Something has to run it, once, before the new
   application image starts serving — and neither obvious candidate works:

     · App Runner has no one-off task primitive. It runs a service.
     · The GitHub runner cannot reach the database. RDS is private, which is
       the point of it being private.

   So: a Fargate task, in the same private subnets, launched by CI and waited
   on before App Runner is updated. The ECS cluster itself costs nothing —
   there is no capacity to pay for — and a migration run bills a few seconds
   of a 0.25 vCPU task.

   WHY NOT MIGRATE AT APPLICATION STARTUP
   --------------------------------------
   It is the common shortcut and it has two failure modes this avoids. A
   migration that fails leaves every instance crash-looping rather than
   leaving the previous version serving; and under App Runner's rolling
   deploy the old and new images overlap, so a destructive migration runs
   while the old code is still live against the changed schema.

   Running it as a gate means a failed migration stops the deploy with the
   previous version still up.
   ========================================================================= */

resource "aws_ecs_cluster" "migrate" {
  name = "${local.name}-migrate"
  tags = local.tags
}

resource "aws_cloudwatch_log_group" "migrate" {
  name              = "/ecs/${local.name}-migrate"
  retention_in_days = 30
  tags              = local.tags
}

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Pulls the image and writes the logs.
resource "aws_iam_role" "migrate_execution" {
  name               = "${local.name}-migrate-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "migrate_execution" {
  role       = aws_iam_role.migrate_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# The execution role also resolves the secret into the container's
# environment, so it needs read access to that one secret and no other.
data "aws_iam_policy_document" "migrate_secrets" {
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.app["DATABASE_URL"].arn]
  }
}

resource "aws_iam_role_policy" "migrate_secrets" {
  name   = "${local.name}-migrate-secrets"
  role   = aws_iam_role.migrate_execution.id
  policy = data.aws_iam_policy_document.migrate_secrets.json
}

resource "aws_ecs_task_definition" "migrate" {
  family                   = "${local.name}-migrate"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.migrate_execution.arn

  container_definitions = jsonencode([{
    name = "migrate"
    # Overridden per run by CI with the image built from this commit. The
    # placeholder keeps the definition valid before the first deploy.
    image     = "${data.aws_ecr_repository.app.repository_url}:bootstrap-migrate"
    essential = true

    secrets = [{
      name      = "DATABASE_URL"
      valueFrom = aws_secretsmanager_secret.app["DATABASE_URL"].arn
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.migrate.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "migrate"
      }
    }
  }])

  tags = local.tags
}

output "migrate_cluster" {
  value = aws_ecs_cluster.migrate.name
}

output "migrate_task_definition" {
  value = aws_ecs_task_definition.migrate.family
}

output "migrate_subnets" {
  value = join(",", aws_subnet.private[*].id)
}

output "migrate_security_group" {
  value = aws_security_group.apprunner.id
}
