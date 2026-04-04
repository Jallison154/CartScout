import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validateBody } from '../../../middleware/validate.middleware.js';
import * as listOptimizeService from '../../../services/listOptimize.service.js';
import * as listService from '../../../services/list.service.js';
import { parsePositiveIntParam } from '../../../utils/params.js';

const createListSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  list_type: z.string().trim().max(64).nullish(),
  week_start: z.string().trim().max(32).nullish(),
});

const patchListSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    list_type: z.string().trim().max(64).nullish(),
    week_start: z.string().trim().max(32).nullish(),
  })
  .refine(
    (b) =>
      b.name !== undefined ||
      b.list_type !== undefined ||
      b.week_start !== undefined,
    { message: 'At least one field is required' },
  );

const createItemSchema = z
  .object({
    free_text: z.string().trim().min(1).max(500).optional(),
    quantity: z.string().trim().max(64).nullish(),
    sort_order: z.number().int().nullish(),
    canonical_product_id: z.number().int().positive().nullish(),
  })
  .refine(
    (b) =>
      (b.free_text != null && b.free_text.length > 0) || b.canonical_product_id != null,
    { message: 'Provide free_text or canonical_product_id' },
  );

const patchItemSchema = z
  .object({
    free_text: z.union([z.string().trim().min(1).max(500), z.null()]).optional(),
    quantity: z.string().trim().max(64).nullish(),
    checked: z.boolean().optional(),
    sort_order: z.number().int().nullish(),
    canonical_product_id: z.number().int().positive().nullish(),
  })
  .refine(
    (b) =>
      b.free_text !== undefined ||
      b.quantity !== undefined ||
      b.checked !== undefined ||
      b.sort_order !== undefined ||
      b.canonical_product_id !== undefined,
    { message: 'At least one field is required' },
  );

export const listsRouter = Router();

listsRouter.use(requireAuth);

listsRouter.get('/', (req, res, next) => {
  try {
    const data = listService.listListsForUser(req.user!.id);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

listsRouter.post('/', validateBody(createListSchema), (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createListSchema>;
    const data = listService.createListForUser(req.user!.id, body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

listsRouter.get('/:listId/optimize', (req, res, next) => {
  try {
    const listId = parsePositiveIntParam(req.params.listId, 'list id');
    const data = listOptimizeService.optimizeListByStore(listId, req.user!.id);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

listsRouter.get('/:listId', (req, res, next) => {
  try {
    const listId = parsePositiveIntParam(req.params.listId, 'list id');
    const data = listService.getListDetailForUser(req.user!.id, listId);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

listsRouter.patch('/:listId', validateBody(patchListSchema), (req, res, next) => {
  try {
    const listId = parsePositiveIntParam(req.params.listId, 'list id');
    const body = req.body as z.infer<typeof patchListSchema>;
    const data = listService.updateListForUser(req.user!.id, listId, body);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

listsRouter.delete('/:listId', (req, res, next) => {
  try {
    const listId = parsePositiveIntParam(req.params.listId, 'list id');
    listService.deleteListForUser(req.user!.id, listId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

listsRouter.post('/:listId/items', validateBody(createItemSchema), (req, res, next) => {
  try {
    const listId = parsePositiveIntParam(req.params.listId, 'list id');
    const body = req.body as z.infer<typeof createItemSchema>;
    const data = listService.addItemForUser(req.user!.id, listId, body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

listsRouter.patch('/:listId/items/:itemId', validateBody(patchItemSchema), (req, res, next) => {
  try {
    const listId = parsePositiveIntParam(req.params.listId, 'list id');
    const itemId = parsePositiveIntParam(req.params.itemId, 'item id');
    const body = req.body as z.infer<typeof patchItemSchema>;
    const data = listService.updateItemForUser(req.user!.id, listId, itemId, body);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

listsRouter.delete('/:listId/items/:itemId', (req, res, next) => {
  try {
    const listId = parsePositiveIntParam(req.params.listId, 'list id');
    const itemId = parsePositiveIntParam(req.params.itemId, 'item id');
    listService.deleteItemForUser(req.user!.id, listId, itemId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
