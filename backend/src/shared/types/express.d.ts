// ──────────────────────────────────────────────
// Express type augmentation — adds user to Request
// ──────────────────────────────────────────────

import type { JwtPayload } from '@collectorhub/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
