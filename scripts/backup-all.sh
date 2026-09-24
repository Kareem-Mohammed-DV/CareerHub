#!/usr/bin/env bash
# CareerHub — full backup: PostgreSQL dump + all uploaded CV files in one tar.gz
# Usage (on the VPS, from the project root):
#   ./scripts/backup-all.sh
# Cron example — daily at 03:00:
#   0 3 * * * cd /opt/careerhub && ./scripts/backup-all.sh >> ./backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
RCLONE_TARGET="${BACKUP_RCLONE_TARGET:-}"
STAMP="$(date +%F_%H%M)"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] backing up database..."
./scripts/backup-db.sh

echo "[$(date -Is)] backing up uploaded CV files..."
RESUMES_TAR="$BACKUP_DIR/resumes_$STAMP.tar.gz"
docker compose -f "$COMPOSE_FILE" exec -T api tar czf - -C /app/uploads resumes > "$RESUMES_TAR"
echo "[$(date -Is)] wrote $RESUMES_TAR ($(du -h "$RESUMES_TAR" | cut -f1))"

# Optional off-site copy (configure once with: rclone config)
if [ -n "$RCLONE_TARGET" ]; then
  echo "[$(date -Is)] uploading to $RCLONE_TARGET..."
  rclone copy "$BACKUP_DIR" "$RCLONE_TARGET" --include 'careerhub_*.sql.gz' --include 'resumes_*.tar.gz'
fi

# Retention: delete local archives older than KEEP_DAYS
find "$BACKUP_DIR" -name 'careerhub_*.sql.gz' -mtime "+$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'resumes_*.tar.gz' -mtime "+$KEEP_DAYS" -delete
echo "[$(date -Is)] done (kept last $KEEP_DAYS days of backups)"
