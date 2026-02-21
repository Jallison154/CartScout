/**
 * Standard API errors. Services throw AppError; middleware maps to JSON { error: { code, message } }.
 */
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(message: string, code: ErrorCode = "INTERNAL_ERROR", statusCode: number = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static validation(message: string): AppError {
    return new AppError(message, "VALIDATION_ERROR", 400);
  }

  static unauthorized(message: string = "Unauthorized"): AppError {
    return new AppError(message, "UNAUTHORIZED", 401);
  }

  static forbidden(message: string = "Forbidden"): AppError {
    return new AppError(message, "FORBIDDEN", 403);
  }

  static notFound(message: string = "Not found"): AppError {
    return new AppError(message, "NOT_FOUND", 404);
  }

  static conflict(message: string): AppError {
    return new AppError(message, "CONFLICT", 409);
  }
}
