-- Create SMSLog table
CREATE TABLE IF NOT EXISTS "SMSLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT,
  "userId" TEXT,
  "to" TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "messageId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "direction" TEXT NOT NULL DEFAULT 'outbound',
  "segments" INTEGER NOT NULL DEFAULT 1,
  "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "countryCode" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SMSLog_pkey" PRIMARY KEY ("id")
);

-- Create SMSTemplate table
CREATE TABLE IF NOT EXISTS "SMSTemplate" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "variables" JSONB NOT NULL DEFAULT '[]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SMSTemplate_pkey" PRIMARY KEY ("id")
);

-- Create SMSPricing table
CREATE TABLE IF NOT EXISTS "SMSPricing" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "countryCode" TEXT NOT NULL,
  "countryName" TEXT NOT NULL,
  "mcc" TEXT,
  "mnc" TEXT,
  "carrierName" TEXT,
  "pricePerSms" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SMSPricing_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
ALTER TABLE "SMSTemplate" ADD CONSTRAINT "SMSTemplate_organizationId_name_key" UNIQUE ("organizationId", "name");
ALTER TABLE "SMSPricing" ADD CONSTRAINT "SMSPricing_countryCode_key" UNIQUE ("countryCode");

-- Create indexes for SMSLog
CREATE INDEX IF NOT EXISTS "SMSLog_organizationId_idx" ON "SMSLog"("organizationId");
CREATE INDEX IF NOT EXISTS "SMSLog_userId_idx" ON "SMSLog"("userId");
CREATE INDEX IF NOT EXISTS "SMSLog_status_idx" ON "SMSLog"("status");
CREATE INDEX IF NOT EXISTS "SMSLog_messageId_idx" ON "SMSLog"("messageId");
CREATE INDEX IF NOT EXISTS "SMSLog_createdAt_idx" ON "SMSLog"("createdAt");

-- Create indexes for SMSTemplate
CREATE INDEX IF NOT EXISTS "SMSTemplate_organizationId_idx" ON "SMSTemplate"("organizationId");
CREATE INDEX IF NOT EXISTS "SMSTemplate_type_idx" ON "SMSTemplate"("type");
CREATE INDEX IF NOT EXISTS "SMSTemplate_isActive_idx" ON "SMSTemplate"("isActive");

-- Create indexes for SMSPricing
CREATE INDEX IF NOT EXISTS "SMSPricing_countryCode_idx" ON "SMSPricing"("countryCode");
CREATE INDEX IF NOT EXISTS "SMSPricing_expiresAt_idx" ON "SMSPricing"("expiresAt");

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_smslog_updated_at BEFORE UPDATE ON "SMSLog"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smstemplate_updated_at BEFORE UPDATE ON "SMSTemplate"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smspricing_updated_at BEFORE UPDATE ON "SMSPricing"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();