/**
 * Zod schemas for auth request bodies. Use at service entry; throw AppError.validation on fail.
 */
import { z } from "zod";
import { AppError } from "../types/index.js";

const EMAIL_MAX = 255;
const PASSWORD_MAX = 128;

export const registerBodySchema = z.object({
  email: z.string().min(1, "Email and password are required").max(EMAIL_MAX, "Email too long").transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1, "Email and password are required").max(PASSWORD_MAX, "Password too long"),
}).refine((data) => data.email.length >= 3, { message: "Invalid email", path: ["email"] })
  .refine((data) => data.password.length >= 8, { message: "Password must be at least 8 characters", path: ["password"] });

export const loginBodySchema = z.object({
  email: z.string().min(1, "Email and password are required").max(EMAIL_MAX, "Email too long").transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1, "Email and password are required").max(PASSWORD_MAX, "Password too long"),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required").max(1024, "refreshToken too long"),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;

function formatZodError(error: z.ZodError): string {
  const first = error.errors[0];
  return first ? (first.message as string) : "Validation failed";
}

export function parseRegisterBody(body: unknown): RegisterBody {
  const result = registerBodySchema.safeParse(body);
  if (!result.success) {
    throw AppError.validation(formatZodError(result.error));
  }
  return result.data;
}

export function parseLoginBody(body: unknown): LoginBody {
  const result = loginBodySchema.safeParse(body);
  if (!result.success) {
    throw AppError.validation(formatZodError(result.error));
  }
  return result.data;
}

export function parseRefreshBody(body: unknown): RefreshBody {
  const result = refreshBodySchema.safeParse(body);
  if (!result.success) {
    throw AppError.validation(formatZodError(result.error));
  }
  return result.data;
}
