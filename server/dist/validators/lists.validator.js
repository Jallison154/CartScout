/**
 * Zod schemas for list and list-item request bodies. Use at service entry; throw AppError.validation on fail.
 */
import { z } from "zod";
import { AppError } from "../types/index.js";
const listTypeEnum = z.enum(["current_week", "next_order", "custom"]);
const LIST_NAME_MAX = 200;
const FREE_TEXT_MAX = 500;
const ID_MAX = 64;
export const createListBodySchema = z.object({
    name: z.string().max(LIST_NAME_MAX, "Name too long").optional().transform((s) => (s != null && typeof s === "string" ? (s.trim() || undefined) : undefined)),
    list_type: listTypeEnum.optional(),
    week_start: z.string().max(32).optional().nullable(),
});
export const updateListBodySchema = z.object({
    name: z.string().max(LIST_NAME_MAX, "Name too long").optional().transform((s) => (s != null && typeof s === "string" ? s.trim() : undefined)),
    list_type: listTypeEnum.optional(),
    week_start: z.union([z.string().max(32), z.literal("")]).optional().transform((v) => (v === "" ? null : v)),
});
export const addListItemBodySchema = z.object({
    canonical_product_id: z.string().max(ID_MAX).optional().nullable(),
    free_text: z.string().max(FREE_TEXT_MAX, "Free text too long").optional().transform((s) => (s != null && typeof s === "string" ? s.trim() || null : null)),
    quantity: z.number().positive().optional(),
}).refine((data) => (typeof data.canonical_product_id === "string" && data.canonical_product_id.trim() !== "") ||
    (typeof data.free_text === "string" && data.free_text.trim() !== ""), { message: "Provide canonical_product_id or free_text" });
export const updateListItemBodySchema = z.object({
    quantity: z.number().positive().optional(),
    checked: z.boolean().optional(),
});
export const setListStoresBodySchema = z.object({
    store_ids: z.array(z.string().max(ID_MAX)).max(50, "Too many stores").optional().default([]),
});
function formatZodError(error) {
    const first = error.errors[0];
    return first ? first.message : "Validation failed";
}
export function parseCreateListBody(body) {
    const result = createListBodySchema.safeParse(body);
    if (!result.success) {
        throw AppError.validation(formatZodError(result.error));
    }
    return result.data;
}
export function parseUpdateListBody(body) {
    const result = updateListBodySchema.safeParse(body);
    if (!result.success) {
        throw AppError.validation(formatZodError(result.error));
    }
    return result.data;
}
export function parseAddListItemBody(body) {
    const result = addListItemBodySchema.safeParse(body);
    if (!result.success) {
        throw AppError.validation(formatZodError(result.error));
    }
    return result.data;
}
export function parseUpdateListItemBody(body) {
    const result = updateListItemBodySchema.safeParse(body);
    if (!result.success) {
        throw AppError.validation(formatZodError(result.error));
    }
    return result.data;
}
export function parseSetListStoresBody(body) {
    const result = setListStoresBodySchema.safeParse(body);
    if (!result.success) {
        throw AppError.validation(formatZodError(result.error));
    }
    return result.data;
}
