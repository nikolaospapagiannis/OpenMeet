#!/bin/bash

###############################################################################
# MongoDB Backup Script for Disaster Recovery
# Features:
# - Full mongodump with compression
# - Oplog backup for PITR
# - S3 upload with encryption
# - Backup verification
###############################################################################

set -euo pipefail

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/openmeet/mongodb}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-openmeet-backups}"
S3_REGION="${S3_REGION:-us-east-1}"

# MongoDB credentials
MONGODB_HOST="${MONGODB_HOST:-mongodb.openmeet-production.svc.cluster.local}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGODB_DB="${MONGODB_DB:-openmeet}"
MONGODB_USER="${MONGODB_USER:-admin}"

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

log "Starting MongoDB backup..."

# Backup with oplog for PITR
BACKUP_PATH="$BACKUP_DIR/mongodb_${TIMESTAMP}"
mongodump \
    --host "$MONGODB_HOST" \
    --port "$MONGODB_PORT" \
    --username "$MONGODB_USER" \
    --password "$MONGODB_PASSWORD" \
    --db "$MONGODB_DB" \
    --out "$BACKUP_PATH" \
    --oplog \
    --gzip || error_exit "mongodump failed"

# Create archive
tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "mongodb_${TIMESTAMP}"
rm -rf "$BACKUP_PATH"

# Calculate checksum
CHECKSUM=$(sha256sum "$BACKUP_PATH.tar.gz" | awk '{print $1}')
echo "$CHECKSUM  $BACKUP_PATH.tar.gz" > "$BACKUP_PATH.tar.gz.sha256"

log "MongoDB backup completed: $(du -h $BACKUP_PATH.tar.gz | cut -f1)"

# Upload to S3
if [ -n "$S3_BUCKET" ]; then
    aws s3 cp "$BACKUP_PATH.tar.gz" "s3://$S3_BUCKET/mongodb/mongodb_${TIMESTAMP}.tar.gz" \
        --region "$S3_REGION" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 || error_exit "S3 upload failed"

    aws s3 cp "$BACKUP_PATH.tar.gz.sha256" "s3://$S3_BUCKET/mongodb/mongodb_${TIMESTAMP}.tar.gz.sha256" \
        --region "$S3_REGION" \
        --server-side-encryption AES256

    log "S3 upload completed"
fi

# Clean up old backups
find "$BACKUP_DIR" -name "mongodb_*.tar.gz" -mtime +$RETENTION_DAYS -delete

log "Backup process completed successfully"
exit 0
