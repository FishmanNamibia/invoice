const db = require('../database/db');

// Error logging middleware
const errorLogger = async (err, req, res, next) => {
    // Skip logging if it's already been handled
    if (res.headersSent) {
        return next(err);
    }

    try {
        // Get user info from request (if authenticated)
        const userId = req.user?.userId || null;
        const companyId = req.user?.companyId || null;

        // Get IP and user agent
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';

        // Determine error level
        let errorLevel = 'error';
        if (err.status >= 500) {
            errorLevel = 'critical';
        } else if (err.status >= 400) {
            errorLevel = 'error';
        } else if (err.status >= 300) {
            errorLevel = 'warning';
        }

        // Extract error details
        const errorMessage = err.message || err.toString() || 'Unknown error';
        const errorStack = err.stack || null;
        const requestUrl = req.originalUrl || req.url || '';
        const requestMethod = req.method || '';
        const requestHeaders = req.headers || {};
        const requestBody = req.body || null;
        const responseStatus = err.status || 500;

        // Log to database
        await db.query(
            `INSERT INTO error_logs (
                error_level, error_message, error_stack, user_id, company_id,
                request_url, request_method, request_headers, request_body,
                response_status, ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                errorLevel,
                errorMessage,
                errorStack,
                userId,
                companyId,
                requestUrl,
                requestMethod,
                JSON.stringify(requestHeaders),
                requestBody ? JSON.stringify(requestBody) : null,
                responseStatus,
                ipAddress,
                userAgent
            ]
        );
    } catch (logError) {
        // If logging fails, at least log to console
        console.error('Failed to log error to database:', logError);
        console.error('Original error:', err);
    }

    // Continue with default error handling
    next(err);
};

// Helper function to manually log errors
const logError = async (error, req, level = 'error') => {
    try {
        const userId = req.user?.userId || null;
        const companyId = req.user?.companyId || null;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';

        await db.query(
            `INSERT INTO error_logs (
                error_level, error_message, error_stack, user_id, company_id,
                request_url, request_method, ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                level,
                error.message || error.toString(),
                error.stack || null,
                userId,
                companyId,
                req.originalUrl || req.url || '',
                req.method || '',
                ipAddress,
                userAgent
            ]
        );
    } catch (logError) {
        console.error('Failed to log error:', logError);
    }
};

module.exports = { errorLogger, logError };

