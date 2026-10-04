# Infrastructure

Terraform for two environments of MediCraft Pharmacy on AWS: `staging` and
`production`.

## What it builds, and what it costs

| Resource | Per month (us-east-1, rough) |
|---|---|
| App Runner × 2 (1 vCPU / 2 GB, scale-to-1) | ~$50 |
| RDS `db.t4g.micro` × 2, 20 GB gp3 | ~$30 |
| **NAT gateway × 2, one per VPC** | **~$66 + data** |
| ECR storage | ~$1 |
| Secrets Manager, 8 secrets | ~$3 |
| **Total** | **~$150/mo** |

Production alone, if you drop staging, is roughly **$75/mo**.

### Why there is a NAT gateway

App Runner reaches a private RDS instance through a **VPC connector**, and a
connector routes *all* of the service's outbound traffic through your VPC —
not just the database traffic. The moment it is attached, calls to Resend, S3
and GoHighLevel stop working unless the private subnets have a route to the
internet. That route is a NAT gateway, and it is the single largest line item
here.

The alternatives were worse:

- **Public RDS.** App Runner has no stable egress IPs without a connector, so
  the security group would have to allow `0.0.0.0/0`. A publicly reachable
  database holding prescriber and patient records is not a trade worth making
  to save $33.
- **No connector, external managed Postgres.** Workable, and genuinely
  cheaper — but it puts patient data with a second vendor and adds
  cross-network latency to every query.

### One VPC per environment, so two NAT gateways

The expensive choice, made deliberately. Sharing one VPC would halve this
line to $33, and for most applications that would be the right trade.

Not for this one. A shared VPC means staging's application can open a TCP
connection to production's database — the only thing stopping it is a
security group rule somebody could loosen while debugging at 6pm. These
databases hold prescriber identifiers, DEA numbers and negotiated pricing.
Making the isolation structural rather than a rule costs $33 a month, and
the failure it prevents is the kind that ends up in a breach notification.

If you drop the staging environment entirely, you drop its NAT with it.

## Layout

```
infra/
  shared/   ECR repository + GitHub OIDC provider. Applied ONCE.
  env/      Everything per-environment. Applied twice, once per tfvars.
```

The split is not organisational tidiness. An ECR repository name and an IAM
OIDC provider URL are unique per AWS account: declared inside the
per-environment stack, the second `terraform apply` fails outright — and if
both environments shared a state file, an apply for staging would see
production's resources as drift and **destroy them**.

## First run

```sh
# 1. Account-wide, once.
terraform -chdir=infra/shared init
terraform -chdir=infra/shared apply

# 2. Staging. Note the explicit state key.
terraform -chdir=infra/env init -backend-config="key=staging.tfstate"
terraform -chdir=infra/env apply -var-file=staging.tfvars

# 3. Production, into its own state.
terraform -chdir=infra/env init -reconfigure -backend-config="key=production.tfstate"
terraform -chdir=infra/env apply -var-file=production.tfvars
```

The backend key is supplied at `init` rather than written in the config
because backend blocks cannot read variables — so there is no way to derive
it from `env_name`, and a hardcoded one is the bug described above.

> Before step 1, create the state bucket and lock table:
> ```sh
> aws s3api create-bucket --bucket medicraft-terraform-state --region us-east-1
> aws s3api put-bucket-versioning --bucket medicraft-terraform-state \
>   --versioning-configuration Status=Enabled
> aws dynamodb create-table --table-name medicraft-terraform-locks \
>   --attribute-definitions AttributeName=LockID,AttributeType=S \
>   --key-schema AttributeName=LockID,KeyType=HASH \
>   --billing-mode PAY_PER_REQUEST --region us-east-1
> ```

Secrets are **not** in Terraform. It creates empty Secrets Manager entries and
you populate them once:

```sh
aws secretsmanager put-secret-value \
  --secret-id medicraft/staging/AUTH_SECRET \
  --secret-string "$(openssl rand -base64 32)"
```

Terraform never sees a secret value, so none is written to state. `terraform
state` is otherwise a plaintext copy of everything you own.

## Wiring GitHub

`terraform -chdir=infra/env output github_deploy_role_arn` gives an ARN per
environment (run it against each state). In
GitHub → Settings → Environments, create `staging` and `production`, and add
a **variable** (not a secret — it is not one) named `AWS_DEPLOY_ROLE_ARN`.

Add a required reviewer on `production` so a merge to `main` pauses for a
human.

## Migrations

A Fargate task, run by CI **before** App Runner is updated, using the
migrator stage the Dockerfile already builds.

Neither obvious alternative works here. App Runner has no one-off task
primitive, and the GitHub runner cannot reach RDS because RDS is private —
which is the point of it being private. So the migration runs inside the VPC,
CI waits for its exit code, and a non-zero code fails the deploy with the
previous version still serving.

This is also why migrations do not run at application startup, which is the
common shortcut: a failed migration there leaves every instance
crash-looping instead of leaving the old version up, and App Runner's
rolling deploy overlaps old and new images, so a destructive migration would
run while the old code is still live against the changed schema.

The ECS cluster costs nothing — there is no capacity to pay for. A migration
run bills a few seconds of a 0.25 vCPU task.
