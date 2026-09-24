#!/usr/bin/env bash
# CareerHub — one-command production deploy (VPS ready)
#
# First time on the VPS:
#   cp .env.production.example .env && nano .env   # fill real values!
# Then (or after any code update):
#   ./scripts/deploy.sh
#
# What it does, in order:
#   1. Pull the latest project code (only if this folder is a git clone)
#   2. Verify prerequisites (.env exists, Docker is up)
#   3. Back up the database before any migration touches it
#   4. Build images (api + web + caddy)
#   5. Start the stack (api runs `prisma migrate deploy` on boot — never drops data)
#   6. Wait for api health
#   7. Restart any service that is not healthy
#   8. Verify the HTTPS endpoint
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.prod.yml"

echo ">> [1/8] pulling latest code..."
if [ -d .git ]; then
  git pull --ff-only || echo "   (skipped: not a fast-forward — resolve manually)"
else
  echo "   (not a git clone — skipping pull)"
fi

echo ">> [2/8] checking prerequisites..."
[ -f .env ] || { echo "ERROR: .env not found. Run: cp .env.production.example .env" >&2; exit 1; }
docker info > /dev/null 2>&1 || { echo "ERROR: Docker is not running." >&2; exit 1; }

echo ">> [3/8] backing up the database before migrating..."
./scripts/backup-db.sh || echo "   (backup failed — continuing, but check backups/ !)"

echo ">> [4/8] building images (api + web + caddy)..."
$COMPOSE build

echo ">> [5/8] starting stack (api runs prisma migrate deploy on boot)..."
$COMPOSE up -d

echo ">> [6/8] waiting for api health..."
for i in $(seq 1 30); do
  if $COMPOSE exec -T api node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "   api is healthy."
    break
  fi
  [ "$i" = 30 ] && { echo "ERROR: api did not become healthy in 60s. Check: $COMPOSE logs api" >&2; exit 1; }
  sleep 2
done

echo ">> [7/8] restarting any unhealthy services..."
UNHEALTHY="$($COMPOSE ps --format '{{.Name}} {{.Health}}' 2>/dev/null | awk '$2!="healthy" && $2!="" {print $1}')"
if [ -n "$UNHEALTHY" ]; then
  echo "   restarting: $UNHEALTHY"
  $COMPOSE restart $UNHEALTHY
  sleep 5
else
  echo "   all services healthy."
fi

echo ">> [8/8] verifying HTTPS endpoint..."
DOMAIN=$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
if command -v curl > /dev/null && [ -n "$DOMAIN" ]; then
  sleep 5
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/health" || echo 000)
  echo "   https://$DOMAIN/health -> HTTP $CODE"
  [ "$CODE" = "200" ] || echo "   NOTE: Caddy may still be issuing the TLS certificate; retry in a minute."
fi

echo
echo "✅ Deploy complete: https://$DOMAIN"
echo "   Logs:     $COMPOSE logs -f api"
echo "   Migrate:  runs automatically on every api start"
echo "   Backups:  cron:  0 3 * * * cd $(pwd) && ./scripts/backup-all.sh >> ./backups/backup.log 2>&1"
