/* ===========================================================================
   Account-wide resources. Applied ONCE, not per environment.

   WHY THIS STACK EXISTS
   ---------------------
   An ECR repository name and an IAM OIDC provider URL are unique within an
   AWS account. Declared inside the per-environment stack, the first
   `terraform apply` creates them and the second fails:

       RepositoryAlreadyExistsException
       EntityAlreadyExists: Provider with url ... already exists

   Worse, a per-environment stack sharing one state file would see the other
   environment's resources as drift and destroy them. Separating what is
   account-wide from what is per-environment is the only arrangement where
   both applies are safe to run in any order, repeatedly.

       terraform -chdir=shared apply          # once
       terraform -chdir=env apply -var-file=staging.tfvars
       terraform -chdir=env apply -var-file=production.tfvars
   ========================================================================= */

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }

  backend "s3" {
    bucket         = "medicraft-terraform-state"
    key            = "shared.tfstate"
    region         = "us-east-1"
    dynamodb_table = "medicraft-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project   = "medicraft-pharmacy"
      Scope     = "shared"
      ManagedBy = "terraform"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

/* --- One registry, tagged per environment ------------------------------- */

resource "aws_ecr_repository" "app" {
  name                 = "medicraft"
  image_tag_mutability = "IMMUTABLE" # a tag names one image, forever
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 40 images — 20 per environment, which is further back than anyone rolls."
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 40 }
      action       = { type = "expire" }
    }]
  })
}

/* --- One OIDC provider, trusted by both environments' roles -------------- */

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # AWS verifies GitHub's chain itself now, but the field is still required.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  lifecycle {
    ignore_changes = [thumbprint_list]
  }
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "github_oidc_provider_arn" {
  value = aws_iam_openid_connect_provider.github.arn
}
