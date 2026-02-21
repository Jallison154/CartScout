/**
 * Lists and list items. API under /api/v1/lists.
 * Supports ?include=items for mobile (one request per list).
 */
import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { sendSuccess, asyncHandler } from "../middleware/response.js";
import {
  getListsForUser,
  getListForUserWithItems,
  requireListForUser,
  getListStoreIds,
  createList,
  updateList,
  deleteList,
  setListStores,
  addListItem,
  updateListItem,
  deleteListItem,
} from "../services/lists.service.js";
import {
  parseCreateListBody,
  parseUpdateListBody,
  parseAddListItemBody,
  parseUpdateListItemBody,
  parseSetListStoresBody,
} from "../validators/lists.validator.js";

const router = Router();
router.use(requireAuth);

/** GET /api/v1/lists - list summaries; ?include=items to embed items */
router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const include = req.query.include === "items";
    const lists = getListsForUser(userId, include);
    sendSuccess(res, lists);
  })
);

/** POST /api/v1/lists */
router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const body = parseCreateListBody(req.body);
    const list = createList(userId, body);
    res.status(201);
    sendSuccess(res, list, undefined);
  })
);

/** GET /api/v1/lists/:id - single list; ?include=items */
router.get(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const includeItems = req.query.include === "items";
    const list = getListForUserWithItems(userId, id, includeItems);
    sendSuccess(res, list);
  })
);

/** GET /api/v1/lists/:id/stores - store ids for this list */
router.get(
  "/:id/stores",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    requireListForUser(userId, id);
    const storeIds = getListStoreIds(id);
    sendSuccess(res, storeIds);
  })
);

/** PUT /api/v1/lists/:id/stores - set stores for this list (body: { store_ids: string[] }) */
router.put(
  "/:id/stores",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const body = parseSetListStoresBody(req.body);
    const result = setListStores(userId, id, body.store_ids);
    sendSuccess(res, result);
  })
);

/** PATCH /api/v1/lists/:id */
router.patch(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const body = parseUpdateListBody(req.body);
    const list = updateList(userId, id, body);
    sendSuccess(res, list);
  })
);

/** DELETE /api/v1/lists/:id */
router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    deleteList(userId, id);
    res.status(204).send();
  })
);

/** POST /api/v1/lists/:id/items */
router.post(
  "/:id/items",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id: listId } = req.params;
    const body = parseAddListItemBody(req.body);
    const item = addListItem(userId, listId, body);
    res.status(201);
    sendSuccess(res, item, undefined);
  })
);

/** PATCH /api/v1/lists/:id/items/:itemId - update quantity, checked, etc. */
router.patch(
  "/:id/items/:itemId",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id: listId, itemId } = req.params;
    const body = parseUpdateListItemBody(req.body);
    const item = updateListItem(userId, listId, itemId, body);
    sendSuccess(res, item);
  })
);

/** DELETE /api/v1/lists/:id/items/:itemId */
router.delete(
  "/:id/items/:itemId",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id: listId, itemId } = req.params;
    deleteListItem(userId, listId, itemId);
    res.status(204).send();
  })
);

export default router;
