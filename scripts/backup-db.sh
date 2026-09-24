#!/usr/bin/env bash
# CareerHub — PostgreSQL backup
# Usage (on the VPS, from the project root):
#   ./scripts/backup-db.sh
# Cron example — daily at 03:00:
#   0 3 * * * cd /opt/careerhub && ./scripts/backup-db.sh >> ./backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
RCLONE_TARGET="${BACKUP_RCLONE_TARGET:-}"
STAMP="$(date +%F_%H%M)"
TARGET="$BACKUP_DIR/careerhub_$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] dumping database..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-careerhub}" -d "${POSTGRES_DB:-careerhub}" \
  | gzip > "$TARGET"

SIZE=$(du -h "$TARGET" | cut -f1)
echo "[$(date -Is)] wrote $TARGET ($SIZE)"

# Optional off-site copy (rclone remote must be configured beforehand: rclone config)
if [ -n "$RCLONE_TARGET" ]; then
  echo "[$(date -Is)] uploading to $RCLONE_TARGET..."
  rclone copy "$TARGET" "$RCLONE_TARGET"
fi

# Retention: delete local dumps older than KEEP_DAYS
find "$BACKUP_DIR" -name 'careerhub_*.sql.gz' -mtime "+$KEEP_DAYS" -delete
echo "[$(date -Is)] done (kept last $KEEP_DAYS days of dumps)"
