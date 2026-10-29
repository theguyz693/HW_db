// ──────────────────────────────────────────────
// User service — business logic for user management
// ──────────────────────────────────────────────

import type { User, UpdateUserDTO, UpdatePreferencesDTO } from '@collectorhub/shared-types';
import { userRepository } from './user.repository.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import type { IUser } from './user.model.js';

function toUserDTO(user: IUser): User {
  const obj = user.toJSON();
  return {
    ...obj,
    _id: user._id.toString(),
  } as User;
}

export class UserService {
  async getById(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return toUserDTO(user);
  }

  async getByUsername(username: string): Promise<User> {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundError('User', username);
    }
    return toUserDTO(user);
  }

  async updateProfile(userId: string, data: UpdateUserDTO): Promise<User> {
    const user = await userRepository.updateProfile(userId, data);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return toUserDTO(user);
  }

  async updatePreferences(userId: string, data: UpdatePreferencesDTO): Promise<User> {
    const user = await userRepository.updatePreferences(userId, data);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return toUserDTO(user);
  }
}

export const userService = new UserService();
