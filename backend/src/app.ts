// ──────────────────────────────────────────────
// Express application factory
// ──────────────────────────────────────────────

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { corsOptions } from './config/cors.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './modules/auth/index.js';
import { userRoutes } from './modules/users/index.js';

export function createApp(): express.Application {
  const app = express();

  // ── Security middleware ──
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(mongoSanitize());

  // ── Body parsing ──
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Logging ──
  app.use(requestLogger);

  // ── Rate limiting ──
  app.use('/api/', apiLimiter);

  // ── Health check ──
  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  // ── API Routes ──
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);

  // ── 404 handler ──
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  });

  // ── Global error handler (must be last) ──
  app.use(errorHandler);

  return app;
}
