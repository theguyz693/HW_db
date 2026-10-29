// ──────────────────────────────────────────────
// Auth API methods
// ──────────────────────────────────────────────

import type { ApiClient } from './client.js';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  AuthTokens,
} from '@collectorhub/shared-types';

export function createAuthApi(client: ApiClient) {
  return {
    login: (data: LoginRequest) =>
      client.post<AuthResponse>('/auth/login', data),

    register: (data: RegisterRequest) =>
      client.post<AuthResponse>('/auth/register', data),

    refresh: (refreshToken: string) =>
      client.post<AuthTokens>('/auth/refresh', { refreshToken }),

    logout: (refreshToken: string) =>
      client.post<{ message: string }>('/auth/logout', { refreshToken }),
  };
}
