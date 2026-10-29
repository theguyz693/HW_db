// ──────────────────────────────────────────────
// User types
// ──────────────────────────────────────────────

import type { BaseEntity } from './common.js';

/** Available collection view modes */
export type ViewMode = 'gallery' | 'compact' | 'shelf' | 'table' | 'timeline';

/** Theme preference */
export type ThemePreference = 'light' | 'dark' | 'system';

/** Dashboard widget configuration */
export interface DashboardWidget {
  widgetId: string;
  position: number;
  visible: boolean;
  config: Record<string, unknown>;
}

/** User preferences */
export interface UserPreferences {
  theme: ThemePreference;
  defaultView: ViewMode;
  language: string;
  dashboardWidgets: DashboardWidget[];
}

/** User privacy settings */
export interface UserPrivacy {
  profilePublic: boolean;
  collectionsPublicByDefault: boolean;
}

/** Cached user statistics */
export interface UserStats {
  totalItems: number;
  totalCollections: number;
  totalValue: number;
  memberSince: string;
}

/** Full user profile */
export interface User extends BaseEntity {
  email: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string;
  preferences: UserPreferences;
  privacy: UserPrivacy;
  stats: UserStats;
  role: 'user' | 'moderator' | 'admin';
  isActive: boolean;
  lastLoginAt: string | null;
}

/** Public-facing user profile (no email, no private fields) */
export interface PublicUserProfile {
  _id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string;
  stats: UserStats;
}

/** Update user profile DTO */
export interface UpdateUserDTO {
  displayName?: string;
  bio?: string;
  avatar?: string;
}

/** Update user preferences DTO */
export interface UpdatePreferencesDTO {
  theme?: ThemePreference;
  defaultView?: ViewMode;
  language?: string;
  dashboardWidgets?: DashboardWidget[];
}
