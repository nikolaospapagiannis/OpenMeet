#!/bin/bash

###############################################################################
# Redis Restore Script
###############################################################################

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/openmeet/redis}"
S3_BUCKET="${S3_BUCKET:-openmeet-backups}"
S3_REGION="${S3_REGION:-us-east-1}"
RESTORE_DIR="${RESTORE_DIR:-/tmp/redis_restore}"

REDIS_HOST="${REDIS_HOST:-redis-master.openmeet-production.svc.cluster.local}"
REDIS_PORT="${REDIS_PORT:-6379}"

usage() {
    echo "Usage: $0 --timestamp YYYYMMDD_HHMMSS [--source local|s3]"
    exit 1
}

TIMESTAMP=""
SOURCE="s3"

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--timestamp) TIMESTAMP="$2"; shift 2 ;;
        -s|--source) SOURCE="$2"; shift 2 ;;
        *) usage ;;
    esac
done

[ -z "$TIMESTAMP" ] && usage

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

mkdir -p "$RESTORE_DIR"

log "Starting Redis restore..."

# Download from S3
if [ "$SOURCE" == "s3" ]; then
    log "Downloading backup from S3..."
    BACKUP_FILE="$RESTORE_DIR/redis_${TIMESTAMP}.rdb.gz"

    aws s3 cp "s3://$S3_BUCKET/redis/redis_${TIMESTAMP}.rdb.gz" "$BACKUP_FILE" \
        --region "$S3_REGION" || error_exit "S3 download failed"

    # Verify checksum
    aws s3 cp "s3://$S3_BUCKET/redis/redis_${TIMESTAMP}.rdb.gz.sha256" "$BACKUP_FILE.sha256" \
        --region "$S3_REGION"

    if ! sha256sum -c "$BACKUP_FILE.sha256"; then
        error_exit "Checksum verification failed"
    fi
    log "✅ Checksum verified"

    # Decompress
    gunzip "$BACKUP_FILE"
    RDB_FILE="${BACKUP_FILE%.gz}"
else
    RDB_FILE="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
    [ ! -f "$RDB_FILE" ] && error_exit "Backup not found: $RDB_FILE"
fi

# Get current key count
KEYS_BEFORE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" DBSIZE | cut -d: -f2)
log "Current keys: $KEYS_BEFORE"

# Flush database (WARNING: This deletes all data)
log "⚠️  WARNING: Flushing Redis database in 5 seconds..."
sleep 5

redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" FLUSHALL || error_exit "FLUSHALL failed"

# Stop Redis writes
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" CONFIG SET stop-writes-on-bgsave-error no

# Copy RDB file to Redis data directory
# This requires kubectl access to the Redis pod
POD_NAME=$(kubectl get pods -n openmeet-production -l app=redis,role=master -o jsonpath='{.items[0].metadata.name}')

log "Copying RDB file to Redis pod: $POD_NAME..."
kubectl cp "$RDB_FILE" "openmeet-production/$POD_NAME:/data/dump.rdb"

# Restart Redis to load the RDB file
log "Restarting Redis pod..."
kubectl delete pod -n openmeet-production "$POD_NAME"

# Wait for pod to be ready
log "Waiting for Redis to be ready..."
kubectl wait --for=condition=ready pod -n openmeet-production -l app=redis,role=master --timeout=60s

# Verify restore
KEYS_AFTER=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" DBSIZE | cut -d: -f2)
log "Restored keys: $KEYS_AFTER"

log "✅ Redis restore completed"
exit 0
