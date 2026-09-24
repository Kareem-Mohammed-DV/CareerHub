#!/usr/bin/env bash
# CareerHub — restore uploaded CV files from a resumes backup tarball
# Usage:
#   ./scripts/restore-resumes.sh backups/resumes_2026-09-24_0300.tar.gz
# Note: existing files with the same path are overwritten; other files are kept.
set -euo pipefail
cd "$(dirname "$0")/.."

DUMP="${1:?Usage: ./scripts/restore-resumes.sh <path-to-resumes_*.tar.gz>}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

[ -f "$DUMP" ] || { echo "Backup not found: $DUMP" >&2; exit 1; }

echo ">> copying archive into the api container..."
docker compose -f "$COMPOSE_FILE" cp "$DUMP" api:/tmp/resumes_restore.tar.gz

echo ">> extracting over /app/uploads (existing files are overwritten)..."
docker compose -f "$COMPOSE_FILE" exec -T api sh -c "tar xzf /tmp/resumes_restore.tar.gz -C /app/uploads && rm /tmp/resumes_restore.tar.gz"

echo ">> done. CV files restored."
