#!/usr/bin/env bash
#
# CartScout API — Ubuntu install / update / reinstall (Proxmox VM, LAN dev).
# Target tree: /opt/cartscout (monorepo with server/)
#
# Node.js: this project uses node:sqlite (DatabaseSync), which requires Node.js 22+.
# The script installs Node 22 LTS from NodeSource, not 20 — Node 20 cannot run this API.
#
# Usage:
#   export GIT_REPO=https://github.com/Jallison154/CartScout.git   # only if /opt/cartscout is empty
#   sudo mkdir -p /opt/cartscout && sudo chown -R "$USER":"$USER" /opt/cartscout
#   ./scripts/ubuntu-install.sh install    # from repo clone, OR clones into INSTALL_ROOT if empty + GIT_REPO
#
#   ./scripts/ubuntu-install.sh update     # git pull + rebuild + pm2 reload
#   ./scripts/ubuntu-install.sh reinstall  # wipe node_modules, rebuild, pm2 restart
#
# Env file: INSTALL_ROOT/cartscout.env (created from server/deploy/cartscout.env.example)
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

INSTALL_ROOT="${INSTALL_ROOT:-/opt/cartscout}"
export CARTSCOUT_HOME="${CARTSCOUT_HOME:-$INSTALL_ROOT}"

PM2_APP_NAME="cartscout-api"

die_usage() {
  die "usage: $0 {install|update|reinstall}"
}

install_apt_basics() {
  echo "Ensuring git, build tools, curl…"
  $SUDO apt-get update -qq
  # Use `env` so DEBIAN_FRONTEND works when SUDO is empty (root) and with `sudo` (no "command not found").
  $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y git build-essential ca-certificates curl
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
    echo "Node.js $(node -v) OK (need 22+ for node:sqlite)"
    return
  fi

  echo "Installing Node.js 22.x from NodeSource (required for node:sqlite; Node 20 is not supported)…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
  command -v node >/dev/null 2>&1 || die "node not found after install"
  [[ "$(node_major)" -ge 22 ]] || die "Need Node.js 22+"
  echo "Node.js $(node -v) installed (includes npm)"
}

install_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    return
  fi
  echo "Installing PM2 globally…"
  $SUDO npm install -g pm2
  command -v pm2 >/dev/null 2>&1 || die "pm2 not found after install"
}

ensure_repo() {
  if [[ -f "$INSTALL_ROOT/server/package.json" ]]; then
    return
  fi

  mkdir -p "$INSTALL_ROOT"
  local empty=1
  if [[ -n "$(ls -A "$INSTALL_ROOT" 2>/dev/null)" ]]; then
    empty=0
  fi

  if [[ "$empty" -eq 0 ]]; then
    die "$INSTALL_ROOT is not empty and has no server/package.json — clone CartScout here or empty the directory."
  fi

  [[ -n "${GIT_REPO:-}" ]] || die "Missing repo. Clone first: git clone <url> $INSTALL_ROOT
   Or create an empty $INSTALL_ROOT and run: GIT_REPO=<url> $0 install"

  echo "Cloning into $INSTALL_ROOT …"
  git clone "$GIT_REPO" "$INSTALL_ROOT"
  [[ -f "$INSTALL_ROOT/server/package.json" ]] || die "Clone did not contain server/ — check GIT_REPO"
}

resolve_paths() {
  REPO_ROOT="$INSTALL_ROOT"
  SERVER_DIR="$REPO_ROOT/server"
  ENV_EXAMPLE="$SERVER_DIR/deploy/cartscout.env.example"
  ENV_TARGET="$CARTSCOUT_HOME/cartscout.env"
  ECOSYSTEM="$SERVER_DIR/deploy/ecosystem.config.cjs"
}

ensure_dirs() {
  mkdir -p "$CARTSCOUT_HOME/data"
  if [[ "$(id -u)" -eq 0 ]] && [[ -n "${SUDO_USER:-}" ]]; then
    chown -R "$SUDO_USER":"$SUDO_USER" "$CARTSCOUT_HOME/data" 2>/dev/null || true
  fi
}

ensure_env_file() {
  if [[ ! -f "$ENV_TARGET" ]]; then
    [[ -f "$ENV_EXAMPLE" ]] || die "missing $ENV_EXAMPLE"
    cp "$ENV_EXAMPLE" "$ENV_TARGET"
    chmod 600 "$ENV_TARGET" || true
    echo "Created $ENV_TARGET — set JWT_ACCESS_SECRET (and optionally NODE_ENV=development for casual LAN dev)."
  fi
}

npm_install_and_build() {
  if [[ "$REPO_ROOT" == "$SERVER_DIR" ]]; then
    if [[ -f "$SERVER_DIR/package-lock.json" ]]; then
      (cd "$SERVER_DIR" && npm ci && npm run build)
    else
      echo "No server/package-lock.json — npm install (prefer full monorepo with root package-lock.json)."
      (cd "$SERVER_DIR" && npm install && npm run build)
    fi
  else
    [[ -f "$REPO_ROOT/package-lock.json" ]] || die "missing $REPO_ROOT/package-lock.json — use full CartScout monorepo clone"
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
    echo "No .git at $REPO_ROOT — skipping pull"
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
    echo "WARNING: Edit JWT_ACCESS_SECRET in $ENV_TARGET (placeholder still in use)."
  fi
}

run_install_flow() {
  [[ -f "$SERVER_DIR/package.json" ]] || die "server package missing at $SERVER_DIR"
  install_apt_basics
  install_nodejs
  install_pm2
  ensure_dirs
  ensure_env_file
  npm_install_and_build
  pm2_start_or_reload
  warn_secret
}

# -----------------------------------------------------------------------------
case "$CMD" in
  install)
    ensure_repo
    resolve_paths
    run_install_flow
    echo ""
    echo "Done. Check: pm2 status && pm2 logs cartscout-api --lines 40"
    echo "Health: curl -sS http://127.0.0.1:4000/health"
    echo "LAN: curl -sS http://<this-vm-ip>:4000/health"
    echo "PM2 on boot (once, as deploy user): pm2 startup systemd -u \$USER --hp \$HOME && pm2 save"
    ;;
  update)
    resolve_paths
    [[ -f "$SERVER_DIR/package.json" ]] || die "server not found — run install first"
    install_apt_basics
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
    resolve_paths
    [[ -f "$SERVER_DIR/package.json" ]] || die "server not found — run install first"
    install_apt_basics
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
    die_usage
    ;;
esac
