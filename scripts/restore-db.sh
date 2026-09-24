#!/usr/bin/env bash
# CareerHub — restore a database dump
# Usage:
#   ./scripts/restore-db.sh backups/careerhub_2026-09-23_0300.sql.gz
# WARNING: replaces ALL current data. The API will be stopped during restore.
set -euo pipefail
cd "$(dirname "$0")/.."

DUMP="${1:?Usage: ./scripts/restore-db.sh <path-to-.sql.gz>}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

[ -f "$DUMP" ] || { echo "Dump not found: $DUMP" >&2; exit 1; }

echo ">> stopping api (web stays up but DB writes will fail)..."
docker compose -f "$COMPOSE_FILE" stop api

echo ">> dropping and recreating database..."
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "${POSTGRES_USER:-careerhub}" -d postgres <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB:-careerhub}';
DROP DATABASE IF EXISTS "${POSTGRES_DB:-careerhub}";
CREATE DATABASE "${POSTGRES_DB:-careerhub}";
SQL

echo ">> restoring $DUMP..."
gunzip -c "$DUMP" | docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "${POSTGRES_USER:-careerhub}" -d "${POSTGRES_DB:-careerhub}" -q

echo ">> starting api again (runs migrate deploy automatically)..."
docker compose -f "$COMPOSE_FILE" up -d api

echo ">> done."
