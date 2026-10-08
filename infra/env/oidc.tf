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

    # One repository, one ENVIRONMENT — in BOTH subject formats GitHub emits.
    #
    # Two things were wrong here, and only the second is obvious in hindsight.
    #
    # 1. deploy.yml's job declares `environment:`, and GitHub issues a
    #    different subject for those: `…:environment:NAME` rather than the
    #    ordinary `…:ref:refs/heads/BRANCH`.
    #
    # 2. This repository emits the IMMUTABLE form, which embeds the numeric
    #    owner and repository ids:
    #
    #      repo:DevAhmedHussien@130807970/mediCraftPharmacy@1318503403:environment:production
    #
    #    Not a documented default, and nothing in the error says so — STS
    #    answers "Not authorized to perform sts:AssumeRoleWithWebIdentity"
    #    whichever part of the subject failed to match.
    #
    # I found it by reading the actual claim out of CloudTrail rather than
    # reasoning about what it ought to be. Two earlier guesses were wrong.
    #
    # BOTH forms are listed, as exact values rather than a wildcard: GitHub
    # may serve either depending on repository settings, and a `*` in the id
    # position would also match a different repository whose name merely
    # starts the same way.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repo}:environment:${local.deploy_environment}",
        "repo:${local.github_repo_immutable}:environment:${local.deploy_environment}",
      ]
    }

    # And still one branch.
    #
    # Neither subject carries the ref, so without this any branch could
    # deploy provided its job targets this environment — exactly the
    # loosening the note at the top warns about. `ref` is its own claim, so
    # the branch pin stays here in Terraform rather than moving into a GitHub
    # setting invisible from this file.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:ref"
      values   = ["refs/heads/${local.deploy_branch}"]
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
  /* Push an image, and ask the instance to roll itself.

     The deploy was an SSH session, which cannot work from GitHub: port 22 is
     open to one address and a runner arrives from a different Azure IP every
     time. The alternatives were to publish thousands of GitHub CIDRs (beyond
     a security group's rule limit), open 22 to the world, or stop needing
     inbound SSH at all. This is the third.

     The instance already runs the SSM agent and is Online. Commands now go
     out through AWS rather than in through a port, so the security group
     needs no deploy rule whatsoever — strictly less exposed than before.

     The pipeline still cannot change infrastructure: it may push an image
     and send a shell command to ONE instance, and nothing else. */
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

  /* Find the box. Scoped to a read, because the workflow looks the instance
     up by tag rather than carrying its id in a variable that would go stale
     the first time the instance is replaced. */
  statement {
    effect    = "Allow"
    actions   = ["ec2:DescribeInstances"]
    resources = ["*"]
  }

  /* Run the deploy script on that one instance.
  
     `resources` names the instance AND the document, which is how SendCommand
     is scoped — either alone would allow any shell command on any instance in
     the account, which is the whole risk this is meant to bound. */
  statement {
    effect  = "Allow"
    actions = ["ssm:SendCommand"]
    resources = [
      "arn:aws:ec2:${var.aws_region}:${data.aws_caller_identity.current.account_id}:instance/${one(aws_instance.app[*].id)}",
      "arn:aws:ssm:${var.aws_region}::document/AWS-RunShellScript",
    ]
  }

  /* Read back what happened. Unscoped because an invocation id is not known
     until the command above returns one, and it carries no authority. */
  statement {
    effect    = "Allow"
    actions   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"]
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
