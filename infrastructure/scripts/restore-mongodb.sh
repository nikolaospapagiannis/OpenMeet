#!/bin/bash

###############################################################################
# MongoDB Restore Script with Point-in-Time Recovery
###############################################################################

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/openmeet/mongodb}"
S3_BUCKET="${S3_BUCKET:-openmeet-backups}"
S3_REGION="${S3_REGION:-us-east-1}"
RESTORE_DIR="${RESTORE_DIR:-/tmp/mongodb_restore}"

MONGODB_HOST="${MONGODB_HOST:-mongodb.openmeet-production.svc.cluster.local}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGODB_DB="${MONGODB_DB:-openmeet}"
MONGODB_USER="${MONGODB_USER:-admin}"

usage() {
    echo "Usage: $0 --timestamp YYYYMMDD_HHMMSS [--source local|s3] [--drop]"
    exit 1
}

TIMESTAMP=""
SOURCE="s3"
DROP_DATABASE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--timestamp) TIMESTAMP="$2"; shift 2 ;;
        -s|--source) SOURCE="$2"; shift 2 ;;
        --drop) DROP_DATABASE=true; shift ;;
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

log "Starting MongoDB restore..."
log "Timestamp: $TIMESTAMP"

# Download from S3
if [ "$SOURCE" == "s3" ]; then
    log "Downloading backup from S3..."
    BACKUP_FILE="$RESTORE_DIR/mongodb_${TIMESTAMP}.tar.gz"

    aws s3 cp "s3://$S3_BUCKET/mongodb/mongodb_${TIMESTAMP}.tar.gz" "$BACKUP_FILE" \
        --region "$S3_REGION" || error_exit "S3 download failed"

    # Verify checksum
    aws s3 cp "s3://$S3_BUCKET/mongodb/mongodb_${TIMESTAMP}.tar.gz.sha256" "$BACKUP_FILE.sha256" \
        --region "$S3_REGION"

    if ! sha256sum -c "$BACKUP_FILE.sha256"; then
        error_exit "Checksum verification failed"
    fi
    log "✅ Checksum verified"

    # Extract
    tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"
    BACKUP_PATH="$RESTORE_DIR/mongodb_${TIMESTAMP}"
else
    BACKUP_PATH="$BACKUP_DIR/mongodb_${TIMESTAMP}"
    [ ! -d "$BACKUP_PATH" ] && error_exit "Backup not found: $BACKUP_PATH"
fi

# Drop database if requested
if [ "$DROP_DATABASE" == "true" ]; then
    log "Dropping database $MONGODB_DB..."
    mongosh --host "$MONGODB_HOST" --port "$MONGODB_PORT" -u "$MONGODB_USER" -p "$MONGODB_PASSWORD" --authenticationDatabase admin <<EOF
use $MONGODB_DB
db.dropDatabase()
EOF
fi

# Restore
log "Restoring MongoDB database..."
START_TIME=$(date +%s)

mongorestore \
    --host "$MONGODB_HOST" \
    --port "$MONGODB_PORT" \
    --username "$MONGODB_USER" \
    --password "$MONGODB_PASSWORD" \
    --authenticationDatabase admin \
    --db "$MONGODB_DB" \
    --gzip \
    --oplogReplay \
    --drop \
    "$BACKUP_PATH/$MONGODB_DB" || error_exit "mongorestore failed"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log "✅ MongoDB restore completed in ${DURATION}s"

# Verify
COLLECTION_COUNT=$(mongosh --host "$MONGODB_HOST" --port "$MONGODB_PORT" -u "$MONGODB_USER" -p "$MONGODB_PASSWORD" --authenticationDatabase admin --quiet --eval "db.getMongo().getDB('$MONGODB_DB').getCollectionNames().length")
log "Restored collections: $COLLECTION_COUNT"

exit 0
