# scripts

## `ubuntu-install.sh`

Install, update, or reinstall the **CartScout API** on **Ubuntu** (e.g. a Proxmox VM) under **`/opt/cartscout`**, with **PM2**, **git pull**, and **npm build**. See the **Ubuntu / Proxmox** section in the repo root **`README.md`**.

```bash
# Empty /opt/cartscout: export GIT_REPO=https://github.com/Jallison154/CartScout.git
./scripts/ubuntu-install.sh install    # fresh (clone with GIT_REPO if dir empty)
./scripts/ubuntu-install.sh update     # pull + rebuild + pm2 reload
./scripts/ubuntu-install.sh reinstall  # clean node_modules + rebuild + pm2
```

Uses **Node.js 22+** (not 20) because the server depends on **`node:sqlite`**.
