# Ubuntu 22.04 deploy scripts

One-command install and update for CartScout on Ubuntu 22.04.

- **Full install (single command):** `sudo bash scripts/ubuntu-install.sh`
- **Pull and restart:** `sudo bash scripts/ubuntu-install.sh pull`
- **Reinstall (remove old + fresh install):** `sudo bash scripts/ubuntu-install.sh reinstall`

### What the full install installs (no extra steps)

| Add-on | Purpose |
|--------|--------|
| `curl` | Fetch NodeSource setup script |
| **Node.js 20** | Runtime (removes conflicting Ubuntu nodejs/libnode-dev first) |
| `build-essential`, `python3`, `git` | Build native deps (e.g. better-sqlite3), clone repo |
| **pm2** | Process manager to run and restart the API |
| App user `cartscout` | Runs the app under `/opt/cartscout` |
| `.env` from `.env.example` | Created if missing; edit for JWT secrets |
| `server/data` | SQLite data directory |

Then: clone repo → `npm install` (uses package.json overrides, e.g. glob) → build server → start API with pm2.

**Stores and product suggestions:** The API exposes `/api/v1/stores` and `/api/v1/products/search` only when the server is built from code that includes these routes. If the app gets 404s for stores or favorites, run an update on the server so the latest code is built and restarted: `sudo bash scripts/ubuntu-install.sh pull`.

## No code on the server yet (clone from Git first)

If the server has no CartScout files yet, clone the repo so you have the install script, then run it:

```bash
git clone https://github.com/Jallison154/CartScout.git
cd CartScout
sudo bash scripts/ubuntu-install.sh
```

The install script will then clone the repo again into `/opt/cartscout`, install Node 20, deps, build the server, and start it with pm2.

## Install (first time, fresh server)

1. If you already have the repo (e.g. you ran the clone above), run:
   ```bash
   sudo bash scripts/ubuntu-install.sh
   ```
   The script will: install Node 20, clone the repo into `/opt/cartscout`, run `npm install`, build the server, and start it with pm2.

2. To use a different repo or path, set env vars first (use `-E` with sudo so they are passed through):
   ```bash
   export GIT_REPO="https://github.com/Jallison154/CartScout.git"
   export INSTALL_DIR="/opt/cartscout"
   sudo -E bash scripts/ubuntu-install.sh
   ```

3. Edit `.env` in the install directory (JWT secrets, `PORT`, `DATABASE_PATH`).

4. Optional: enable pm2 on boot:
   ```bash
   pm2 startup
   # run the command it prints
   ```

## Update (pull latest and restart)

From the server, either use the install script with `pull`:

```bash
sudo bash scripts/ubuntu-install.sh pull
```

Or the dedicated update script:

```bash
sudo bash scripts/ubuntu-update.sh
```

Both do: `git pull`, `npm install`, `npm run build:server`, `pm2 restart cartscout-api`.

## Env vars (optional)

| Variable      | Default                                      | Description           |
|---------------|----------------------------------------------|-----------------------|
| `GIT_REPO`    | `https://github.com/Jallison154/CartScout.git` | Git clone URL         |
| `INSTALL_DIR` | `/opt/cartscout`                             | Install path          |
| `BRANCH`      | `main`                                       | Branch to clone/pull  |
| `APP_USER`    | `cartscout`                                  | User that runs the app |

## Node 18+ required

CartScout needs **Node 18 or newer** (project and many deps require it). The **full install** script installs Node 20 via NodeSource. If you see `EBADENGINE` or `SyntaxError: Unexpected token '?'` during `npm install` or `npm run build:server`, the process is using an old Node (e.g. 12).

- **Fix:** Run the **full install** once so Node 20 is installed:  
  `sudo bash scripts/ubuntu-install.sh`  
  (Do not use only `pull` on a fresh server.)

- **If NodeSource install fails** with `trying to overwrite ... which is also in package libnode-dev`: Ubuntu’s Node packages conflict. Remove them, then install Node 20:
  ```bash
  sudo apt-get remove -y nodejs libnode-dev
  sudo apt-get autoremove -y
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  node -v   # should show v20.x
  ```
  Then run `sudo bash scripts/ubuntu-install.sh` or `sudo bash scripts/ubuntu-install.sh pull`.

## Notes

- Install script: Node 20, build-essential, clone, `npm install`, `npm run build:server`, pm2.
- Update script: `git pull`, `npm install`, build, `pm2 restart cartscout-api`.
- SQLite data dir: `server/data/` (create and chown in install).
- Health: `curl http://localhost:4000/health`
