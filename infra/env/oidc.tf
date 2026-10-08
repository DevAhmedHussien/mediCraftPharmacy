/* ===========================================================================
   How GitHub Actions gets into AWS without a stored credential.

   GitHub publishes an OIDC identity provider. A workflow run can ask it for
   a short-lived token describing exactly what is running — which repository,
   which branch, which workflow. AWS is told to trust that provider, and the
   role below will exchange such a token for credentials that last an hour.

   WHAT THE TRUST POLICY ACTUALLY ENFORCES
   ---------------------------------------
   Two conditions, together: `sub` pins the repository and the deployment
   ENVIRONMENT, and `ref` pins the branch. A fork cannot assume it. A pull
   request from a fork cannot assume it. A run on a feature branch cannot
   assume it, even one that targets the production environment.

   The environment is in `sub` rather than the branch because deploy.yml's
   job declares `environment:` — GitHub issues a DIFFERENT subject for
   those, `repo:OWNER/NAME:environment:NAME`, and matching the ordinary
   `...:ref:refs/heads/main` form is why this role rejected every deploy
   for days while looking perfectly configured.

   Getting that condition wrong is the one mistake in this file that matters:
   a `sub` of `repo:owner/name:*` would let any branch in the repository
   deploy to production, which is the whole control this is here to provide.
   ========================================================================= */

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

    # One repository, one ENVIRONMENT.
    #
    # This was `repo:OWNER/NAME:ref:refs/heads/main`, the subject GitHub
    # issues for an ordinary job. deploy.yml's job is not ordinary: it
    # declares `environment:`, and GitHub then issues
    # `repo:OWNER/NAME:environment:NAME` instead. The two never matched, so
    # every run died with "Not authorized to perform
    # sts:AssumeRoleWithWebIdentity" while the role, the provider and the
    # permissions were all correct — which is a hard failure to read.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:environment:${local.deploy_environment}"]
    }

    # And still one branch.
    #
    # The subject above no longer carries the ref, so alone it would let any
    # branch deploy provided the job targets this environment — precisely the
    # loosening the note at the top warns about. GitHub's token carries `ref`
    # as its own claim, so the branch pin stays here in Terraform rather than
    # moving into a GitHub setting invisible from this file.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:ref"
      values   = ["refs/heads/${local.deploy_branch}"]
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
  /* Push an image. That is all CI does in AWS now.

     The deploy itself is an SSH session to the instance, which pulls the
     image using its own role — so the pipeline never needs permission to
     change infrastructure. It cannot create, resize or delete anything, and
     a compromised workflow can at worst push an image that a human still has
     to deploy. */
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
    resources = ["*"]
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
