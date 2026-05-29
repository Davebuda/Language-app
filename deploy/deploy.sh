#!/usr/bin/env bash
# NorskCoach deploy — run ON the VPS (or via the GitHub Action in .github/workflows/deploy.yml).
#
#   ssh root@<vps-ip>
#   cd /var/www/norskcoach && ./deploy/deploy.sh
#
# Idempotent: pulls, installs, builds, then zero-downtime-reloads PM2.
# Audio (public/audio/sentences/) is gitignored — sync it separately (see README).
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/norskcoach}"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$APP_DIR"

echo "==> Fetching $BRANCH"
git fetch --quiet origin "$BRANCH"
git checkout --quiet "$BRANCH"
git reset --hard --quiet "origin/$BRANCH"

echo "==> Installing deps (clean, lockfile-exact)"
npm ci --no-audit --no-fund

echo "==> Building"
npm run build

echo "==> Reloading PM2 (zero-downtime)"
if pm2 describe norskcoach >/dev/null 2>&1; then
  pm2 reload norskcoach --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

echo "==> Done. Tail logs with: pm2 logs norskcoach"
