import { logger } from '../config/logger.js';

export function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
}

export function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    logger.error('Unhandled request error', {
        method: req.method,
        path: req.originalUrl,
        error: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });

    const status = Number.isInteger(error.statusCode)
        ? error.statusCode
        : error.code === 11000
            ? 409
            : ['ValidationError', 'CastError'].includes(error.name)
                ? 400
                : 500;
    res.status(status).json({
        success: false,
        message: status === 500 ? 'Internal server error' : error.message
    });
}
