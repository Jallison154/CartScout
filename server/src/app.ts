import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { registerRoutes } from './routes/index.js';
import { HttpError } from './utils/errors.js';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  registerRoutes(app);

  app.use((_req, _res, next) => {
    next(new HttpError(404, 'Not Found', 'NOT_FOUND'));
  });

  app.use(errorHandler);

  return app;
}
