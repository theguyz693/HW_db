// ──────────────────────────────────────────────
// Auth service — business logic for authentication
// ──────────────────────────────────────────────

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { AuthResponse, JwtPayload } from '@collectorhub/shared-types';
import { config } from '../../config/index.js';
import { userRepository } from '../users/user.repository.js';
import { AppError } from '../../shared/errors/AppError.js';
import { UnauthorizedError } from '../../shared/errors/UnauthorizedError.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';
import type { RegisterInput, LoginInput } from './auth.validation.js';

const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Register a new user account.
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check for existing email
    const existingEmail = await userRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new ValidationError('An account with this email already exists');
    }

    // Check for existing username
    const existingUsername = await userRepository.findByUsername(input.username);
    if (existingUsername) {
      throw new ValidationError('This username is already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Create user
    const user = await userRepository.create({
      email: input.email,
      username: input.username,
      displayName: input.displayName,
      passwordHash,
    });

    // Generate tokens
    const tokens = this.generateTokens(user._id.toString(), user.role);

    // Store refresh token
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

    // Update last login
    await userRepository.updateLastLogin(user._id.toString());

    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * Authenticate an existing user.
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isPasswordValid = await user.comparePassword(input.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = this.generateTokens(user._id.toString(), user.role);

    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);
    await userRepository.updateLastLogin(user._id.toString());

    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * Refresh an access token using a valid refresh token.
   * Implements token rotation — old refresh token is invalidated.
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Hash the incoming token for comparison
    const tokenHash = this.hashToken(refreshToken);

    // Find user with this refresh token
    const user = await this.findUserByRefreshToken(tokenHash);
    if (!user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if the token is expired
    const tokenEntry = user.refreshTokens.find((t) => t.token === tokenHash);
    if (!tokenEntry || tokenEntry.expiresAt < new Date()) {
      // Remove expired token
      if (tokenEntry) {
        await userRepository.removeRefreshToken(user._id.toString(), tokenHash);
      }
      throw new UnauthorizedError('Refresh token has expired');
    }

    // Rotate: remove old token
    await userRepository.removeRefreshToken(user._id.toString(), tokenHash);

    // Generate new tokens
    const tokens = this.generateTokens(user._id.toString(), user.role);

    // Store new refresh token
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  /**
   * Logout — invalidate a specific refresh token.
   */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const user = await this.findUserByRefreshToken(tokenHash);
    if (user) {
      await userRepository.removeRefreshToken(user._id.toString(), tokenHash);
    }
  }

  // ── Private helpers ──

  private generateTokens(
    userId: string,
    role: string,
  ): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      { userId, role } as Omit<JwtPayload, 'iat' | 'exp'>,
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiry },
    );

    // Refresh token is a random string, not a JWT
    const refreshToken = crypto.randomBytes(64).toString('hex');

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async storeRefreshToken(userId: string, rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await userRepository.addRefreshToken(userId, {
      token: tokenHash,
      deviceInfo: '', // Will be populated with user-agent in controller
      expiresAt,
    });
  }

  private async findUserByRefreshToken(tokenHash: string) {
    const { UserModel } = await import('../users/user.model.js');
    return UserModel.findOne({ 'refreshTokens.token': tokenHash });
  }
}

export const authService = new AuthService();
