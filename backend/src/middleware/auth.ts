// ──────────────────────────────────────────────
// JWT Authentication middleware
// ──────────────────────────────────────────────

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload, UserRole } from '@collectorhub/shared-types';
import { config } from '../config/index.js';
import { UnauthorizedError, ForbiddenError } from '../shared/errors/UnauthorizedError.js';

/**
 * Middleware that verifies the JWT access token from the Authorization header.
 * Attaches the decoded payload to `req.user`.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('No authentication token provided');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('No authentication token provided');
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}

/**
 * Middleware factory that restricts access to specific roles.
 * Must be used AFTER authenticate middleware.
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }

    next();
  };
}
