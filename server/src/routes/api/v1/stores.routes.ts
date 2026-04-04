import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validateBody } from '../../../middleware/validate.middleware.js';
import * as storeService from '../../../services/store.service.js';
import { parsePositiveIntParam } from '../../../utils/params.js';

const addFavoriteSchema = z.object({
  store_id: z.number().int().positive(),
});

export const storesRouter = Router();

storesRouter.use(requireAuth);

storesRouter.get('/', (_req, res, next) => {
  try {
    const data = storeService.listStores();
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

storesRouter.get('/favorites', (req, res, next) => {
  try {
    const data = storeService.listFavoriteStores(req.user!.id);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

storesRouter.post('/favorites', validateBody(addFavoriteSchema), (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof addFavoriteSchema>;
    const data = storeService.addFavoriteStore(req.user!.id, body.store_id);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

storesRouter.delete('/favorites/:storeId', (req, res, next) => {
  try {
    const storeId = parsePositiveIntParam(req.params.storeId, 'store id');
    storeService.removeFavoriteStore(req.user!.id, storeId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
