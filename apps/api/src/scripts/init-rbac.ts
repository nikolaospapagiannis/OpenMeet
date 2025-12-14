/**
 * RBAC Initialization Script
 * Run this script to initialize the RBAC system:
 * - Create all system permissions
 * - Create default roles (Owner, Admin, Member, Guest)
 * - Assign permissions to roles
 *
 * Usage: npx ts-node src/scripts/init-rbac.ts
 */

import { PrismaClient } from '@prisma/client';
import RBACService from '../services/rbac-service';
import winston from 'winston';

const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

async function initializeRBAC() {
  try {
    logger.info('Starting RBAC initialization...');

    // Initialize RBAC system
    await RBACService.initialize();

    logger.info('✓ RBAC initialization complete!');

    // Print summary
    const permissionCount = await prisma.permission.count();
    const roleCount = await prisma.role.count();

    logger.info('\n📊 Summary:');
    logger.info(`  • Permissions created: ${permissionCount}`);
    logger.info(`  • Roles created: ${roleCount}`);

    // List roles
    const roles = await prisma.role.findMany({
      where: { isSystem: true },
      include: {
        _count: {
          select: {
            permissions: true,
          },
        },
      },
      orderBy: { priority: 'desc' },
    });

    logger.info('\n🔐 System Roles:');
    for (const role of roles) {
      logger.info(`  • ${role.name} (${role._count.permissions} permissions)`);
    }

    logger.info('\n✅ RBAC system is ready!');
  } catch (error) {
    logger.error('❌ RBAC initialization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run initialization
initializeRBAC();
