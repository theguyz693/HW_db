// ──────────────────────────────────────────────
// User controller
// ──────────────────────────────────────────────

import type { Request, Response } from 'express';
import { userService } from './user.service.js';
import { UnauthorizedError } from '../../shared/errors/UnauthorizedError.js';

export class UserController {
  /** GET /users/me — Get current user's profile */
  async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    const user = await userService.getById(req.user.userId);
    res.json({ success: true, data: user });
  }

  /** PATCH /users/me — Update current user's profile */
  async updateMe(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    const user = await userService.updateProfile(req.user.userId, req.body);
    res.json({ success: true, data: user });
  }

  /** PATCH /users/me/preferences — Update preferences */
  async updatePreferences(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    const user = await userService.updatePreferences(req.user.userId, req.body);
    res.json({ success: true, data: user });
  }

  /** GET /users/:username — Get public profile */
  async getByUsername(req: Request, res: Response): Promise<void> {
    const user = await userService.getByUsername(req.params['username']!);
    // Only return public-safe fields
    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        stats: user.stats,
      },
    });
  }
}

export const userController = new UserController();
