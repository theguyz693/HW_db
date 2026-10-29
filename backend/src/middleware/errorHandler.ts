// ──────────────────────────────────────────────
// Global error handling middleware
// ──────────────────────────────────────────────

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError.js';
import { logger } from '../config/logger.js';
import { config } from '../config/index.js';

/**
 * Global error handler — catches all errors passed via next(err).
 * Formats operational errors (AppError) into structured JSON responses.
 * Logs unexpected errors with full stack traces in development.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle AppError (expected/operational errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.message,
      },
    });
    return;
  }

  // Handle Mongoose duplicate key errors
  if (err.name === 'MongoServerError' && 'code' in err && (err as Record<string, unknown>)['code'] === 11000) {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: 'A resource with that value already exists',
      },
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
      },
    });
    return;
  }

  // Unexpected errors — log full details, return generic message
  logger.error('Unexpected error:', err.message, err.stack);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProduction
        ? 'An unexpected error occurred'
        : err.message,
      ...(config.isDevelopment && { stack: err.stack }),
    },
  });
}
