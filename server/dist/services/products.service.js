/**
 * Product search for add-item suggestions. Routes call here; no DB in routes.
 */
import db from "../db/client.js";
const PRODUCT_SEARCH_COLUMNS = "id, display_name, brand, category, size_description, sold_by, image_url, source";
/** Search canonical products by display name or brand. Returns empty array if q is empty. */
export function searchProducts(q, limit = 15) {
    const trimmed = typeof q === "string" ? q.trim() : "";
    if (!trimmed) {
        return [];
    }
    const cappedLimit = Math.min(limit, 30);
    const pattern = `%${trimmed}%`;
    return db
        .prepare(`SELECT ${PRODUCT_SEARCH_COLUMNS}
       FROM canonical_products
       WHERE display_name LIKE ? OR (brand IS NOT NULL AND brand LIKE ?)
       ORDER BY display_name LIMIT ?`)
        .all(pattern, pattern, cappedLimit);
}
