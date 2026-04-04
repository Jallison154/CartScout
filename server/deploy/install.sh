#!/usr/bin/env bash
# Delegates to the repo-root Ubuntu installer (single source of truth).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec "$ROOT/scripts/ubuntu-install.sh" "$@"
