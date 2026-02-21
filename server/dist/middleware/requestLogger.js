export function requestLogger(req, res, next) {
    res.on("finish", () => {
        const status = res.statusCode;
        const errCode = res.locals?.errorCode;
        const line = errCode && status >= 400 ? `${req.method} ${req.path} ${status} ${errCode}` : `${req.method} ${req.path} ${status}`;
        console.log(line);
    });
    next();
}
