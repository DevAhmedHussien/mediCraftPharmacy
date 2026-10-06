import "server-only";

import { z } from "zod";

/* ===========================================================================
   Environment, validated once at module load.

   The point of parsing rather than reading `process.env` at the call site is
   that a missing AUTH_SECRET or a malformed S3 config fails the process on
   boot with a readable list, instead of throwing at 2am inside a request that
   happened to be the first to upload a file.

   Two rules this file enforces that a flat schema cannot:

     · If STORAGE_DRIVER is "s3", the four S3 variables become required. A
       deployment that sets the driver but forgets the bucket is caught here
       rather than by a 500 on the first upload.
     · FIELD_ENCRYPTION_KEY must be 32 bytes of base64. AES-256-GCM silently
       accepts a short key by throwing at encrypt time; checking the length
       here means a bad key can never reach a DEA number.
   ========================================================================= */

const base = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().url("DATABASE_URL must be a Postgres connection URL."),

  /**
   * Auth.js signing secret. 32+ chars because it keys the JWT that carries
   * `role` and `permissions` — forging one is a privilege escalation.
   * Generate with: openssl rand -base64 32
   */
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters."),

  /** Absolute origin. Used for email links, OG tags and the S3 return URLs. */
  APP_URL: z.string().url().default("http://localhost:3000"),

  /**
   * AES-256-GCM key for DEA / NPI / EIN / licence numbers, base64 of exactly
   * 32 bytes. Generate with: openssl rand -base64 32
   */
  FIELD_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, {
      message: "FIELD_ENCRYPTION_KEY must be base64 of exactly 32 bytes.",
    }),

  /**
   * Rotated daily and mixed into the visitor hash. Changing it un-links every
   * historical visitor, which is the privacy property, not a bug.
   */
  ANALYTICS_SALT: z.string().min(16).default("dev-analytics-salt-change-me"),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),

  /** Where the local driver writes. Outside `public/` on purpose — see storage.ts. */
  LOCAL_UPLOAD_DIR: z.string().default(".uploads"),

  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  /** Set for MinIO / LocalStack / R2. Omit for real AWS. */
  S3_ENDPOINT: z.string().url().optional(),
  /** MinIO and LocalStack need path-style addressing. */
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  /** Email is stubbed to disk until a provider key exists. */
  EMAIL_DRIVER: z.enum(["console", "resend"]).default("console"),

  /**
   * Which service captures the MSA signature. `internal` is in-app typed-name
   * capture; `docusign` needs the credentials below and throws a readable
   * error at the point of use until it has them.
   */
  SIGNATURE_DRIVER: z.enum(["internal", "docusign", "signeasy"]).default("internal"),
  DOCUSIGN_INTEGRATION_KEY: z.string().optional(),
  DOCUSIGN_USER_ID: z.string().optional(),
  DOCUSIGN_ACCOUNT_ID: z.string().optional(),
  DOCUSIGN_PRIVATE_KEY: z.string().optional(),
  DOCUSIGN_TEMPLATE_ID: z.string().optional(),
  DOCUSIGN_CONNECT_HMAC: z.string().optional(),

  /**
   * SignEasy.
   *
   * The 2026 template is already tagged with `\c_sig\`-style text anchors,
   * which is the convention SignEasy scans a document for — so the same file
   * we render for a partner is the file that goes to it, with no second layout
   * to maintain. Credentials are optional until the driver is selected.
   */
  SIGNEASY_API_KEY: z.string().optional(),
  SIGNEASY_CLIENT_ID: z.string().optional(),
  SIGNEASY_WEBHOOK_SECRET: z.string().optional(),
  SIGNEASY_API_BASE: z.string().default("https://api.signeasy.com/v1"),

  /* --- Meeting times ----------------------------------------------------
     There is no calendar integration: the Google driver and its service
     account settings were removed at the owner's direction. Bookings live in
     the database and nothing is written to anybody's diary.

     The timezone stays, and matters. The admin's time boxes are
     `datetime-local` inputs, which a browser interprets in its OWN zone — so
     without a fixed pharmacy zone an admin in another state would offer a slot
     that means a different instant to the applicant reading it. */
  CALENDAR_TIMEZONE: z.string().default("America/New_York"),

  /* --- GoHighLevel ------------------------------------------------------
     Public inquiries are mirrored into the CRM. Both the token and the
     location are required together: a token without a location cannot address
     a sub-account, and a location without a token cannot authenticate, so
     either one alone is a misconfiguration rather than a partial setup. The
     cross-check is in the refinement below. */
  GHL_API_TOKEN: z.string().optional(),
  GHL_LOCATION_ID: z.string().optional(),
  GHL_API_BASE: z.string().url().default("https://services.leadconnectorhq.com"),
  /** The API version header LeadConnector pins its contract to. */
  GHL_API_VERSION: z.string().default("2021-07-28"),
  /** Tag applied to every contact created from the website contact form. */
  GHL_CONTACT_TAG: z.string().default("contact_us_form"),
  /**
   * Text partners and inquirers at each pipeline step. Off by default: US
   * carriers block SMS from a number without A2P 10DLC registration, so this
   * waits until the GHL location's registration is approved.
   */
  GHL_SMS_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  /**
   * Lets the public application form create an account with a password.
   *
   * On for testing so an applicant can sign in straight after applying. Turn
   * it off and the form drops its password fields and creates the account
   * without credentials — removal is this one flag, not a migration.
   */
  ALLOW_SELF_SERVICE_PASSWORD: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("MediCraft Pharmacy <partners@medicraftpharmacy.com>"),
  EMAIL_REPLY_TO: z.string().default("support@medicraftpharmacy.com"),
});

const schema = base.superRefine((v, ctx) => {
  if (v.STORAGE_DRIVER === "s3") {
    /* Region and bucket only.
     *
     * The access key pair used to be required here too, which forced an IAM
     * user with long-lived credentials even when running somewhere that
     * already has an identity — App Runner, ECS and Lambda all carry a role,
     * and the AWS SDK finds it on its own. Demanding static keys there means
     * creating a second credential to store, leak and rotate in order to
     * reach a bucket the instance can already read.
     *
     * They stay OPTIONAL rather than being removed: MinIO and LocalStack in
     * docker-compose have no instance role, so local development still
     * supplies them. See `getS3` in lib/services/storage.ts for the other
     * half of this. */
    for (const key of ["S3_REGION", "S3_BUCKET"] as const) {
      if (!v[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when STORAGE_DRIVER is "s3".`,
        });
      }
    }
  }
  /* One of the GHL pair without the other is a half-configured CRM: the
     inquiry would still be stored, but nothing would reach the sales team and
     nothing would say so. Fail on boot instead. */
  if (Boolean(v.GHL_API_TOKEN) !== Boolean(v.GHL_LOCATION_ID)) {
    ctx.addIssue({
      code: "custom",
      path: [v.GHL_API_TOKEN ? "GHL_LOCATION_ID" : "GHL_API_TOKEN"],
      message: "GHL_API_TOKEN and GHL_LOCATION_ID must be set together.",
    });
  }
  if (v.EMAIL_DRIVER === "resend" && !v.RESEND_API_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["RESEND_API_KEY"],
      message: 'RESEND_API_KEY is required when EMAIL_DRIVER is "resend".',
    });
  }
  if (v.SIGNATURE_DRIVER === "signeasy") {
    for (const key of ["SIGNEASY_API_KEY", "SIGNEASY_CLIENT_ID"] as const) {
      if (!v[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when SIGNATURE_DRIVER is "signeasy".`,
        });
      }
    }
  }
  if (v.SIGNATURE_DRIVER === "docusign") {
    for (const key of [
      "DOCUSIGN_INTEGRATION_KEY",
      "DOCUSIGN_USER_ID",
      "DOCUSIGN_ACCOUNT_ID",
      "DOCUSIGN_PRIVATE_KEY",
    ] as const) {
      if (!v[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when SIGNATURE_DRIVER is "docusign".`,
        });
      }
    }
  }
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  · ${i.path.join(".")}: ${i.message}`);
  throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
