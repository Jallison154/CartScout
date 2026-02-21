/**
 * Zod schemas for stores request bodies. Use at route handler; throw AppError.validation on fail.
 */
import { z } from "zod";
import { AppError } from "../types/index.js";

const STORE_ID_MAX = 64;

export const addFavoriteBodySchema = z.object({
  store_id: z.string().min(1, "store_id is required").max(STORE_ID_MAX, "store_id too long").trim(),
});

export type AddFavoriteBody = z.infer<typeof addFavoriteBodySchema>;

function formatZodError(error: z.ZodError): string {
  const first = error.errors[0];
  return first ? (first.message as string) : "Validation failed";
}

export function parseAddFavoriteBody(body: unknown): AddFavoriteBody {
  const result = addFavoriteBodySchema.safeParse(body);
  if (!result.success) {
    throw AppError.validation(formatZodError(result.error));
  }
  return result.data;
}
