import { PrismaClient } from '@prisma/client';
import { seedPart1, part1Apps } from './seed-ai-apps';
import { seedPart2, part2Apps } from './seed-ai-apps-part2';
import { seedPart3, part3Apps } from './seed-ai-apps-part3';

const prisma = new PrismaClient();

async function seedAllAIApps() {
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 OpenMeet - AI Apps Database Seeder');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Seed Part 1: Healthcare, Legal, Finance (22 apps)
    console.log('📦 Part 1: Healthcare, Legal, Finance');
    console.log('───────────────────────────────────────────────────────────────');
    await seedPart1();
    console.log('');

    // Seed Part 2: Technology, Sales/Marketing, HR/Operations (22 apps)
    console.log('📦 Part 2: Technology, Sales/Marketing, HR/Operations');
    console.log('───────────────────────────────────────────────────────────────');
    await seedPart2();
    console.log('');

    // Seed Part 3: Education, Consulting, Manufacturing, Productivity (26 apps)
    console.log('📦 Part 3: Education, Consulting, Manufacturing, Productivity');
    console.log('───────────────────────────────────────────────────────────────');
    await seedPart3();
    console.log('');

    // Summary
    const totalApps = part1Apps.length + part2Apps.length + part3Apps.length;
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ AI Apps Seeding Complete!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Part 1 (Healthcare, Legal, Finance):           ${part1Apps.length} apps`);
    console.log(`   Part 2 (Technology, Sales, HR):                ${part2Apps.length} apps`);
    console.log(`   Part 3 (Education, Consulting, Mfg, Prod):     ${part3Apps.length} apps`);
    console.log('   ─────────────────────────────────────────────────────────');
    console.log(`   Total AI Apps Seeded:                          ${totalApps} apps`);
    console.log('');
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📅 Completed at: ${new Date().toISOString()}`);
    console.log('');

    // Verify count in database
    const dbCount = await prisma.aIApp.count();
    console.log(`🔍 Verification: ${dbCount} AI Apps in database`);

    if (dbCount === totalApps) {
      console.log('✅ All apps successfully seeded!');
    } else {
      console.log(`⚠️  Expected ${totalApps}, found ${dbCount} - some apps may have failed`);
    }

  } catch (error) {
    console.error('');
    console.error('❌ Error during seeding:');
    console.error(error);
    throw error;
  }
}

// Export for use in main seed.ts
export { seedAllAIApps };

// Run if executed directly
if (require.main === module) {
  seedAllAIApps()
    .then(() => {
      console.log('');
      console.log('🎉 Seeding completed successfully!');
      return prisma.$disconnect();
    })
    .catch((e) => {
      console.error('Fatal error:', e);
      prisma.$disconnect();
      process.exit(1);
    });
}
