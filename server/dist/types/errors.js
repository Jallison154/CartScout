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
};
export class AppError extends Error {
    code;
    statusCode;
    constructor(message, code = "INTERNAL_ERROR", statusCode = 500) {
        super(message);
        this.name = "AppError";
        this.code = code;
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, AppError.prototype);
    }
    static validation(message) {
        return new AppError(message, "VALIDATION_ERROR", 400);
    }
    static unauthorized(message = "Unauthorized") {
        return new AppError(message, "UNAUTHORIZED", 401);
    }
    static forbidden(message = "Forbidden") {
        return new AppError(message, "FORBIDDEN", 403);
    }
    static notFound(message = "Not found") {
        return new AppError(message, "NOT_FOUND", 404);
    }
    static conflict(message) {
        return new AppError(message, "CONFLICT", 409);
    }
}
