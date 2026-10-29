// ──────────────────────────────────────────────
// Request logger middleware
// ──────────────────────────────────────────────

import morgan from 'morgan';
import { config } from '../config/index.js';

export const requestLogger = config.isProduction
  ? morgan('combined')
  : morgan('dev');
