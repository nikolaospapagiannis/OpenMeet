/**
 * Database Performance Configuration
 * Optimizes Prisma connection pooling, query performance, and database settings
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'database-performance' },
  transports: [new winston.transports.Console()],
});

/**
 * Connection Pool Configuration
 * Optimized for high-concurrency load testing scenarios
 */
export const connectionPoolConfig = {
  // Prisma connection pool settings
  prisma: {
    connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '100'), // Up from default 10
    poolTimeout: 60, // seconds
    idleInTransactionSessionTimeout: 60000, // 60 seconds in ms
    statementCacheSize: 500, // Cache prepared statements
  },

  // Raw PostgreSQL pool settings (for direct queries)
  postgres: {
    max: 100, // Maximum pool size
    min: 10, // Minimum idle connections
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 10000, // Fail fast on connection issues
    maxUses: 7500, // Recycle connections after 7500 uses
    allowExitOnIdle: false,

    // Connection configuration
    statement_timeout: 30000, // 30s query timeout
    query_timeout: 30000,
    idle_in_transaction_session_timeout: 60000,
  },
};

/**
 * Create optimized Prisma client with performance extensions
 */
export function createOptimizedPrismaClient(): PrismaClient {
  const prisma = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Log slow queries for optimization
  if (process.env.NODE_ENV !== 'production') {
    prisma.$on('query' as never, (e: Prisma.QueryEvent) => {
      if (e.duration > 1000) { // Log queries slower than 1s
        logger.warn('Slow query detected', {
          query: e.query,
          duration: `${e.duration}ms`,
          params: e.params,
        });
      }
    });
  }

  return prisma;
}

/**
 * Create optimized raw PostgreSQL pool
 * Use for bulk operations and performance-critical queries
 */
export function createPostgresPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ...connectionPoolConfig.postgres,
  });
}

/**
 * Database Query Optimization Utilities
 */
export class DatabaseOptimizer {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Analyze query performance with EXPLAIN ANALYZE
   */
  async analyzeQuery(query: string, params: any[] = []): Promise<any> {
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE) ${query}`;
      const result = await this.prisma.$queryRawUnsafe(explainQuery, ...params);

      logger.info('Query analysis:', { result });
      return result;
    } catch (error) {
      logger.error('Query analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats(): Promise<any> {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20;
      `;

      return stats;
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return null;
    }
  }

  /**
   * Get slow queries from pg_stat_statements
   */
  async getSlowQueries(limit = 20): Promise<any> {
    try {
      const queries = await this.prisma.$queryRaw`
        SELECT
          queryid,
          query,
          calls,
          total_exec_time::numeric(10,2) as total_time_ms,
          mean_exec_time::numeric(10,2) as avg_time_ms,
          max_exec_time::numeric(10,2) as max_time_ms,
          rows
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC
        LIMIT ${limit};
      `;

      return queries;
    } catch (error) {
      logger.warn('pg_stat_statements not available:', error);
      return [];
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_stat_user_indexes
        ORDER BY idx_scan ASC
        LIMIT 50;
      `;

      return stats;
    } catch (error) {
      logger.error('Failed to get index stats:', error);
      return [];
    }
  }

  /**
   * Get connection pool statistics
   */
  async getConnectionStats(): Promise<any> {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT
          datname,
          numbackends as active_connections,
          xact_commit as transactions_committed,
          xact_rollback as transactions_rolled_back,
          blks_read as blocks_read,
          blks_hit as blocks_hit,
          tup_returned as rows_returned,
          tup_fetched as rows_fetched,
          tup_inserted as rows_inserted,
          tup_updated as rows_updated,
          tup_deleted as rows_deleted,
          conflicts,
          temp_files,
          temp_bytes,
          deadlocks
        FROM pg_stat_database
        WHERE datname = current_database();
      `;

      return stats[0] || null;
    } catch (error) {
      logger.error('Failed to get connection stats:', error);
      return null;
    }
  }

  /**
   * Create missing indexes dynamically (use with caution)
   */
  async ensureOptimalIndexes(): Promise<void> {
    const indexDefinitions = [
      // Meeting performance indexes
      {
        table: 'Meeting',
        columns: ['organizationId', 'createdAt'],
        name: 'idx_meeting_org_created',
      },
      {
        table: 'Meeting',
        columns: ['userId', 'status'],
        name: 'idx_meeting_user_status',
      },
      {
        table: 'Meeting',
        columns: ['status', 'scheduledStartAt'],
        name: 'idx_meeting_status_scheduled',
      },

      // Transcript performance indexes
      {
        table: 'Transcript',
        columns: ['meetingId', 'createdAt'],
        name: 'idx_transcript_meeting_created',
      },

      // User activity indexes
      {
        table: 'User',
        columns: ['organizationId', 'isActive'],
        name: 'idx_user_org_active',
      },
      {
        table: 'User',
        columns: ['lastLoginAt'],
        name: 'idx_user_last_login',
      },

      // Search optimization indexes
      {
        table: 'MeetingSummary',
        columns: ['meetingId', 'summaryType'],
        name: 'idx_summary_meeting_type',
      },

      // Analytics indexes
      {
        table: 'UsageMetric',
        columns: ['organizationId', 'periodStart', 'periodEnd'],
        name: 'idx_usage_org_period',
      },

      // Session management
      {
        table: 'Session',
        columns: ['userId', 'expiresAt'],
        name: 'idx_session_user_expires',
      },

      // Video processing
      {
        table: 'Video',
        columns: ['organizationId', 'processingStatus'],
        name: 'idx_video_org_status',
      },
      {
        table: 'VideoClip',
        columns: ['videoId', 'category'],
        name: 'idx_clip_video_category',
      },

      // Live features
      {
        table: 'LiveSession',
        columns: ['meetingId', 'status', 'startedAt'],
        name: 'idx_live_meeting_status_started',
      },

      // Revenue intelligence
      {
        table: 'Deal',
        columns: ['organizationId', 'stage', 'expectedCloseDate'],
        name: 'idx_deal_org_stage_close',
      },
      {
        table: 'Scorecard',
        columns: ['organizationId', 'userId', 'createdAt'],
        name: 'idx_scorecard_org_user_created',
      },
    ];

    logger.info('Ensuring optimal indexes...');

    for (const idx of indexDefinitions) {
      try {
        const columnList = idx.columns.join(', ');
        const createIndexSQL = `
          CREATE INDEX CONCURRENTLY IF NOT EXISTS "${idx.name}"
          ON "${idx.table}" (${columnList});
        `;

        await this.prisma.$executeRawUnsafe(createIndexSQL);
        logger.info(`Created index: ${idx.name} on ${idx.table}(${columnList})`);
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          logger.error(`Failed to create index ${idx.name}:`, error);
        }
      }
    }

    logger.info('Index optimization complete');
  }

  /**
   * Run VACUUM ANALYZE for query planner optimization
   */
  async optimizeQueryPlanner(): Promise<void> {
    try {
      logger.info('Running VACUUM ANALYZE...');

      // This updates statistics for the query planner
      await this.prisma.$executeRaw`ANALYZE;`;

      logger.info('Query planner optimization complete');
    } catch (error) {
      logger.error('Failed to optimize query planner:', error);
    }
  }

  /**
   * Monitor and report on cache hit ratio
   */
  async getCacheHitRatio(): Promise<number> {
    try {
      const result: any = await this.prisma.$queryRaw`
        SELECT
          sum(heap_blks_read) as heap_read,
          sum(heap_blks_hit) as heap_hit,
          sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 as ratio
        FROM pg_statio_user_tables;
      `;

      const ratio = parseFloat(result[0]?.ratio || '0');
      logger.info(`Database cache hit ratio: ${ratio.toFixed(2)}%`);

      if (ratio < 90) {
        logger.warn('Cache hit ratio is below 90% - consider increasing shared_buffers');
      }

      return ratio;
    } catch (error) {
      logger.error('Failed to get cache hit ratio:', error);
      return 0;
    }
  }
}

/**
 * Recommended PostgreSQL server settings for high performance
 * Add these to postgresql.conf or set via ALTER SYSTEM
 */
export const recommendedPostgresSettings = {
  // Memory settings
  shared_buffers: '4GB', // 25% of total RAM
  effective_cache_size: '12GB', // 75% of total RAM
  work_mem: '64MB', // Per operation memory
  maintenance_work_mem: '512MB',

  // Connection settings
  max_connections: 200,
  superuser_reserved_connections: 3,

  // Write-ahead log
  wal_buffers: '16MB',
  min_wal_size: '1GB',
  max_wal_size: '4GB',
  wal_compression: 'on',

  // Query planner
  random_page_cost: 1.1, // For SSD storage
  effective_io_concurrency: 200,

  // Checkpoints
  checkpoint_completion_target: 0.9,
  checkpoint_timeout: '15min',

  // Logging
  log_min_duration_statement: 1000, // Log queries > 1s
  log_lock_waits: 'on',
  log_temp_files: 0,

  // Autovacuum (critical for performance)
  autovacuum: 'on',
  autovacuum_max_workers: 4,
  autovacuum_naptime: '10s',

  // Statistics
  track_activities: 'on',
  track_counts: 'on',
  track_io_timing: 'on',
  track_functions: 'all',

  // Extensions
  shared_preload_libraries: 'pg_stat_statements',
};

/**
 * Export singleton instance
 */
let optimizerInstance: DatabaseOptimizer | null = null;

export function getDatabaseOptimizer(prisma: PrismaClient): DatabaseOptimizer {
  if (!optimizerInstance) {
    optimizerInstance = new DatabaseOptimizer(prisma);
  }
  return optimizerInstance;
}

/**
 * Initialize database performance monitoring
 */
export async function initializeDatabasePerformance(prisma: PrismaClient): Promise<void> {
  const optimizer = getDatabaseOptimizer(prisma);

  // Log initial stats
  logger.info('Initializing database performance monitoring...');

  try {
    const cacheHitRatio = await optimizer.getCacheHitRatio();
    const connectionStats = await optimizer.getConnectionStats();

    logger.info('Database initialization complete', {
      cacheHitRatio: `${cacheHitRatio.toFixed(2)}%`,
      activeConnections: connectionStats?.active_connections || 0,
    });

    // Ensure optimal indexes (run once on startup)
    if (process.env.AUTO_CREATE_INDEXES === 'true') {
      await optimizer.ensureOptimalIndexes();
    }

    // Run query planner optimization
    await optimizer.optimizeQueryPlanner();
  } catch (error) {
    logger.error('Database initialization failed:', error);
  }
}
