export function sendSuccess(res, data, meta) {
    const body = { data };
    if (meta)
        body.meta = meta;
    res.json(body);
}
export function sendError(res, code, message, statusCode = 400) {
    const body = { error: { code, message } };
    res.status(statusCode).json(body);
}
/** Async route wrapper: AppError → JSON error response; other errors → 500 INTERNAL_ERROR */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((err) => {
            const isAppError = err?.name === "AppError" && typeof err?.code === "string" && typeof err?.statusCode === "number";
            const code = isAppError ? err.code : "INTERNAL_ERROR";
            const message = err?.message && typeof err.message === "string" ? err.message : "An unexpected error occurred";
            const status = isAppError ? err.statusCode : 500;
            sendError(res, code, message, status);
        });
    };
}
