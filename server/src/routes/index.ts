import type { Express } from 'express';
import { apiV1Router } from './api/v1/index.js';
import { healthRouter } from './health.js';

export function registerRoutes(app: Express): void {
  app.use('/health', healthRouter);
  app.use('/api/v1', apiV1Router);
}
