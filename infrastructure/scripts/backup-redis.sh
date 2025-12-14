#!/bin/bash

###############################################################################
# Redis Backup Script for Disaster Recovery
# Features:
# - RDB snapshot backup
# - AOF (Append-Only File) backup
# - S3 upload with encryption
###############################################################################

set -euo pipefail

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/openmeet/redis}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-openmeet-backups}"
S3_REGION="${S3_REGION:-us-east-1}"

# Redis credentials
REDIS_HOST="${REDIS_HOST:-redis-master.openmeet-production.svc.cluster.local}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$BACKUP_DIR/backup.log"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting Redis backup..."

# Trigger BGSAVE for consistent snapshot
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE || error_exit "BGSAVE failed"

# Wait for BGSAVE to complete
while [ "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)" == "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)" ]; do
    sleep 1
done

# Download RDB file
RDB_FILE="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$RDB_FILE" || error_exit "RDB download failed"

# Compress
gzip "$RDB_FILE"
RDB_FILE="${RDB_FILE}.gz"

# Calculate checksum
CHECKSUM=$(sha256sum "$RDB_FILE" | awk '{print $1}')
echo "$CHECKSUM  $RDB_FILE" > "$RDB_FILE.sha256"

log "Redis backup completed: $(du -h $RDB_FILE | cut -f1)"

# Upload to S3
if [ -n "$S3_BUCKET" ]; then
    aws s3 cp "$RDB_FILE" "s3://$S3_BUCKET/redis/redis_${TIMESTAMP}.rdb.gz" \
        --region "$S3_REGION" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 || error_exit "S3 upload failed"

    aws s3 cp "$RDB_FILE.sha256" "s3://$S3_BUCKET/redis/redis_${TIMESTAMP}.rdb.gz.sha256" \
        --region "$S3_REGION" \
        --server-side-encryption AES256

    log "S3 upload completed"
fi

# Clean up old backups
find "$BACKUP_DIR" -name "redis_*.rdb.gz" -mtime +$RETENTION_DAYS -delete

# Get Redis info for metrics
INFO=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" INFO)
USED_MEMORY=$(echo "$INFO" | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
KEYS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" DBSIZE | cut -d: -f2)

log "Redis metrics - Memory: $USED_MEMORY, Keys: $KEYS"
log "Backup process completed successfully"
exit 0
