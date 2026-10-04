terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }

  /* The key is supplied at init, not hardcoded — backend blocks cannot read
     variables, and a literal key would have both environments writing to one
     state file:

         terraform init -backend-config="key=production.tfstate"
  */
  backend "s3" {
    bucket       = "medicraft-terraform-state"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags { tags = local.tags }
}

/* --- Network ---------------------------------------------------------------
   The account's default VPC, unchanged.

   The previous design built a VPC with public and private subnets, an
   internet gateway, two route tables and a NAT gateway — $33/month of
   networking to keep a database off the internet. With Postgres now running
   in a container on the instance itself, there is no second thing to isolate:
   the only host in this system is the one serving the site, and it needs a
   public address regardless.

   So there is no VPC to manage. One instance, one security group, and the
   default routing that already works.
   ------------------------------------------------------------------------ */

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

/* --- Owned by infra/shared ------------------------------------------------ */

data "aws_ecr_repository" "app" {
  name = "medicraft"
}

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_caller_identity" "current" {}
