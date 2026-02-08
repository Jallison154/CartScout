#!/bin/bash
# CartScout – update on Ubuntu (pull, install, rebuild, restart).
# Usage: run as the app user or with sudo from repo root, or set INSTALL_DIR.

set -e

INSTALL_DIR="${INSTALL_DIR:-/opt/cartscout}"
BRANCH="${BRANCH:-main}"
APP_USER="${APP_USER:-cartscout}"

echo "[CartScout] Updating in $INSTALL_DIR..."

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  echo "[CartScout] Not a git repo. Run ubuntu-install.sh first."
  exit 1
fi

cd "$INSTALL_DIR"

# Pull
sudo -u "$APP_USER" git fetch origin
sudo -u "$APP_USER" git checkout "$BRANCH"
sudo -u "$APP_USER" git pull

# Deps and build
echo "[CartScout] npm install and build..."
sudo -u "$APP_USER" npm ci
sudo -u "$APP_USER" npm run build:server

# Restart API
if command -v pm2 &>/dev/null; then
  sudo -u "$APP_USER" pm2 restart cartscout-api
  sudo -u "$APP_USER" pm2 save
  echo "[CartScout] Restarted cartscout-api."
else
  echo "[CartScout] pm2 not found; start manually: npm run server or node server/dist/index.js"
fi

echo "[CartScout] Update done."
