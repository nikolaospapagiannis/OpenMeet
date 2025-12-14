-- Add Email Template Type Enum
CREATE TYPE "EmailTemplateType" AS ENUM (
  'welcome',
  'email_verification',
  'password_reset',
  'meeting_invitation',
  'meeting_summary',
  'meeting_recording_ready',
  'subscription_confirmation',
  'subscription_renewal',
  'subscription_cancelled',
  'payment_receipt',
  'team_invitation',
  'weekly_digest',
  'quota_warning',
  'security_alert',
  'custom'
);

-- Add Email Delivery Status Enum
CREATE TYPE "EmailDeliveryStatus" AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
  'opened',
  'clicked',
  'unsubscribed',
  'spam_reported'
);

-- Create EmailTemplate table
CREATE TABLE "EmailTemplate" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "type" "EmailTemplateType" NOT NULL DEFAULT 'custom',
  "subject" TEXT NOT NULL,
  "htmlBody" TEXT NOT NULL,
  "textBody" TEXT,
  "variables" JSONB NOT NULL DEFAULT '[]',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- Create EmailLog table
CREATE TABLE "EmailLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT,
  "templateId" TEXT,
  "to" TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "cc" TEXT,
  "bcc" TEXT,
  "replyTo" TEXT,
  "subject" TEXT NOT NULL,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'pending',
  "messageId" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "firstOpenedAt" TIMESTAMP(3),
  "clickedAt" TIMESTAMP(3),
  "bouncedAt" TIMESTAMP(3),
  "unsubscribedAt" TIMESTAMP(3),
  "spamReportedAt" TIMESTAMP(3),
  "openCount" INTEGER NOT NULL DEFAULT 0,
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "uniqueClickCount" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "errorCode" TEXT,
  "bounceType" TEXT,
  "webhookEvents" JSONB NOT NULL DEFAULT '[]',
  "attachmentCount" INTEGER NOT NULL DEFAULT 0,
  "scheduledAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- Create EmailTemplateVariable table
CREATE TABLE "EmailTemplateVariable" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "templateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayName" TEXT,
  "type" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "defaultValue" TEXT,
  "description" TEXT,
  "validation" JSONB,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmailTemplateVariable_pkey" PRIMARY KEY ("id")
);

-- Create EmailWebhookEvent table
CREATE TABLE "EmailWebhookEvent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "emailLogId" TEXT,
  "event" TEXT NOT NULL,
  "messageId" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "email" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "url" TEXT,
  "category" TEXT,
  "rawEvent" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_organizationId_name_version_key" UNIQUE ("organizationId", "name", "version");
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_messageId_key" UNIQUE ("messageId");
ALTER TABLE "EmailTemplateVariable" ADD CONSTRAINT "EmailTemplateVariable_templateId_name_key" UNIQUE ("templateId", "name");

-- Add indexes for EmailTemplate
CREATE INDEX "EmailTemplate_organizationId_idx" ON "EmailTemplate"("organizationId");
CREATE INDEX "EmailTemplate_type_idx" ON "EmailTemplate"("type");
CREATE INDEX "EmailTemplate_isDefault_idx" ON "EmailTemplate"("isDefault");
CREATE INDEX "EmailTemplate_isActive_idx" ON "EmailTemplate"("isActive");

-- Add indexes for EmailLog
CREATE INDEX "EmailLog_organizationId_idx" ON "EmailLog"("organizationId");
CREATE INDEX "EmailLog_messageId_idx" ON "EmailLog"("messageId");
CREATE INDEX "EmailLog_to_idx" ON "EmailLog"("to");
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");
CREATE INDEX "EmailLog_templateId_idx" ON "EmailLog"("templateId");
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- Add indexes for EmailTemplateVariable
CREATE INDEX "EmailTemplateVariable_templateId_idx" ON "EmailTemplateVariable"("templateId");

-- Add indexes for EmailWebhookEvent
CREATE INDEX "EmailWebhookEvent_emailLogId_idx" ON "EmailWebhookEvent"("emailLogId");
CREATE INDEX "EmailWebhookEvent_messageId_idx" ON "EmailWebhookEvent"("messageId");
CREATE INDEX "EmailWebhookEvent_event_idx" ON "EmailWebhookEvent"("event");
CREATE INDEX "EmailWebhookEvent_timestamp_idx" ON "EmailWebhookEvent"("timestamp");
CREATE INDEX "EmailWebhookEvent_email_idx" ON "EmailWebhookEvent"("email");

-- Add foreign keys
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;