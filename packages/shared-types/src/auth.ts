// ──────────────────────────────────────────────
// Authentication types
// ──────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface AuthUser {
  _id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string | null;
  role: UserRole;
}

export type UserRole = 'user' | 'moderator' | 'admin';

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
}
