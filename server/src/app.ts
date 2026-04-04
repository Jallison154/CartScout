import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { registerRoutes } from './routes/index.js';
import { HttpError } from './utils/errors.js';

/**
 * Absolute path to the Vite `dist` folder. When set and the directory exists,
 * the API also serves the web UI (static assets + SPA fallback for client routes).
 */
function resolveWebUiDist(): string | null {
  const raw = process.env.WEB_UI_DIST?.trim();
  if (!raw) {
    return null;
  }
  const abs = resolve(raw);
  return existsSync(abs) ? abs : null;
}

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  registerRoutes(app);

  const webDist = resolveWebUiDist();
  if (webDist) {
    app.use(express.static(webDist, { index: false }));
    const sendSpa: express.RequestHandler = (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      const indexPath = join(webDist, 'index.html');
      if (!existsSync(indexPath)) {
        next();
        return;
      }
      res.sendFile(indexPath, (err) => {
        if (err) {
          next(err);
        }
      });
    };
    app.get('*', sendSpa);
    app.head('*', sendSpa);
  }

  app.use((_req, _res, next) => {
    next(new HttpError(404, 'Not Found', 'NOT_FOUND'));
  });

  app.use(errorHandler);

  return app;
}
