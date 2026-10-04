variable "env_name" {
  description = "staging or production. Names every resource and scopes the OIDC trust to one branch."
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.env_name)
    error_message = "env_name must be staging or production."
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "github_repo" {
  description = "owner/name. The OIDC trust policy is scoped to this repository and nothing else."
  type        = string
  default     = "DevAhmedHussien/mediCraftPharmacy"
}

variable "app_url" {
  description = "Public origin for this environment, e.g. https://staging.medicraftpharmacy.com."
  type        = string
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "app_runner_cpu" {
  type    = string
  default = "1024"
}

variable "app_runner_memory" {
  type    = string
  default = "2048"
}
