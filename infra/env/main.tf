terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }

  /* Remote state, so two people (or a person and a pipeline) cannot apply
     at once.

     THE KEY IS SUPPLIED AT INIT, NOT HARDCODED. Backend blocks cannot read
     variables, so a literal key here would have both environments writing
     to one state file — and an apply for staging would then see
     production's resources as drift and destroy them. Partial config makes
     the separation explicit and impossible to forget:

         terraform init -backend-config="key=staging.tfstate"
         terraform init -reconfigure -backend-config="key=production.tfstate"
  */
  backend "s3" {
    bucket         = "medicraft-terraform-state"
    region         = "us-east-1"
    dynamodb_table = "medicraft-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags { tags = local.tags }
}

/* --- Network ---------------------------------------------------------------
   Two public subnets, two private. RDS sits in the private pair and is
   reachable from nowhere outside the VPC; App Runner reaches it through a
   connector, and reaches the internet through the NAT in the public pair.

   Two availability zones because RDS requires a subnet group spanning at
   least two, even for a single-AZ instance.
   ------------------------------------------------------------------------ */

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = local.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = merge(local.tags, { Name = local.name })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = merge(local.tags, { Name = local.name })
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(local.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = merge(local.tags, { Name = "${local.name}-public-${count.index}" })
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(local.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = merge(local.tags, { Name = "${local.name}-private-${count.index}" })
}

# One NAT, in the first public subnet. See the cost note in infra/README.md.
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = merge(local.tags, { Name = "${local.name}-nat" })
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  depends_on    = [aws_internet_gateway.main]
  tags          = merge(local.tags, { Name = local.name })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = merge(local.tags, { Name = "${local.name}-public" })
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  tags = merge(local.tags, { Name = "${local.name}-private" })
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

/* --- Registry -------------------------------------------------------------
   Owned by infra/shared. Looked up, never declared here — see the note at
   the top of shared/main.tf for why.
   ------------------------------------------------------------------------ */

data "aws_ecr_repository" "app" {
  name = "medicraft"
}

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}
