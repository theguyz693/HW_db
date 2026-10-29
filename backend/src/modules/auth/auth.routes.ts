// ──────────────────────────────────────────────
// Auth routes
// ──────────────────────────────────────────────

import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.validation.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

// Apply stricter rate limiting to all auth routes
router.use(authLimiter);

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(authController.register.bind(authController)),
);

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(authController.login.bind(authController)),
);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  asyncHandler(authController.refresh.bind(authController)),
);

router.post(
  '/logout',
  validate(refreshTokenSchema),
  asyncHandler(authController.logout.bind(authController)),
);

export const authRoutes = router;
