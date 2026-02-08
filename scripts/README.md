# Ubuntu 22.04 deploy scripts

Scripts to install and update CartScout on Ubuntu 22.04, pulling from Git and running the API with pm2.

## Install (first time, fresh server)

1. **Set your Git repo URL** (required). Use your real repo; the script will clone it.
   ```bash
   export GIT_REPO="https://github.com/YOUR_ORG/CartScout.git"
   ```
   Optional: `export INSTALL_DIR="/opt/cartscout"` and/or `export BRANCH="main"`

2. Run the install script. Use `-E` so `GIT_REPO` is passed through sudo:
   ```bash
   sudo -E bash scripts/ubuntu-install.sh
   ```
   The script will: install Node 20, clone the repo into `INSTALL_DIR`, run `npm ci`, build the server, and start it with pm2.

3. Edit `.env` in the install directory (JWT secrets, `PORT`, `DATABASE_PATH`).

4. Optional: enable pm2 on boot:
   ```bash
   pm2 startup
   # run the command it prints
   ```

## Update (after git push)

From the server, run:

```bash
sudo bash scripts/ubuntu-update.sh
```

Or if you set `INSTALL_DIR`:

```bash
export INSTALL_DIR=/opt/cartscout
sudo bash scripts/ubuntu-update.sh
```

## Env vars (optional)

| Variable      | Default           | Description                    |
|---------------|-------------------|--------------------------------|
| `GIT_REPO`    | (see script)      | Git clone URL                  |
| `INSTALL_DIR` | `/opt/cartscout`  | Install path                   |
| `BRANCH`      | `main`            | Branch to clone / pull         |
| `APP_USER`    | `cartscout`       | User that runs the app         |

## Notes

- Install script: Node 20, build-essential, clone, `npm ci`, `npm run build:server`, pm2.
- Update script: `git pull`, `npm ci`, build, `pm2 restart cartscout-api`.
- SQLite data dir: `server/data/` (create and chown in install).
- Health: `curl http://localhost:4000/health`
