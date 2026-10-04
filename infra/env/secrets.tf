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
