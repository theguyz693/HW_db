// ──────────────────────────────────────────────
// User repository — data access layer
// ──────────────────────────────────────────────

import { UserModel, type IUser } from './user.model.js';
import type { UpdateUserDTO, UpdatePreferencesDTO } from '@collectorhub/shared-types';

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase() });
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return UserModel.findOne({ username: username.toLowerCase() });
  }

  async create(data: {
    email: string;
    username: string;
    displayName: string;
    passwordHash: string;
  }): Promise<IUser> {
    return UserModel.create(data);
  }

  async updateProfile(userId: string, data: UpdateUserDTO): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(userId, { $set: data }, { new: true });
  }

  async updatePreferences(
    userId: string,
    data: UpdatePreferencesDTO,
  ): Promise<IUser | null> {
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      update[`preferences.${key}`] = value;
    }
    return UserModel.findByIdAndUpdate(userId, { $set: update }, { new: true });
  }

  async addRefreshToken(
    userId: string,
    tokenData: { token: string; deviceInfo: string; expiresAt: Date },
  ): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $push: { refreshTokens: tokenData },
    });
  }

  async removeRefreshToken(userId: string, tokenHash: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { token: tokenHash } },
    });
  }

  async removeAllRefreshTokens(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [] },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $set: { lastLoginAt: new Date() },
    });
  }

  async incrementStats(
    userId: string,
    field: 'totalItems' | 'totalCollections',
    amount: number,
  ): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $inc: { [`stats.${field}`]: amount },
    });
  }
}

export const userRepository = new UserRepository();
