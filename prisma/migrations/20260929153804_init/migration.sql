-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'PARTNER');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('TELEHEALTH', 'EMR', 'SMALL_PHARMACY');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('APPLICATION_SUBMITTED', 'PRODUCT_LIST_SENT', 'PRICING_MEETING', 'PRICING_SUBMITTED', 'PRICING_CHANGES_REQUESTED', 'PRICING_ADMIN_APPROVED', 'PRICING_PARTNER_ACCEPTED', 'ONBOARDING_IN_PROGRESS', 'ONBOARDING_SUBMITTED', 'ONBOARDING_CHANGES_REQUESTED', 'ONBOARDING_APPROVED', 'MSA_SENT', 'MSA_SIGNED', 'VERIFIED', 'REJECTED', 'MSA_DECLINED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('applications.view', 'applications.review', 'products.send', 'pricing.review', 'onboarding.review', 'msa.send', 'partners.view', 'partners.manage');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PHARMACY_LICENSE', 'DEA_REGISTRATION', 'NPI_CONFIRMATION', 'STATE_LICENSE', 'W9', 'CERTIFICATE_OF_INSURANCE', 'BUSINESS_REGISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PriceListStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'ADMIN_APPROVED', 'PARTNER_ACCEPTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "MsaEnvelopeStatus" AS ENUM ('CREATED', 'SENT', 'DELIVERED', 'COMPLETED', 'DECLINED', 'VOIDED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_SUBMITTED', 'PRICING_SUBMITTED', 'PRICING_PARTNER_ACCEPTED', 'ONBOARDING_SUBMITTED', 'PARTNER_RESUBMITTED', 'MSA_SIGNED', 'PARTNER_VERIFIED', 'MSA_DECLINED', 'INTEGRATION_FAILURE', 'STATUS_CHANGED_BY_TEAMMATE', 'ACCOUNT_PERMISSIONS_CHANGED', 'APPLICATION_STALE');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'FAILED');

-- CreateEnum
CREATE TYPE "WebhookProvider" AS ENUM ('DOCUSIGN', 'STRIPE');

-- CreateEnum
CREATE TYPE "StorageDriver" AS ENUM ('LOCAL', 'S3');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('NEW', 'EXISTING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "Permission" NOT NULL,
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'APPLICATION_SUBMITTED',
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "suspendedReason" TEXT,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerOnboarding" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "legalBusinessName" TEXT,
    "dba" TEXT,
    "einCiphertext" TEXT,
    "einLast4" TEXT,
    "businessStreet" TEXT,
    "businessSuite" TEXT,
    "businessCity" TEXT,
    "businessState" TEXT,
    "businessZip" TEXT,
    "billingStreet" TEXT,
    "billingSuite" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingZip" TEXT,
    "statesOfOperation" TEXT[],
    "signerName" TEXT,
    "signerTitle" TEXT,
    "signerEmail" TEXT,
    "draft" JSONB,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "fieldComments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerLicense" (
    "id" TEXT NOT NULL,
    "onboardingId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "state" TEXT,
    "numberCiphertext" TEXT NOT NULL,
    "numberLast4" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerDocument" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "s3Key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewerComment" TEXT,
    "reviewedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethodRef" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "expMonth" INTEGER NOT NULL,
    "expYear" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethodRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strength" TEXT,
    "form" TEXT,
    "ndc" TEXT,
    "categorySlug" TEXT,
    "blurb" TEXT,
    "description" TEXT,
    "listPrice" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'each',
    "imageMediaId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListVersion" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "PriceListStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminComment" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceListVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListItem" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "listPrice" DECIMAL(12,4) NOT NULL,
    "proposedPrice" DECIMAL(12,4) NOT NULL,
    "approvedPrice" DECIMAL(12,4),
    "quantity" INTEGER,
    "partnerNote" TEXT,
    "adminComment" TEXT,

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPricing" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DECIMAL(12,4) NOT NULL,
    "sourceVersionId" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PartnerPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MsaEnvelope" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "status" "MsaEnvelopeStatus" NOT NULL DEFAULT 'CREATED',
    "templateId" TEXT,
    "signerEmail" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerClientUserId" TEXT,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "signedPdfS3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MsaEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "fromStatus" "PartnerStatus",
    "toStatus" "PartnerStatus" NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorRole" "Role",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "WebhookProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "historyId" TEXT,
    "template" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "props" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "outboxId" TEXT,
    "to" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "partnerId" TEXT,
    "providerMessageId" TEXT,
    "status" "EmailStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "partnerId" TEXT,
    "link" TEXT,
    "metadata" JSONB,
    "historyId" TEXT,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "driver" "StorageDriver" NOT NULL,
    "key" TEXT NOT NULL,
    "bucket" TEXT,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "checksum" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "coverMediaId" TEXT,
    "authorId" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "readingMinutes" INTEGER NOT NULL DEFAULT 1,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostCategory" (
    "postId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "PostCategory_pkey" PRIMARY KEY ("postId","categoryId")
);

-- CreateTable
CREATE TABLE "PostRevision" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrerHost" TEXT,
    "visitorHash" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "country" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "visitorHash" TEXT,
    "props" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStat" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniques" INTEGER NOT NULL DEFAULT 0,
    "avgDurationMs" INTEGER,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerApplication" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "howDidYouHearAboutUs" TEXT,
    "medicraftRep" TEXT,
    "practiceName" TEXT NOT NULL,
    "isPrimaryLocation" BOOLEAN NOT NULL DEFAULT true,
    "practiceAddress" TEXT,
    "practiceCity" TEXT,
    "practiceState" TEXT,
    "practiceZip" TEXT,
    "practicePhone" TEXT,
    "practiceFax" TEXT,
    "officeContactName" TEXT,
    "officeContactPhone" TEXT,
    "officeContactEmail" TEXT,
    "rxQuestionsEmail" TEXT,
    "rxQuestionsPhone" TEXT,
    "shippingEmail" TEXT,
    "shippingFax" TEXT,
    "invoicesEmail" TEXT,
    "invoicesFax" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescriber" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "signatureText" TEXT,
    "signatureMediaId" TEXT,
    "signedAt" TIMESTAMP(3),
    "deaCiphertext" TEXT NOT NULL,
    "deaLast4" TEXT NOT NULL,
    "deaExpiration" TIMESTAMP(3),
    "npiCiphertext" TEXT,
    "npiLast4" TEXT,
    "stateLicenseCiphertext" TEXT,
    "stateLicenseLast4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "AdminPermission_permission_idx" ON "AdminPermission"("permission");

-- CreateIndex
CREATE UNIQUE INDEX "AdminPermission_userId_permission_key" ON "AdminPermission"("userId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_userId_key" ON "Partner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_stripeCustomerId_key" ON "Partner"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Partner_status_statusChangedAt_idx" ON "Partner"("status", "statusChangedAt");

-- CreateIndex
CREATE INDEX "Partner_businessType_idx" ON "Partner"("businessType");

-- CreateIndex
CREATE INDEX "Partner_createdAt_idx" ON "Partner"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerOnboarding_partnerId_key" ON "PartnerOnboarding"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerLicense_onboardingId_idx" ON "PartnerLicense"("onboardingId");

-- CreateIndex
CREATE INDEX "PartnerLicense_expiresAt_idx" ON "PartnerLicense"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerDocument_s3Key_key" ON "PartnerDocument"("s3Key");

-- CreateIndex
CREATE INDEX "PartnerDocument_partnerId_type_idx" ON "PartnerDocument"("partnerId", "type");

-- CreateIndex
CREATE INDEX "PartnerDocument_status_idx" ON "PartnerDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodRef_stripePaymentMethodId_key" ON "PaymentMethodRef"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "PaymentMethodRef_partnerId_idx" ON "PaymentMethodRef"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_ndc_key" ON "Product"("ndc");

-- CreateIndex
CREATE INDEX "Product_isActive_sortOrder_name_idx" ON "Product"("isActive", "sortOrder", "name");

-- CreateIndex
CREATE INDEX "Product_categorySlug_idx" ON "Product"("categorySlug");

-- CreateIndex
CREATE INDEX "PriceListVersion_partnerId_status_idx" ON "PriceListVersion"("partnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PriceListVersion_partnerId_version_key" ON "PriceListVersion"("partnerId", "version");

-- CreateIndex
CREATE INDEX "PriceListItem_versionId_idx" ON "PriceListItem"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceListItem_versionId_productId_key" ON "PriceListItem"("versionId", "productId");

-- CreateIndex
CREATE INDEX "PartnerPricing_partnerId_isActive_idx" ON "PartnerPricing"("partnerId", "isActive");

-- CreateIndex
CREATE INDEX "PartnerPricing_productId_idx" ON "PartnerPricing"("productId");

-- CreateIndex
CREATE INDEX "Meeting_partnerId_idx" ON "Meeting"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "MsaEnvelope_envelopeId_key" ON "MsaEnvelope"("envelopeId");

-- CreateIndex
CREATE INDEX "MsaEnvelope_partnerId_status_idx" ON "MsaEnvelope"("partnerId", "status");

-- CreateIndex
CREATE INDEX "StatusHistory_partnerId_createdAt_idx" ON "StatusHistory"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_processedAt_idx" ON "WebhookEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_externalId_key" ON "WebhookEvent"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_idempotencyKey_key" ON "EmailOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "EmailLog_partnerId_createdAt_idx" ON "EmailLog"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_providerMessageId_idx" ON "EmailLog"("providerMessageId");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_partnerId_idx" ON "Notification"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_historyId_recipientId_type_key" ON "Notification"("historyId", "recipientId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_type_key" ON "NotificationPreference"("userId", "type");

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Media_driver_key_key" ON "Media"("driver", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "PostCategory_categoryId_idx" ON "PostCategory"("categoryId");

-- CreateIndex
CREATE INDEX "PostRevision_postId_createdAt_idx" ON "PostRevision"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_path_createdAt_idx" ON "PageView"("path", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_visitorHash_createdAt_idx" ON "PageView"("visitorHash", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "DailyStat_date_idx" ON "DailyStat"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStat_date_path_key" ON "DailyStat"("date", "path");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerApplication_partnerId_key" ON "PartnerApplication"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerApplication_practiceState_idx" ON "PartnerApplication"("practiceState");

-- CreateIndex
CREATE INDEX "Prescriber_applicationId_idx" ON "Prescriber"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Prescriber_applicationId_position_key" ON "Prescriber"("applicationId", "position");

-- AddForeignKey
ALTER TABLE "AdminPermission" ADD CONSTRAINT "AdminPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminPermission" ADD CONSTRAINT "AdminPermission_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerOnboarding" ADD CONSTRAINT "PartnerOnboarding_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerLicense" ADD CONSTRAINT "PartnerLicense_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "PartnerOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerDocument" ADD CONSTRAINT "PartnerDocument_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethodRef" ADD CONSTRAINT "PaymentMethodRef_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListVersion" ADD CONSTRAINT "PriceListVersion_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "PriceListVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPricing" ADD CONSTRAINT "PartnerPricing_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPricing" ADD CONSTRAINT "PartnerPricing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MsaEnvelope" ADD CONSTRAINT "MsaEnvelope_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "StatusHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "StatusHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostCategory" ADD CONSTRAINT "PostCategory_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostCategory" ADD CONSTRAINT "PostCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostRevision" ADD CONSTRAINT "PostRevision_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerApplication" ADD CONSTRAINT "PartnerApplication_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescriber" ADD CONSTRAINT "Prescriber_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescriber" ADD CONSTRAINT "Prescriber_signatureMediaId_fkey" FOREIGN KEY ("signatureMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
