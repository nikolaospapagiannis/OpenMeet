/**
 * E2E Transcription Test Seed Script
 *
 * Creates a test organization and user account for end-to-end testing of:
 * - MP3 file upload
 * - Transcription (OpenAI Whisper)
 * - AI Summary generation
 * - Template application
 *
 * Run with: DATABASE_URL="postgresql://..." npx ts-node prisma/seed-e2e-transcription.ts
 */

import { PrismaClient, SubscriptionTier, SubscriptionStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function seedE2ETranscriptionTest() {
  console.log('🎬 Setting up E2E Transcription Test Environment...\n');

  const hashedPassword = await bcrypt.hash('TestTranscribe123!', 10);
  const orgId = randomUUID();
  const userId = randomUUID();
  const workspaceId = randomUUID();

  // Create test organization with all AI features enabled
  const organization = await prisma.organization.upsert({
    where: { slug: 'e2e-transcription-test' },
    update: {
      name: 'E2E Transcription Test Org',
      subscriptionTier: SubscriptionTier.business,
      subscriptionStatus: SubscriptionStatus.active,
      settings: {
        autoRecording: true,
        aiSummaries: true,
        transcriptionEnabled: true,
        speechAnalytics: true,
        customTemplates: true,
        maxStorageGB: 100,
        maxMeetingsPerMonth: 1000,
        features: {
          transcription: true,
          aiSummary: true,
          aiQuery: true,
          templates: true,
          clips: true,
          coaching: true,
          analytics: true,
        },
      },
    },
    create: {
      id: orgId,
      name: 'E2E Transcription Test Org',
      slug: 'e2e-transcription-test',
      subscriptionTier: SubscriptionTier.business,
      subscriptionStatus: SubscriptionStatus.active,
      settings: {
        autoRecording: true,
        aiSummaries: true,
        transcriptionEnabled: true,
        speechAnalytics: true,
        customTemplates: true,
        maxStorageGB: 100,
        maxMeetingsPerMonth: 1000,
        features: {
          transcription: true,
          aiSummary: true,
          aiQuery: true,
          templates: true,
          clips: true,
          coaching: true,
          analytics: true,
        },
      },
    },
  });

  console.log('✅ Organization created:', organization.name);
  console.log('   ID:', organization.id);
  console.log('   Tier:', organization.subscriptionTier);

  // Create test user with admin permissions
  const user = await prisma.user.upsert({
    where: { email: 'e2e-test@transcription.test' },
    update: {
      firstName: 'E2E',
      lastName: 'Tester',
      role: UserRole.admin,
      emailVerified: true,
      organizationId: organization.id,
      passwordHash: hashedPassword,
    },
    create: {
      id: userId,
      email: 'e2e-test@transcription.test',
      passwordHash: hashedPassword,
      firstName: 'E2E',
      lastName: 'Tester',
      role: UserRole.admin,
      emailVerified: true,
      organizationId: organization.id,
    },
  });

  console.log('\n✅ User created:', user.email);
  console.log('   ID:', user.id);
  console.log('   Role:', user.role);

  // Create a default workspace (use findFirst + create pattern since no unique constraint)
  let workspace = await prisma.workspace.findFirst({
    where: {
      organizationId: organization.id,
      name: 'E2E Test Workspace',
    },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        id: workspaceId,
        organizationId: organization.id,
        name: 'E2E Test Workspace',
        description: 'Workspace for E2E transcription testing',
      },
    });
  }

  console.log('\n✅ Workspace created:', workspace.name);
  console.log('   ID:', workspace.id);

  // Create some pre-built templates for testing
  const templates = [
    {
      name: 'E2E Test - Sales Call',
      description: 'Template for testing template application',
      category: 'sales',
      templateData: {
        sections: [
          {
            title: 'Meeting Overview',
            content: '**Meeting:** {{meeting_title}}\n**Date:** {{date}}\n**Duration:** {{duration}}'
          },
          {
            title: 'Key Discussion Points',
            content: '{{key_points}}'
          },
          {
            title: 'Action Items',
            content: '{{action_items}}'
          },
          {
            title: 'Next Steps',
            content: '{{next_steps}}'
          }
        ]
      },
      variables: ['{{meeting_title}}', '{{date}}', '{{duration}}', '{{key_points}}', '{{action_items}}', '{{next_steps}}'],
      tags: ['e2e-test', 'sales'],
    },
    {
      name: 'E2E Test - Meeting Summary',
      description: 'Basic meeting summary template',
      category: 'internal',
      templateData: {
        sections: [
          {
            title: 'Summary',
            content: '{{overview}}'
          },
          {
            title: 'Decisions Made',
            content: '{{decisions}}'
          },
          {
            title: 'Follow-up Items',
            content: '{{followups}}'
          }
        ]
      },
      variables: ['{{overview}}', '{{decisions}}', '{{followups}}'],
      tags: ['e2e-test', 'summary'],
    },
  ];

  for (const templateData of templates) {
    // Find existing template by name and org
    let template = await prisma.meetingTemplate.findFirst({
      where: {
        organizationId: organization.id,
        name: templateData.name,
      },
    });

    if (!template) {
      template = await prisma.meetingTemplate.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          type: 'custom',
          isPreBuilt: false,
          isActive: true,
          usageCount: 0,
          ...templateData,
        },
      });
    }
    console.log('\n✅ Template created:', template.name);
    console.log('   ID:', template.id);
  }

  // Print test credentials and instructions
  console.log('\n' + '='.repeat(70));
  console.log('🎉 E2E TRANSCRIPTION TEST ENVIRONMENT READY');
  console.log('='.repeat(70));

  console.log('\n📋 TEST CREDENTIALS:');
  console.log('   Email:    e2e-test@transcription.test');
  console.log('   Password: TestTranscribe123!');
  console.log('   Org ID:   ' + organization.id);
  console.log('   User ID:  ' + user.id);

  console.log('\n📖 API FLOW FOR E2E TESTING:');
  console.log('');
  console.log('1️⃣  LOGIN to get JWT token:');
  console.log('    POST /api/auth/login');
  console.log('    Body: { "email": "e2e-test@transcription.test", "password": "TestTranscribe123!" }');
  console.log('');
  console.log('2️⃣  UPLOAD MP3 for transcription:');
  console.log('    POST /api/recordings/upload');
  console.log('    Headers: Authorization: Bearer <token>');
  console.log('    Body: multipart/form-data with "file" field');
  console.log('    Optional: title, language (default: en), autoTranscribe (default: true)');
  console.log('');
  console.log('3️⃣  CHECK transcription status:');
  console.log('    GET /api/recordings');
  console.log('    GET /api/recordings/:id');
  console.log('    GET /api/transcriptions/meeting/:meetingId');
  console.log('');
  console.log('4️⃣  GET AI SUMMARY:');
  console.log('    POST /api/ai/super-summary');
  console.log('    Body: { "meetingIds": ["<meeting-id>"], "summaryType": "detailed" }');
  console.log('');
  console.log('5️⃣  LIST TEMPLATES:');
  console.log('    GET /api/templates');
  console.log('');
  console.log('6️⃣  APPLY TEMPLATE:');
  console.log('    POST /api/templates/:templateId/apply');
  console.log('    Body: { "meetingId": "<meeting-id>", "variableValues": {...} }');
  console.log('');
  console.log('='.repeat(70));

  await prisma.$disconnect();
}

seedE2ETranscriptionTest()
  .catch((error) => {
    console.error('❌ Error seeding E2E test environment:', error);
    process.exit(1);
  });
