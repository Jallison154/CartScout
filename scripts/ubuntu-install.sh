#!/bin/bash
# CartScout – single-command full install or pull+restart on Ubuntu 22.04.
#
# Full install (one command, no extra steps):
#   sudo bash scripts/ubuntu-install.sh
# Installs: curl, Node.js 20, build-essential, python3, git, pm2; clones repo,
# runs npm install (respects package.json overrides, e.g. glob), builds server, starts API with pm2.
#
# Update: sudo bash scripts/ubuntu-install.sh pull
# Reinstall (remove old + fresh install): sudo bash scripts/ubuntu-install.sh reinstall

set -e

# --- Config (override with env vars if needed) ---
GIT_REPO="${GIT_REPO:-https://github.com/Jallison154/CartScout.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/cartscout}"
BRANCH="${BRANCH:-main}"
APP_USER="${APP_USER:-cartscout}"

# --- Pull-only mode: pull, npm install, build, pm2 restart ---
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
  sudo -u "$APP_USER" env PATH="$PATH" git reset --hard "origin/$BRANCH"
  sudo -u "$APP_USER" env PATH="$PATH" git checkout "$BRANCH"
  echo "[CartScout] npm install and build..."
  sudo -u "$APP_USER" env PATH="$PATH" npm install
  sudo -u "$APP_USER" env PATH="$PATH" npm run build:server
  if command -v pm2 &>/dev/null; then
    sudo -u "$APP_USER" env PATH="$PATH" pm2 restart cartscout-api
    sudo -u "$APP_USER" env PATH="$PATH" pm2 save
    echo "[CartScout] Restarted cartscout-api."
  fi
  echo "[CartScout] Pull done."
  exit 0
fi

# --- Reinstall mode: remove old install dir, then run full install below ---
if [[ "${1:-}" == "reinstall" || "${1:-}" == "fresh" ]]; then
  echo "[CartScout] Reinstall: removing old install at $INSTALL_DIR..."
  if command -v pm2 &>/dev/null && id "$APP_USER" &>/dev/null; then
    sudo -u "$APP_USER" env PATH="$PATH" pm2 delete cartscout-api 2>/dev/null || true
    sudo -u "$APP_USER" pm2 save 2>/dev/null || true
  fi
  rm -rf "$INSTALL_DIR"
  mkdir -p "$INSTALL_DIR"
  id "$APP_USER" &>/dev/null && chown "$APP_USER:$APP_USER" "$INSTALL_DIR" || true
  echo "[CartScout] Proceeding with full install..."
fi

echo "[CartScout] Full install on Ubuntu 22.04 (clone from $GIT_REPO)..."

# --- System deps (one-time): curl, build-essential, python3, git ---
echo "[CartScout] Installing system packages (curl, build-essential, python3, git)..."
apt-get update -qq
apt-get install -y -qq curl build-essential python3 git

# --- Node 20 (NodeSource); required for CartScout ---
NODE_MAJOR=$(node -v 2>/dev/null | sed -n 's/^v\([0-9]*\).*/\1/p')
if ! command -v node &>/dev/null || [[ -z "$NODE_MAJOR" || "$NODE_MAJOR" -lt 18 ]]; then
  echo "[CartScout] Installing Node.js 20 (current: $(node -v 2>/dev/null || echo 'none'))..."
  apt-get remove -y nodejs libnode-dev 2>/dev/null || true
  apt-get autoremove -y 2>/dev/null || true
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
# PATH: node, npm, and global bins (pm2)
export PATH="/usr/local/bin:/usr/bin:$PATH"
echo "[CartScout] Node $(node -v) npm $(npm -v)"

# --- pm2 (global); needed to run and restart the API ---
if ! command -v pm2 &>/dev/null; then
  echo "[CartScout] Installing pm2..."
  npm install -g pm2
fi

# --- App user (optional) ---
if ! id "$APP_USER" &>/dev/null; then
  echo "[CartScout] Creating user $APP_USER..."
  useradd -r -s /bin/false -d "$INSTALL_DIR" "$APP_USER" 2>/dev/null || true
fi
mkdir -p "$INSTALL_DIR"
chown -R "$APP_USER:$APP_USER" "$INSTALL_DIR" 2>/dev/null || true

# --- Clone or pull ---
if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "[CartScout] Already cloned; updating to latest..."
  (cd "$INSTALL_DIR" && sudo -u "$APP_USER" env PATH="$PATH" git fetch origin && sudo -u "$APP_USER" env PATH="$PATH" git reset --hard "origin/$BRANCH" && sudo -u "$APP_USER" env PATH="$PATH" git checkout "$BRANCH")
else
  echo "[CartScout] Cloning $GIT_REPO..."
  sudo -u "$APP_USER" git clone --branch "$BRANCH" "$GIT_REPO" "$INSTALL_DIR"
fi

# --- Install deps and build server (npm install respects package.json overrides, e.g. glob) ---
echo "[CartScout] npm install and build..."
cd "$INSTALL_DIR"
sudo -u "$APP_USER" env PATH="$PATH" npm install
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

# --- Start API with pm2 ---
cd "$INSTALL_DIR"
sudo -u "$APP_USER" env PATH="$PATH" pm2 delete cartscout-api 2>/dev/null || true
sudo -u "$APP_USER" env PATH="$PATH" NODE_ENV=production pm2 start npm --name cartscout-api -- run start --workspace=server
sudo -u "$APP_USER" pm2 save

echo "[CartScout] Install done. API: $(pm2 jlist | grep -o '"name":"cartscout-api"' || true)"
echo "[CartScout] Commands: pm2 status | pm2 logs cartscout-api | pm2 restart cartscout-api"
echo "[CartScout] Optional: pm2 startup  (then run the printed command to start on boot)"
