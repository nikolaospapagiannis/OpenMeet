-- Add new fields to AIModel for deployment tracking
ALTER TABLE "AIModel" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AIModel" ADD COLUMN "deployedAt" TIMESTAMP(3);
ALTER TABLE "AIModel" ADD COLUMN "deployedBy" TEXT;
ALTER TABLE "AIModel" ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0;

-- Create index for isActive
CREATE INDEX "AIModel_isActive_idx" ON "AIModel"("isActive");

-- Create FineTuningJob table
CREATE TABLE "FineTuningJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "openaiJobId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "trainingFileId" TEXT NOT NULL,
    "validationFileId" TEXT,
    "fineTunedModel" TEXT,
    "hyperparameters" JSONB NOT NULL DEFAULT '{}',
    "industryTemplate" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "FineTuningJob_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for openaiJobId
CREATE UNIQUE INDEX "FineTuningJob_openaiJobId_key" ON "FineTuningJob"("openaiJobId");

-- Create indexes for FineTuningJob
CREATE INDEX "FineTuningJob_organizationId_idx" ON "FineTuningJob"("organizationId");
CREATE INDEX "FineTuningJob_userId_idx" ON "FineTuningJob"("userId");
CREATE INDEX "FineTuningJob_status_idx" ON "FineTuningJob"("status");
CREATE INDEX "FineTuningJob_openaiJobId_idx" ON "FineTuningJob"("openaiJobId");

-- Create FineTuneFile table
CREATE TABLE "FineTuneFile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "openaiFileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "exampleCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FineTuneFile_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for openaiFileId
CREATE UNIQUE INDEX "FineTuneFile_openaiFileId_key" ON "FineTuneFile"("openaiFileId");

-- Create indexes for FineTuneFile
CREATE INDEX "FineTuneFile_organizationId_idx" ON "FineTuneFile"("organizationId");
CREATE INDEX "FineTuneFile_openaiFileId_idx" ON "FineTuneFile"("openaiFileId");
