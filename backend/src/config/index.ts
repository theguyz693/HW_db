// ──────────────────────────────────────────────
// Configuration — loads and validates environment variables
// ──────────────────────────────────────────────

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['PORT'] || '4000', 10),
  isProduction: process.env['NODE_ENV'] === 'production',
  isDevelopment: process.env['NODE_ENV'] !== 'production',

  mongodb: {
    uri: process.env['MONGODB_URI'] || 'mongodb://localhost:27017/collectorhub',
  },

  jwt: {
    secret: process.env['JWT_SECRET'] || 'dev-secret-change-me',
    accessExpiry: process.env['JWT_ACCESS_EXPIRY'] || '15m',
    refreshExpiry: process.env['JWT_REFRESH_EXPIRY'] || '7d',
  },

  cors: {
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:5173',
  },

  upload: {
    dir: process.env['UPLOAD_DIR'] || './uploads',
    maxFileSize: parseInt(process.env['MAX_FILE_SIZE'] || '10485760', 10), // 10MB
  },
} as const;
