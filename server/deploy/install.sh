#!/usr/bin/env bash
#
# CartScout backend — install / update / reinstall on Ubuntu (e.g. Proxmox VM).
#
# Prerequisites:
#   - Repository cloned to CARTSCOUT_HOME (default /opt/cartscout), monorepo layout with server/
#     OR standalone copy of the server package at CARTSCOUT_HOME.
#
# Runtime: Node.js 22 LTS via NodeSource (this codebase uses node:sqlite, which needs Node >= 22.5;
# Node 20 cannot run this server without replacing the DB layer).
#
# Usage (from repo, after clone):
#   sudo CARTSCOUT_HOME=/opt/cartscout ./server/deploy/install.sh install
#   sudo ./server/deploy/install.sh update
#   sudo ./server/deploy/install.sh reinstall
#
# First-time server prep:
#   sudo mkdir -p /opt/cartscout && sudo chown -R "$USER":"$USER" /opt/cartscout
#   git clone <your-remote> /opt/cartscout
#   cd /opt/cartscout && ./server/deploy/install.sh install
#
# Env file: /opt/cartscout/cartscout.env (created from cartscout.env.example on install)
#
# LAN + iPhone: allow firewall (example): sudo ufw allow 4000/tcp
#               App env: EXPO_PUBLIC_API_URL=http://192.168.x.x:4000
#
set -euo pipefail

CMD="${1:-}"

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  SUDO="sudo"
fi

die() {
  echo "error: $*" >&2
  exit 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PARENT_DIR="$(cd "$SERVER_DIR/.." && pwd)"

if [[ -f "$PARENT_DIR/package.json" ]] && grep -q '"workspaces"' "$PARENT_DIR/package.json" 2>/dev/null && [[ -d "$PARENT_DIR/server" ]]; then
  REPO_ROOT="$PARENT_DIR"
else
  REPO_ROOT="$SERVER_DIR"
fi

# Secrets file: defaults to repo root (e.g. /opt/cartscout/cartscout.env). Override if needed.
CARTSCOUT_HOME="${CARTSCOUT_HOME:-$REPO_ROOT}"
export CARTSCOUT_HOME

PM2_APP_NAME="cartscout-api"
ECOSYSTEM="$SERVER_DIR/deploy/ecosystem.config.cjs"
ENV_EXAMPLE="$SERVER_DIR/deploy/cartscout.env.example"
ENV_TARGET="$CARTSCOUT_HOME/cartscout.env"

ensure_dirs() {
  mkdir -p "$CARTSCOUT_HOME/data"
  if [[ "$(id -u)" -eq 0 ]] && [[ -n "${SUDO_USER:-}" ]]; then
    chown -R "$SUDO_USER":"$SUDO_USER" "$CARTSCOUT_HOME/data" 2>/dev/null || true
  fi
}

ensure_env_file() {
  if [[ ! -f "$ENV_TARGET" ]]; then
    if [[ ! -f "$ENV_EXAMPLE" ]]; then
      die "missing $ENV_EXAMPLE"
    fi
    cp "$ENV_EXAMPLE" "$ENV_TARGET"
    chmod 600 "$ENV_TARGET" || true
    echo "Created $ENV_TARGET — edit JWT_ACCESS_SECRET and save before relying on production auth."
  fi
}

node_major() {
  if command -v node >/dev/null 2>&1; then
    node -p "Number(process.version.slice(1).split('.')[0])" 2>/dev/null || echo 0
  else
    echo 0
  fi
}

install_nodejs() {
  local major
  major="$(node_major)"
  if [[ "$major" -ge 22 ]]; then
    echo "Node.js $(node -v) OK"
    return
  fi

  echo "Installing Node.js 22.x (NodeSource)…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
  command -v node >/dev/null 2>&1 || die "node not found after install"
  [[ "$(node_major)" -ge 22 ]] || die "Need Node.js 22+ (this app uses node:sqlite)"
  echo "Node.js $(node -v) installed"
}

install_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    return
  fi
  echo "Installing PM2 globally…"
  $SUDO npm install -g pm2
  command -v pm2 >/dev/null 2>&1 || die "pm2 not found after install"
}

npm_install_and_build() {
  if [[ "$REPO_ROOT" == "$SERVER_DIR" ]]; then
    if [[ -f "$SERVER_DIR/package-lock.json" ]]; then
      (cd "$SERVER_DIR" && npm ci && npm run build)
    else
      echo "No package-lock.json in server dir — using npm install (prefer full monorepo clone with root lockfile)."
      (cd "$SERVER_DIR" && npm install && npm run build)
    fi
  else
    [[ -f "$REPO_ROOT/package-lock.json" ]] || die "missing $REPO_ROOT/package-lock.json — clone the full CartScout repo (workspaces)"
    (cd "$REPO_ROOT" && npm ci -w @cartscout/server && npm run build -w @cartscout/server)
  fi
}

clean_node_modules() {
  echo "Removing node_modules…"
  rm -rf "$REPO_ROOT/node_modules"
  if [[ "$REPO_ROOT" != "$SERVER_DIR" ]]; then
    rm -rf "$SERVER_DIR/node_modules"
  fi
}

git_pull_if_present() {
  if [[ -d "$REPO_ROOT/.git" ]]; then
    git -C "$REPO_ROOT" pull --ff-only
  else
    echo "No git repo at $REPO_ROOT — skipping pull"
  fi
}

pm2_start_or_reload() {
  export CARTSCOUT_HOME
  if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
    pm2 reload "$ECOSYSTEM" --update-env
  else
    pm2 start "$ECOSYSTEM"
  fi
  pm2 save
}

warn_secret() {
  if [[ -f "$ENV_TARGET" ]] && grep -q '^JWT_ACCESS_SECRET=change-me' "$ENV_TARGET" 2>/dev/null; then
    echo "WARNING: Edit JWT_ACCESS_SECRET in $ENV_TARGET (still default placeholder)."
  fi
}

case "$CMD" in
  install)
    [[ -f "$SERVER_DIR/package.json" ]] || die "server package not found at $SERVER_DIR"
    install_nodejs
    install_pm2
    ensure_dirs
    ensure_env_file
    npm_install_and_build
    pm2_start_or_reload
    warn_secret
    echo ""
    echo "Done. Check: pm2 status && curl -sS http://127.0.0.1:4000/health"
    echo "Enable PM2 on boot (run once as the deploy user): pm2 startup systemd -u \$USER --hp \$HOME && pm2 save"
    ;;
  update)
    [[ -f "$SERVER_DIR/package.json" ]] || die "server package not found at $SERVER_DIR"
    install_nodejs
    install_pm2
    git_pull_if_present
    ensure_dirs
    ensure_env_file
    npm_install_and_build
    pm2_start_or_reload
    warn_secret
    echo "Update complete."
    ;;
  reinstall)
    [[ -f "$SERVER_DIR/package.json" ]] || die "server package not found at $SERVER_DIR"
    install_nodejs
    install_pm2
    clean_node_modules
    ensure_dirs
    ensure_env_file
    npm_install_and_build
    pm2_start_or_reload
    warn_secret
    echo "Reinstall complete."
    ;;
  *)
    die "usage: $0 {install|update|reinstall}"
    ;;
esac
