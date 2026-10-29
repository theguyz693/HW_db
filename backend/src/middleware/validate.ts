// ──────────────────────────────────────────────
// Request validation middleware using Zod
// ──────────────────────────────────────────────

import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../shared/errors/ValidationError.js';

/**
 * Middleware factory that validates request body, query, or params against a Zod schema.
 * If validation fails, throws a ValidationError with structured details.
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // Replace with parsed (cleaned) data
      (req as Record<string, unknown>)[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.');
          const key = path || '_root';
          if (!details[key]) details[key] = [];
          details[key].push(issue.message);
        }

        throw new ValidationError('Validation failed', details);
      }
      throw error;
    }
  };
}
