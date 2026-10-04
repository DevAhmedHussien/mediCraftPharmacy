/* --- Partner documents ----------------------------------------------------
   Licences, DEA registrations and government photo IDs. Private, encrypted,
   versioned, reachable only through a presigned URL the app mints for one
   object at a time.
   ------------------------------------------------------------------------ */

resource "aws_s3_bucket" "uploads" {
  bucket = "medicraft-uploads-${var.env_name}"
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ACLs off entirely — removes the commonest way an S3 object becomes public.
resource "aws_s3_bucket_ownership_controls" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration { status = "Enabled" }
}

# Uploads are presigned PUTs issued to the browser, so the request comes from
# the page's origin. Without a matching CORS rule the browser refuses before
# sending and the upload silently never completes.
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_methods = ["PUT", "GET"]
    allowed_origins = [var.app_url]
    allowed_headers = ["content-type", "content-length"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }

  rule {
    id     = "expire-old-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration { noncurrent_days = 90 }
  }
}

/* --- Database backups -----------------------------------------------------
   With Postgres in a container there is no managed backup, no point-in-time
   recovery and no failover. This bucket is the entire disaster-recovery
   story, which makes its configuration load-bearing rather than routine.

   VERSIONING IS NOT HOUSEKEEPING HERE. A dump is written to a dated key once
   a day. If a corrupted dump overwrote a good one — a retry after a partial
   pg_dump, say — the good copy would be gone. Versioning keeps it.

   THIRTY DAYS. Long enough to notice corruption that was not obvious at the
   time, short enough that it costs pennies.
   ------------------------------------------------------------------------ */

resource "aws_s3_bucket" "backups" {
  bucket = "medicraft-db-backups-${var.env_name}"
  tags   = merge(local.tags, { Purpose = "database-backups" })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "expire-after-30-days"
    status = "Enabled"
    filter {}
    expiration { days = 30 }
    # Superseded versions go sooner; they exist to survive a bad overwrite,
    # not to be a second archive.
    noncurrent_version_expiration { noncurrent_days = 7 }
  }
}

output "uploads_bucket" { value = aws_s3_bucket.uploads.id }
output "backups_bucket" { value = aws_s3_bucket.backups.id }
