/**
 * Lists and list items. API under /api/v1/lists.
 * Supports ?include=items for mobile (one request per list).
 */
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../db/client.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { sendSuccess, sendError, asyncHandler } from "../middleware/response.js";

const router = Router();
router.use(requireAuth);

/** GET /api/v1/lists - list summaries; ?include=items to embed items */
router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const include = req.query.include === "items";

    const lists = db.prepare(
      "SELECT id, name, list_type, week_start, created_at, updated_at FROM lists WHERE user_id = ? ORDER BY updated_at DESC"
    ).all(userId) as Array<{ id: string; name: string; list_type: string; week_start: string | null; created_at: string; updated_at: string }>;

    if (!include) {
      sendSuccess(res, lists);
      return;
    }

    const result = await Promise.all(
      lists.map((list) => {
        const items = db.prepare(
          `SELECT li.id, li.canonical_product_id, li.free_text, li.quantity, li.estimated_weight_override, li.sort_order, li.checked, li.created_at,
                  cp.display_name, cp.brand, cp.size_description, cp.upc
           FROM list_items li
           LEFT JOIN canonical_products cp ON cp.id = li.canonical_product_id
           WHERE li.list_id = ?
           ORDER BY li.sort_order, li.created_at`
        ).all(list.id) as Array<Record<string, unknown>>;
        return { ...list, items };
      })
    );
    sendSuccess(res, result);
  })
);

/** POST /api/v1/lists */
router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { name, list_type, week_start } = req.body as { name?: string; list_type?: string; week_start?: string };
    const listName = (name && typeof name === "string") ? name.trim() : "New list";
    const type = list_type === "current_week" || list_type === "next_order" ? list_type : "custom";
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO lists (id, user_id, name, list_type, week_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, userId, listName, type, week_start || null, now, now);

    const list = db.prepare(
      "SELECT id, name, list_type, week_start, created_at, updated_at FROM lists WHERE id = ?"
    ).get(id) as Record<string, unknown>;
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
    const list = db.prepare(
      "SELECT id, name, list_type, week_start, created_at, updated_at FROM lists WHERE id = ? AND user_id = ?"
    ).get(id, userId) as Record<string, unknown> | undefined;
    if (!list) {
      sendError(res, "NOT_FOUND", "List not found", 404);
      return;
    }
    if (req.query.include === "items") {
      const items = db.prepare(
        `SELECT li.id, li.canonical_product_id, li.free_text, li.quantity, li.estimated_weight_override, li.sort_order, li.checked, li.created_at,
                cp.display_name, cp.brand, cp.size_description, cp.upc
         FROM list_items li
         LEFT JOIN canonical_products cp ON cp.id = li.canonical_product_id
         WHERE li.list_id = ?
         ORDER BY li.sort_order, li.created_at`
      ).all(id) as Array<Record<string, unknown>>;
      (list as Record<string, unknown>).items = items;
    }
    sendSuccess(res, list);
  })
);

/** PATCH /api/v1/lists/:id */
router.patch(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, list_type, week_start } = req.body as { name?: string; list_type?: string; week_start?: string };

    const existing = db.prepare("SELECT id FROM lists WHERE id = ? AND user_id = ?").get(id, userId);
    if (!existing) {
      sendError(res, "NOT_FOUND", "List not found", 404);
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined && typeof name === "string") {
      updates.push("name = ?");
      values.push(name.trim());
    }
    if (list_type === "current_week" || list_type === "next_order" || list_type === "custom") {
      updates.push("list_type = ?");
      values.push(list_type);
    }
    if (week_start !== undefined) {
      updates.push("week_start = ?");
      values.push(week_start === "" ? null : week_start);
    }
    if (updates.length === 0) {
      const list = db.prepare("SELECT id, name, list_type, week_start, created_at, updated_at FROM lists WHERE id = ?").get(id);
      sendSuccess(res, list);
      return;
    }
    updates.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE lists SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const list = db.prepare("SELECT id, name, list_type, week_start, created_at, updated_at FROM lists WHERE id = ?").get(id);
    sendSuccess(res, list);
  })
);

/** DELETE /api/v1/lists/:id */
router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const result = db.prepare("DELETE FROM lists WHERE id = ? AND user_id = ?").run(id, userId);
    if (result.changes === 0) {
      sendError(res, "NOT_FOUND", "List not found", 404);
      return;
    }
    res.status(204).send();
  })
);

/** POST /api/v1/lists/:id/items */
router.post(
  "/:id/items",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id: listId } = req.params;
    const { canonical_product_id, free_text, quantity } = req.body as {
      canonical_product_id?: string;
      free_text?: string;
      quantity?: number;
    };

    const list = db.prepare("SELECT id FROM lists WHERE id = ? AND user_id = ?").get(listId, userId);
    if (!list) {
      sendError(res, "NOT_FOUND", "List not found", 404);
      return;
    }

    const itemId = uuidv4();
    const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;
    const freeText = typeof free_text === "string" ? free_text.trim() : null;
    const productId = canonical_product_id || null;
    if (!productId && !freeText) {
      sendError(res, "VALIDATION_ERROR", "Provide canonical_product_id or free_text", 400);
      return;
    }

    const now = new Date().toISOString();
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM list_items WHERE list_id = ?").get(listId) as { next: number };
    db.prepare(
      `INSERT INTO list_items (id, list_id, canonical_product_id, free_text, quantity, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(itemId, listId, productId, freeText, qty, maxOrder.next, now);

    const item = db.prepare(
      "SELECT li.id, li.canonical_product_id, li.free_text, li.quantity, li.sort_order, li.checked, li.created_at, cp.display_name, cp.brand, cp.size_description FROM list_items li LEFT JOIN canonical_products cp ON cp.id = li.canonical_product_id WHERE li.id = ?"
    ).get(itemId);
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
    const { quantity, checked } = req.body as { quantity?: number; checked?: boolean };

    const list = db.prepare("SELECT id FROM lists WHERE id = ? AND user_id = ?").get(listId, userId);
    if (!list) {
      sendError(res, "NOT_FOUND", "List not found", 404);
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    if (typeof quantity === "number" && quantity > 0) {
      updates.push("quantity = ?");
      values.push(quantity);
    }
    if (typeof checked === "boolean") {
      updates.push("checked = ?");
      values.push(checked ? 1 : 0);
    }
    if (updates.length === 0) {
      const item = db.prepare(
        "SELECT li.id, li.canonical_product_id, li.free_text, li.quantity, li.sort_order, li.checked FROM list_items li WHERE li.id = ? AND li.list_id = ?"
      ).get(itemId, listId);
      sendSuccess(res, item);
      return;
    }
    values.push(itemId, listId);
    const result = db.prepare(`UPDATE list_items SET ${updates.join(", ")} WHERE id = ? AND list_id = ?`).run(...values);
    if (result.changes === 0) {
      sendError(res, "NOT_FOUND", "Item not found", 404);
      return;
    }
    const item = db.prepare(
      "SELECT li.id, li.canonical_product_id, li.free_text, li.quantity, li.sort_order, li.checked FROM list_items li WHERE li.id = ? AND li.list_id = ?"
    ).get(itemId, listId);
    sendSuccess(res, item);
  })
);

/** DELETE /api/v1/lists/:id/items/:itemId */
router.delete(
  "/:id/items/:itemId",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const { id: listId, itemId } = req.params;

    const list = db.prepare("SELECT id FROM lists WHERE id = ? AND user_id = ?").get(listId, userId);
    if (!list) {
      sendError(res, "NOT_FOUND", "List not found", 404);
      return;
    }
    const result = db.prepare("DELETE FROM list_items WHERE id = ? AND list_id = ?").run(itemId, listId);
    if (result.changes === 0) {
      sendError(res, "NOT_FOUND", "Item not found", 404);
      return;
    }
    res.status(204).send();
  })
);

export default router;
