import { assertAuthConfig } from './config/auth.js';
import { createApp } from './app.js';
import { initializeDatabase } from './db/index.js';

initializeDatabase();
assertAuthConfig();

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST ?? '0.0.0.0';

const app = createApp();

app.listen(port, host, () => {
  console.info(`CartScout API listening on http://${host}:${port}`);
});
