// ──────────────────────────────────────────────
// Auth controller — HTTP request handling
// ──────────────────────────────────────────────

import type { Request, Response } from 'express';
import { authService } from './auth.service.js';
import type { RegisterInput, LoginInput } from './auth.validation.js';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const input = req.body as RegisterInput;
    const result = await authService.register(input);

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  async login(req: Request, res: Response): Promise<void> {
    const input = req.body as LoginInput;
    const result = await authService.login(input);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await authService.refresh(refreshToken);

    res.status(200).json({
      success: true,
      data: tokens,
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as { refreshToken: string };
    await authService.logout(refreshToken);

    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  }
}

export const authController = new AuthController();
