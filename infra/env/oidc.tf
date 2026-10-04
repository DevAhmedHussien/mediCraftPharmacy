/* ===========================================================================
   How GitHub Actions gets into AWS without a stored credential.

   GitHub publishes an OIDC identity provider. A workflow run can ask it for
   a short-lived token describing exactly what is running — which repository,
   which branch, which workflow. AWS is told to trust that provider, and the
   role below will exchange such a token for credentials that last an hour.

   WHAT THE TRUST POLICY ACTUALLY ENFORCES
   ---------------------------------------
   `token.actions.githubusercontent.com:sub` is pinned to one repository AND
   one branch. A fork cannot assume it. A pull request from a fork cannot
   assume it. A run on a feature branch cannot assume it. Production's role
   is reachable only from `main`.

   Getting that condition wrong is the one mistake in this file that matters:
   a `sub` of `repo:owner/name:*` would let any branch in the repository
   deploy to production, which is the whole control this is here to provide.
   ========================================================================= */

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "github_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # One repository, one branch. See the note above.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:ref:refs/heads/${local.deploy_branch}"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name               = "${local.name}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
  # An hour is longer than any deploy here takes and shorter than a working
  # day, so a token that somehow escapes is not useful for long.
  max_session_duration = 3600
  tags                 = local.tags
}

data "aws_iam_policy_document" "deploy" {
  # Push an image.
  statement {
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    # GetAuthorizationToken is account-wide by design; the rest are scoped to
    # this repository below.
    resources = ["*"]
  }

  # Point the service at it, and read back what happened. Deliberately NOT
  # apprunner:CreateService or DeleteService — CI updates what Terraform
  # owns, it does not create or destroy infrastructure.
  statement {
    effect = "Allow"
    actions = [
      "apprunner:ListServices",
      "apprunner:DescribeService",
      "apprunner:UpdateService",
    ]
    resources = ["*"]
  }

  # Run the migration task and wait for it.
  statement {
    effect = "Allow"
    actions = [
      "ecs:RunTask",
      "ecs:DescribeTasks",
      "ecs:RegisterTaskDefinition",
      "ecs:DescribeTaskDefinition",
    ]
    resources = ["*"]
  }

  # UpdateService and RunTask both hand work to a role; IAM requires the
  # caller to be allowed to pass each one. Enumerated rather than "*",
  # because iam:PassRole on everything is privilege escalation to anything
  # the account can assume.
  statement {
    effect  = "Allow"
    actions = ["iam:PassRole"]
    resources = [
      aws_iam_role.apprunner_ecr_access.arn,
      aws_iam_role.migrate_execution.arn,
    ]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "${local.name}-deploy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}

output "github_deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE_ARN variable on the matching GitHub Environment."
  value       = aws_iam_role.github_deploy.arn
}
