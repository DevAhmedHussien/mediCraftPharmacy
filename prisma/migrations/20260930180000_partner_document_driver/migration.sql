-- PartnerDocument learns which storage driver wrote it, exactly as Media
-- already does: a file uploaded against the local driver has to keep resolving
-- after the deployment is pointed at S3, rather than 404ing against a bucket
-- that never held it.
ALTER TABLE "PartnerDocument" ADD COLUMN "driver" "StorageDriver" NOT NULL DEFAULT 'LOCAL';
