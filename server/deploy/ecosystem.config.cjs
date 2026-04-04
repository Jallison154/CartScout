/**
 * PM2 ecosystem for CartScout API.
 * Env vars are merged from /opt/cartscout/cartscout.env (override with CARTSCOUT_HOME).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const cartscoutHome = process.env.CARTSCOUT_HOME || '/opt/cartscout';
const envFile = path.join(cartscoutHome, 'cartscout.env');
const serverRoot = path.resolve(__dirname, '..');

function parseEnvFile(filePath) {
  const out = { NODE_ENV: 'production' };
  if (!fs.existsSync(filePath)) {
    return out;
  }
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

module.exports = {
  apps: [
    {
      name: 'cartscout-api',
      cwd: serverRoot,
      script: 'dist/index.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 15,
      min_uptime: '10s',
      merge_logs: true,
      env: parseEnvFile(envFile),
    },
  ],
};
