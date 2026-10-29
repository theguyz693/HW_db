// ──────────────────────────────────────────────
// Async handler — wraps async route handlers to catch errors
// ──────────────────────────────────────────────

import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async Express route handler so that rejected promises
 * are automatically forwarded to the error-handling middleware.
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
