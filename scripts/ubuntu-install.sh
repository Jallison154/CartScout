#!/bin/bash
# CartScout – full install or pull+restart on Ubuntu 22.04.
#   sudo ./scripts/ubuntu-install.sh        # full install (clone, deps, build, pm2)
#   sudo ./scripts/ubuntu-install.sh pull   # pull latest, npm ci, build, pm2 restart

set -e

# --- Config (override with env vars if needed) ---
GIT_REPO="${GIT_REPO:-https://github.com/Jallison154/CartScout.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/cartscout}"
BRANCH="${BRANCH:-main}"
APP_USER="${APP_USER:-cartscout}"

# --- Pull-only mode: pull, npm ci, build, pm2 restart ---
if [[ "${1:-}" == "pull" || "${1:-}" == "update" ]]; then
  echo "[CartScout] Pull and restart..."
  if [[ ! -d "$INSTALL_DIR/.git" ]]; then
    echo "[CartScout] Not a git repo. Run without 'pull' for full install first."
    exit 1
  fi
  # Require Node 18+ (use same PATH as root so NodeSource node is used)
  NODE_VER=$(node -v 2>/dev/null | cut -d. -f1 | tr -d v || echo "0")
  if [[ -z "$NODE_VER" || "$NODE_VER" -lt 18 ]]; then
    echo "[CartScout] ERROR: Node 18+ required (current: $(node -v 2>/dev/null || echo 'none'))."
    echo "  Run full install first: sudo bash scripts/ubuntu-install.sh"
    echo "  Or install Node 20: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
  fi
  cd "$INSTALL_DIR"
  sudo -u "$APP_USER" env PATH="$PATH" git fetch origin
  sudo -u "$APP_USER" env PATH="$PATH" git checkout "$BRANCH"
  sudo -u "$APP_USER" env PATH="$PATH" git pull
  echo "[CartScout] npm ci and build..."
  sudo -u "$APP_USER" env PATH="$PATH" npm ci
  sudo -u "$APP_USER" env PATH="$PATH" npm run build:server
  if command -v pm2 &>/dev/null; then
    sudo -u "$APP_USER" env PATH="$PATH" pm2 restart cartscout-api
    sudo -u "$APP_USER" env PATH="$PATH" pm2 save
    echo "[CartScout] Restarted cartscout-api."
  fi
  echo "[CartScout] Pull done."
  exit 0
fi

echo "[CartScout] Installing on Ubuntu 22.04 (clone from $GIT_REPO)..."

# --- Node 20 (NodeSource); required for CartScout ---
NODE_MAJOR=$(node -v 2>/dev/null | sed -n 's/^v\([0-9]*\).*/\1/p')
if ! command -v node &>/dev/null || [[ -z "$NODE_MAJOR" || "$NODE_MAJOR" -lt 18 ]]; then
  echo "[CartScout] Installing Node.js 20 (current: $(node -v 2>/dev/null || echo 'none'))..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
# Ensure node/npm from this install are first in PATH for later steps
export PATH="/usr/bin:$PATH"
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

# --- Install deps and build server (use root PATH so Node 20 is used) ---
echo "[CartScout] npm install and build..."
cd "$INSTALL_DIR"
sudo -u "$APP_USER" env PATH="$PATH" npm ci
sudo -u "$APP_USER" env PATH="$PATH" npm run build:server

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
