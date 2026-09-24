#!/usr/bin/env bash
# CareerHub — stack health check
# Usage:
#   ./scripts/health-check.sh              # dev compose
#   COMPOSE_FILE=docker-compose.prod.yml ./scripts/health-check.sh
set -uo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
FAIL=0

echo "== containers =="
docker compose -f "$COMPOSE_FILE" ps --format 'table {{.Name}}\t{{.Status}}' || FAIL=1

echo "== api /health =="
if docker compose -f "$COMPOSE_FILE" exec -T api node -e \
  "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
  echo "api: healthy"
else
  echo "api: UNHEALTHY"; FAIL=1
fi

echo "== web (nginx) =="
WEB_CTR="$(docker compose -f "$COMPOSE_FILE" ps -q web 2>/dev/null)"
if [ -n "$WEB_CTR" ] && docker exec "$WEB_CTR" wget -q -O /dev/null http://localhost:80/ 2>/dev/null; then
  echo "web: serving"
else
  echo "web: NOT RESPONDING"; FAIL=1
fi

echo "== database =="
if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-careerhub}" -d "${POSTGRES_DB:-careerhub}" > /dev/null 2>&1; then
  echo "postgres: accepting connections"
else
  echo "postgres: NOT READY"; FAIL=1
fi

[ "$FAIL" = 0 ] && echo "ALL GOOD ✅" || { echo "PROBLEMS FOUND ❌"; exit 1; }
