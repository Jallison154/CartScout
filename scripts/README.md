# Ubuntu 22.04 deploy scripts

Scripts to install and update CartScout on Ubuntu 22.04, pulling from Git and running the API with pm2.

- **Full install:** `sudo bash scripts/ubuntu-install.sh`
- **Pull and restart:** `sudo bash scripts/ubuntu-install.sh pull`

## Install (first time, fresh server)

1. Clone and install (defaults to [Jallison154/CartScout](https://github.com/Jallison154/CartScout)):
   ```bash
   sudo bash scripts/ubuntu-install.sh
   ```
   The script will: install Node 20, clone the repo into `/opt/cartscout`, run `npm ci`, build the server, and start it with pm2.

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

Both do: `git pull`, `npm ci`, `npm run build:server`, `pm2 restart cartscout-api`.

## Env vars (optional)

| Variable      | Default                                      | Description           |
|---------------|----------------------------------------------|-----------------------|
| `GIT_REPO`    | `https://github.com/Jallison154/CartScout.git` | Git clone URL         |
| `INSTALL_DIR` | `/opt/cartscout`                             | Install path          |
| `BRANCH`      | `main`                                       | Branch to clone/pull  |
| `APP_USER`    | `cartscout`                                  | User that runs the app |

## Notes

- Install script: Node 20, build-essential, clone, `npm ci`, `npm run build:server`, pm2.
- Update script: `git pull`, `npm ci`, build, `pm2 restart cartscout-api`.
- SQLite data dir: `server/data/` (create and chown in install).
- Health: `curl http://localhost:4000/health`
