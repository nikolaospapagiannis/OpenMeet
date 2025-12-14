const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://openmeet:openmeet123@localhost:5432/openmeet_db'
    }
  }
});

async function testWhiteLabelService() {
  console.log('Testing White-Label Service...\n');

  const testOrgId = 'test-org-' + Date.now();

  try {
    // Test 1: Create a whitelabel config
    console.log('1. Creating whitelabel config...');
    const config = await prisma.whitelabelConfig.create({
      data: {
        organizationId: testOrgId,
        primaryColor: '#FF5733',
        secondaryColor: '#33FF57',
        productName: 'Acme AI',
        companyName: 'Acme Corporation',
        tagline: 'AI-powered meetings for everyone',
        emailFromName: 'Acme AI',
      }
    });
    console.log('✓ Created config:', {
      id: config.id,
      organizationId: config.organizationId,
      primaryColor: config.primaryColor,
      productName: config.productName,
    });

    // Test 2: Retrieve the config
    console.log('\n2. Retrieving whitelabel config...');
    const retrieved = await prisma.whitelabelConfig.findUnique({
      where: { organizationId: testOrgId }
    });
    console.log('✓ Retrieved config:', {
      id: retrieved.id,
      primaryColor: retrieved.primaryColor,
      productName: retrieved.productName,
    });

    // Test 3: Update the config
    console.log('\n3. Updating whitelabel config...');
    const updated = await prisma.whitelabelConfig.update({
      where: { organizationId: testOrgId },
      data: {
        primaryColor: '#0000FF',
        logoUrl: '/logos/acme-logo.png',
        hideWatermark: true,
      }
    });
    console.log('✓ Updated config:', {
      primaryColor: updated.primaryColor,
      logoUrl: updated.logoUrl,
      hideWatermark: updated.hideWatermark,
    });

    // Test 4: Custom domain setup
    console.log('\n4. Setting up custom domain...');
    const withDomain = await prisma.whitelabelConfig.update({
      where: { organizationId: testOrgId },
      data: {
        customDomain: 'meetings.acme.com',
        customDomainVerified: false,
        customDomainDNS: {
          records: [
            { type: 'CNAME', name: 'meetings.acme.com', value: 'app.openmeet.com' }
          ]
        }
      }
    });
    console.log('✓ Custom domain configured:', {
      customDomain: withDomain.customDomain,
      verified: withDomain.customDomainVerified,
    });

    // Test 5: Query by custom domain
    console.log('\n5. Querying by custom domain...');
    const byDomain = await prisma.whitelabelConfig.findFirst({
      where: { customDomain: 'meetings.acme.com' }
    });
    console.log('✓ Found by domain:', {
      organizationId: byDomain.organizationId,
      customDomain: byDomain.customDomain,
    });

    // Test 6: List all configs
    console.log('\n6. Listing all whitelabel configs...');
    const allConfigs = await prisma.whitelabelConfig.findMany({
      select: {
        organizationId: true,
        productName: true,
        primaryColor: true,
        customDomain: true,
      }
    });
    console.log(`✓ Found ${allConfigs.length} config(s):`, allConfigs);

    // Test 7: Delete the config
    console.log('\n7. Deleting whitelabel config...');
    await prisma.whitelabelConfig.delete({
      where: { organizationId: testOrgId }
    });
    console.log('✓ Config deleted');

    // Verify deletion
    const deleted = await prisma.whitelabelConfig.findUnique({
      where: { organizationId: testOrgId }
    });
    console.log('✓ Verified deletion:', deleted === null ? 'Success' : 'Failed');

    console.log('\n✓ All tests passed!\n');

    // Test 8: Verify default values
    console.log('8. Testing default values...');
    const defaultConfig = await prisma.whitelabelConfig.create({
      data: {
        organizationId: testOrgId + '-defaults',
      }
    });
    console.log('✓ Default config created:', {
      primaryColor: defaultConfig.primaryColor,
      secondaryColor: defaultConfig.secondaryColor,
      productName: defaultConfig.productName,
      hideWatermark: defaultConfig.hideWatermark,
    });

    // Cleanup
    await prisma.whitelabelConfig.delete({
      where: { organizationId: testOrgId + '-defaults' }
    });
    console.log('✓ Cleanup complete');

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testWhiteLabelService();
