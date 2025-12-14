#!/bin/bash

###############################################################################
# Database Backup Script for OpenMeet Platform
# Backs up PostgreSQL, MongoDB, and Redis data
###############################################################################

set -euo pipefail

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/openmeet}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-openmeet-backups}"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"

# Database credentials
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-openmeet}"

MONGODB_HOST="${MONGODB_HOST:-localhost}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGODB_DB="${MONGODB_DB:-openmeet}"

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Error handler
error_exit() {
    log "ERROR: $1"
    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"❌ Backup failed: $1\"}"
    fi
    exit 1
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting backup process..."

# Backup PostgreSQL
log "Backing up PostgreSQL database..."
POSTGRES_BACKUP_FILE="$BACKUP_DIR/postgres_${TIMESTAMP}.sql.gz"
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --format=custom \
    --compress=9 \
    --file="$POSTGRES_BACKUP_FILE" || error_exit "PostgreSQL backup failed"

log "PostgreSQL backup completed: $POSTGRES_BACKUP_FILE"

# Backup MongoDB
log "Backing up MongoDB database..."
MONGODB_BACKUP_DIR="$BACKUP_DIR/mongodb_${TIMESTAMP}"
mongodump \
    --host "$MONGODB_HOST" \
    --port "$MONGODB_PORT" \
    --db "$MONGODB_DB" \
    --out "$MONGODB_BACKUP_DIR" \
    --gzip || error_exit "MongoDB backup failed"

# Archive MongoDB backup
tar -czf "$MONGODB_BACKUP_DIR.tar.gz" -C "$BACKUP_DIR" "mongodb_${TIMESTAMP}"
rm -rf "$MONGODB_BACKUP_DIR"

log "MongoDB backup completed: $MONGODB_BACKUP_DIR.tar.gz"

# Backup Redis
log "Backing up Redis..."
REDIS_BACKUP_FILE="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$REDIS_BACKUP_FILE" || error_exit "Redis backup failed"

log "Redis backup completed: $REDIS_BACKUP_FILE"

# Upload to S3 (if configured)
if [ -n "$S3_BUCKET" ]; then
    log "Uploading backups to S3..."

    aws s3 cp "$POSTGRES_BACKUP_FILE" "s3://$S3_BUCKET/postgres/" || error_exit "S3 upload failed for PostgreSQL"
    aws s3 cp "$MONGODB_BACKUP_DIR.tar.gz" "s3://$S3_BUCKET/mongodb/" || error_exit "S3 upload failed for MongoDB"
    aws s3 cp "$REDIS_BACKUP_FILE" "s3://$S3_BUCKET/redis/" || error_exit "S3 upload failed for Redis"

    log "S3 upload completed"
fi

# Clean up old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +$RETENTION_DAYS -delete

# Calculate backup sizes
POSTGRES_SIZE=$(du -h "$POSTGRES_BACKUP_FILE" | cut -f1)
MONGODB_SIZE=$(du -h "$MONGODB_BACKUP_DIR.tar.gz" | cut -f1)
REDIS_SIZE=$(du -h "$REDIS_BACKUP_FILE" | cut -f1)

log "Backup completed successfully!"
log "PostgreSQL: $POSTGRES_SIZE"
log "MongoDB: $MONGODB_SIZE"
log "Redis: $REDIS_SIZE"

# Send success notification
if [ -n "$NOTIFICATION_WEBHOOK" ]; then
    curl -X POST "$NOTIFICATION_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{\"text\": \"✅ Backup completed successfully!\n- PostgreSQL: $POSTGRES_SIZE\n- MongoDB: $MONGODB_SIZE\n- Redis: $REDIS_SIZE\"}"
fi

exit 0
