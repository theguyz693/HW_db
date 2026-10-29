// ──────────────────────────────────────────────
// User routes
// ──────────────────────────────────────────────

import { Router } from 'express';
import { userController } from './user.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

// Authenticated routes
router.get('/me', authenticate, asyncHandler(userController.getMe.bind(userController)));
router.patch('/me', authenticate, asyncHandler(userController.updateMe.bind(userController)));
router.patch(
  '/me/preferences',
  authenticate,
  asyncHandler(userController.updatePreferences.bind(userController)),
);

// Public routes
router.get('/:username', asyncHandler(userController.getByUsername.bind(userController)));

export const userRoutes = router;
