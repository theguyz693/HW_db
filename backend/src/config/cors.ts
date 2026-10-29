// ──────────────────────────────────────────────
// CORS configuration
// ──────────────────────────────────────────────

import type { CorsOptions } from 'cors';
import { config } from './index.js';

export const corsOptions: CorsOptions = {
  origin: config.cors.origin.split(',').map((o) => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
};
