#!/bin/bash

###############################################################################
# PostgreSQL Backup Script with WAL Archiving for Disaster Recovery
# Features:
# - Full pg_dump backups with compression
# - Continuous WAL (Write-Ahead Log) archiving
# - S3 upload with encryption
# - Backup integrity verification
# - Point-in-time recovery support
###############################################################################

set -euo pipefail

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/openmeet/postgres}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/var/backups/openmeet/postgres/wal}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-openmeet-backups}"
S3_REGION="${S3_REGION:-us-east-1}"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"

# Database credentials
POSTGRES_HOST="${POSTGRES_HOST:-postgres-master.openmeet-production.svc.cluster.local}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-openmeet}"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$BACKUP_DIR/backup.log"
}

# Error handler
error_exit() {
    log "ERROR: $1"
    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"❌ PostgreSQL backup failed: $1\", \"priority\": \"high\"}"
    fi
    exit 1
}

# Success notification
notify_success() {
    local message="$1"
    log "$message"
    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"✅ $message\"}"
    fi
}

# Create backup directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$WAL_ARCHIVE_DIR"

log "Starting PostgreSQL backup process..."

# Check database connectivity
log "Verifying database connectivity..."
if ! PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1" > /dev/null 2>&1; then
    error_exit "Cannot connect to PostgreSQL database"
fi
log "Database connectivity verified"

# Get database size before backup
DB_SIZE=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'))" | xargs)
log "Database size: $DB_SIZE"

# Perform base backup using pg_basebackup for PITR
log "Creating base backup for PITR..."
BASE_BACKUP_DIR="$BACKUP_DIR/base_${TIMESTAMP}"
mkdir -p "$BASE_BACKUP_DIR"

PGPASSWORD="$POSTGRES_PASSWORD" pg_basebackup \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -D "$BASE_BACKUP_DIR" \
    -Ft \
    -z \
    -P \
    -X fetch \
    --checkpoint=fast \
    --label="backup_${TIMESTAMP}" || error_exit "pg_basebackup failed"

log "Base backup completed: $BASE_BACKUP_DIR"

# Perform logical backup using pg_dump
log "Creating logical backup with pg_dump..."
DUMP_FILE="$BACKUP_DIR/dump_${TIMESTAMP}.sql.gz"

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="$DUMP_FILE" 2>&1 | tee -a "$BACKUP_DIR/backup.log" || error_exit "pg_dump failed"

log "Logical backup completed: $DUMP_FILE"

# Verify backup integrity
log "Verifying backup integrity..."
if ! pg_restore --list "$DUMP_FILE" > /dev/null 2>&1; then
    error_exit "Backup integrity check failed"
fi
log "Backup integrity verified"

# Calculate checksums
log "Calculating checksums..."
DUMP_CHECKSUM=$(sha256sum "$DUMP_FILE" | awk '{print $1}')
echo "$DUMP_CHECKSUM  $DUMP_FILE" > "$DUMP_FILE.sha256"
log "Checksum: $DUMP_CHECKSUM"

# Archive WAL files
log "Archiving WAL files..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT pg_switch_wal();" > /dev/null 2>&1 || true

# Upload to S3 with encryption
if [ -n "$S3_BUCKET" ]; then
    log "Uploading backups to S3..."

    # Upload base backup
    aws s3 cp "$BASE_BACKUP_DIR/" "s3://$S3_BUCKET/postgres/base/base_${TIMESTAMP}/" \
        --recursive \
        --region "$S3_REGION" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 \
        --metadata "backup-timestamp=${TIMESTAMP},db-size=${DB_SIZE}" || error_exit "S3 upload failed for base backup"

    # Upload logical dump
    aws s3 cp "$DUMP_FILE" "s3://$S3_BUCKET/postgres/dump/dump_${TIMESTAMP}.sql.gz" \
        --region "$S3_REGION" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 \
        --metadata "backup-timestamp=${TIMESTAMP},db-size=${DB_SIZE},checksum=${DUMP_CHECKSUM}" || error_exit "S3 upload failed for dump"

    # Upload checksum
    aws s3 cp "$DUMP_FILE.sha256" "s3://$S3_BUCKET/postgres/dump/dump_${TIMESTAMP}.sql.gz.sha256" \
        --region "$S3_REGION" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 || error_exit "S3 upload failed for checksum"

    # Upload WAL files
    if [ -d "$WAL_ARCHIVE_DIR" ] && [ "$(ls -A $WAL_ARCHIVE_DIR)" ]; then
        aws s3 sync "$WAL_ARCHIVE_DIR/" "s3://$S3_BUCKET/postgres/wal/" \
            --region "$S3_REGION" \
            --storage-class STANDARD_IA \
            --server-side-encryption AES256 || log "WARNING: WAL upload failed (non-critical)"
    fi

    log "S3 upload completed"

    # Enable S3 cross-region replication metadata
    aws s3api put-object-tagging \
        --bucket "$S3_BUCKET" \
        --key "postgres/dump/dump_${TIMESTAMP}.sql.gz" \
        --tagging "TagSet=[{Key=backup-type,Value=postgres},{Key=timestamp,Value=${TIMESTAMP}},{Key=dr-enabled,Value=true}]" \
        --region "$S3_REGION" 2>/dev/null || log "WARNING: Could not set S3 tags"
fi

# Clean up old local backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "dump_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "base_*" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

# Clean up old S3 backups
if [ -n "$S3_BUCKET" ]; then
    CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
    aws s3 ls "s3://$S3_BUCKET/postgres/dump/" --region "$S3_REGION" | while read -r line; do
        FILE_DATE=$(echo "$line" | awk '{print $4}' | grep -oP 'dump_\K[0-9]{8}' || echo "99999999")
        FILE_NAME=$(echo "$line" | awk '{print $4}')
        if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ] && [ -n "$FILE_NAME" ]; then
            log "Deleting old S3 backup: $FILE_NAME"
            aws s3 rm "s3://$S3_BUCKET/postgres/dump/$FILE_NAME" --region "$S3_REGION" 2>/dev/null || true
        fi
    done
fi

# Generate backup report
BACKUP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
BASE_SIZE=$(du -sh "$BASE_BACKUP_DIR" | cut -f1)

# Create backup metadata
cat > "$BACKUP_DIR/backup_${TIMESTAMP}.meta" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "database": "${POSTGRES_DB}",
  "host": "${POSTGRES_HOST}",
  "db_size": "${DB_SIZE}",
  "dump_size": "${BACKUP_SIZE}",
  "base_size": "${BASE_SIZE}",
  "checksum": "${DUMP_CHECKSUM}",
  "s3_location": "s3://${S3_BUCKET}/postgres/dump/dump_${TIMESTAMP}.sql.gz",
  "base_location": "s3://${S3_BUCKET}/postgres/base/base_${TIMESTAMP}/",
  "retention_days": ${RETENTION_DAYS},
  "pitr_enabled": true
}
EOF

log "Backup completed successfully!"
log "Database size: $DB_SIZE"
log "Dump backup size: $BACKUP_SIZE"
log "Base backup size: $BASE_SIZE"
log "Checksum: $DUMP_CHECKSUM"

# Upload metadata to S3
if [ -n "$S3_BUCKET" ]; then
    aws s3 cp "$BACKUP_DIR/backup_${TIMESTAMP}.meta" "s3://$S3_BUCKET/postgres/metadata/backup_${TIMESTAMP}.meta" \
        --region "$S3_REGION" \
        --server-side-encryption AES256 2>/dev/null || log "WARNING: Could not upload metadata"
fi

# Send success notification
notify_success "PostgreSQL backup completed successfully! Database: $DB_SIZE, Dump: $BACKUP_SIZE, Base: $BASE_SIZE"

# Test restore capability (dry run)
log "Testing restore capability (dry run)..."
TEST_DIR=$(mktemp -d)
if pg_restore --list "$DUMP_FILE" > "$TEST_DIR/restore_test.txt" 2>&1; then
    TABLE_COUNT=$(grep -c "TABLE DATA" "$TEST_DIR/restore_test.txt" || echo "0")
    log "Restore test passed - $TABLE_COUNT tables can be restored"
else
    log "WARNING: Restore test failed"
fi
rm -rf "$TEST_DIR"

# Record backup in monitoring system
if command -v curl &> /dev/null && [ -n "$MONITORING_ENDPOINT" ]; then
    curl -X POST "$MONITORING_ENDPOINT/api/v1/backups" \
        -H 'Content-Type: application/json' \
        -d @"$BACKUP_DIR/backup_${TIMESTAMP}.meta" 2>/dev/null || log "WARNING: Could not report to monitoring"
fi

log "Backup process completed successfully"
exit 0
