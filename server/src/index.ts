import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertAuthConfig } from './config/auth.js';
import { createApp } from './app.js';
import { initializeDatabase } from './db/index.js';
import { resolveDatabasePath } from './db/paths.js';

try {
  initializeDatabase();
} catch (err) {
  console.error(
    '[cartscout] FATAL: database init failed. If you run from dist/, run `npm run build` so schema.sql is copied to dist/db/.',
  );
  throw err;
}

assertAuthConfig();

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST ?? '0.0.0.0';
const dbPath = resolveDatabasePath();

const app = createApp();

app.listen(port, host, () => {
  const base = `http://${host}:${port}`;
  console.info(`[cartscout] listening on ${base} (bind ${host} = all interfaces on this machine)`);
  console.info(`[cartscout] SQLite file: ${dbPath}`);
  console.info(`[cartscout] health check: http://127.0.0.1:${port}/health`);
  const webRaw = process.env.WEB_UI_DIST?.trim();
  const webAbs = webRaw ? resolve(webRaw) : '';
  if (webAbs && existsSync(webAbs)) {
    console.info(`[cartscout] web UI: ${webAbs} (open http://127.0.0.1:${port}/ )`);
  }
});
