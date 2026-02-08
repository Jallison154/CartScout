#!/bin/bash
# CartScout – full install on Ubuntu 22.04 (Node 20, clone, deps, build, pm2).
# Usage: sudo ./scripts/ubuntu-install.sh
# Set GIT_REPO and INSTALL_DIR before running, or edit below.

set -e

# --- Config (set GIT_REPO before running on a fresh install) ---
GIT_REPO="${GIT_REPO:-}"
INSTALL_DIR="${INSTALL_DIR:-/opt/cartscout}"
BRANCH="${BRANCH:-main}"
APP_USER="${APP_USER:-cartscout}"

if [[ -z "$GIT_REPO" ]]; then
  echo "[CartScout] ERROR: Set your Git repo URL before running."
  echo "  export GIT_REPO=\"https://github.com/YOUR_ORG/CartScout.git\""
  echo "  sudo -E $0"
  exit 1
fi

echo "[CartScout] Installing on Ubuntu 22.04 (clone from $GIT_REPO)..."

# --- Node 20 (NodeSource) ---
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 18 ]]; then
  echo "[CartScout] Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "[CartScout] Node $(node -v) npm $(npm -v)"

# --- Build deps for better-sqlite3 ---
echo "[CartScout] Ensuring build-essential..."
apt-get update -qq
apt-get install -y -qq build-essential python3 git

# --- App user (optional) ---
if ! id "$APP_USER" &>/dev/null; then
  echo "[CartScout] Creating user $APP_USER..."
  useradd -r -s /bin/false -d "$INSTALL_DIR" "$APP_USER" 2>/dev/null || true
fi
mkdir -p "$INSTALL_DIR"
chown -R "$APP_USER:$APP_USER" "$INSTALL_DIR" 2>/dev/null || true

# --- Clone or pull ---
if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "[CartScout] Already cloned; pulling..."
  (cd "$INSTALL_DIR" && sudo -u "$APP_USER" git fetch && git checkout "$BRANCH" && git pull)
else
  echo "[CartScout] Cloning $GIT_REPO..."
  sudo -u "$APP_USER" git clone --branch "$BRANCH" "$GIT_REPO" "$INSTALL_DIR"
fi

# --- Install deps and build server ---
echo "[CartScout] npm install and build..."
cd "$INSTALL_DIR"
sudo -u "$APP_USER" npm ci
sudo -u "$APP_USER" npm run build:server

# --- .env ---
if [[ ! -f "$INSTALL_DIR/.env" ]]; then
  echo "[CartScout] Creating .env from .env.example..."
  cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  chown "$APP_USER:$APP_USER" "$INSTALL_DIR/.env"
  echo "[CartScout] Edit $INSTALL_DIR/.env (JWT secrets, PORT, DATABASE_PATH) before going live."
fi

# --- Data dir for SQLite ---
mkdir -p "$INSTALL_DIR/server/data"
chown "$APP_USER:$APP_USER" "$INSTALL_DIR/server/data"

# --- Pm2 (global) and start ---
if ! command -v pm2 &>/dev/null; then
  echo "[CartScout] Installing pm2..."
  npm install -g pm2
fi

cd "$INSTALL_DIR"
sudo -u "$APP_USER" env PATH="$PATH" pm2 delete cartscout-api 2>/dev/null || true
sudo -u "$APP_USER" env PATH="$PATH" NODE_ENV=production pm2 start npm --name cartscout-api -- run start --workspace=server
sudo -u "$APP_USER" pm2 save

echo "[CartScout] Install done. API: $(pm2 jlist | grep -o '"name":"cartscout-api"' || true)"
echo "[CartScout] Commands: pm2 status | pm2 logs cartscout-api | pm2 restart cartscout-api"
echo "[CartScout] Optional: pm2 startup  (then run the printed command to start on boot)"
