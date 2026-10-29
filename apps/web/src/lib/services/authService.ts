// ──────────────────────────────────────────────
// Auth Service — Supabase Auth & Local Demo Integration
// ──────────────────────────────────────────────

import { supabase, isSupabaseConfigured } from '../supabase.ts';
import { mockDb } from '../mockDb.ts';
import type { AuthUser, User } from '@collectorhub/shared-types';

export const authService = {
  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        return {
          _id: session.user.id,
          email: session.user.email || '',
          username: profile?.username || session.user.email?.split('@')[0] || 'collector',
          displayName: profile?.display_name || session.user.user_metadata?.display_name || 'Collector',
          avatar: profile?.avatar_url || null,
          role: 'user',
        };
      } catch (err) {
        console.warn('Error fetching Supabase auth session:', err);
        return mockDb.getUser();
      }
    }

    return mockDb.getUser();
  },

  /**
   * Log in with Email and Password
   */
  async login(email: string, password?: string): Promise<AuthUser> {
    if (isSupabaseConfigured() && supabase && password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('User not found');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return {
        _id: data.user.id,
        email: data.user.email || email,
        username: profile?.username || data.user.email?.split('@')[0] || 'collector',
        displayName: profile?.display_name || 'Collector',
        avatar: profile?.avatar_url || null,
        role: 'user',
      };
    }

    // Local / Demo mode fallback
    return mockDb.login(email);
  },

  /**
   * Register a new user
   */
  async register(
    email: string,
    username: string,
    displayName: string,
    password?: string,
  ): Promise<AuthUser> {
    if (isSupabaseConfigured() && supabase && password) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: displayName,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Registration failed');

      // Create profile row if trigger didn't catch it
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        username,
        display_name: displayName,
      });

      return {
        _id: data.user.id,
        email,
        username,
        displayName,
        avatar: null,
        role: 'user',
      };
    }

    // Local fallback
    return mockDb.register(email, username, displayName);
  },

  /**
   * Sign out
   */
  async logout(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    mockDb.logout();
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<User | null> {
    if (isSupabaseConfigured() && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (updates.displayName !== undefined) payload.display_name = updates.displayName;
        if (updates.bio !== undefined) payload.bio = updates.bio;
        if (updates.avatar !== undefined) payload.avatar_url = updates.avatar;
        if (updates.preferences) payload.preferences = updates.preferences;
        if (updates.privacy) payload.privacy = updates.privacy;

        await supabase.from('profiles').update(payload).eq('id', session.user.id);
      }
    }

    return mockDb.updateUserProfile(updates);
  },
};
