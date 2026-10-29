// ──────────────────────────────────────────────
// Auth Context — manages authentication state (Supabase & Local)
// ──────────────────────────────────────────────

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authService } from '@/lib/services/authService.ts';
import { supabase, isSupabaseConfigured } from '@/lib/supabase.ts';
import { mockDb } from '@/lib/mockDb.ts';
import type { AuthUser } from '@collectorhub/shared-types';

// ── State ──

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'AUTH_SUCCESS'; payload: AuthUser }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_LOADED' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOADING':
      return { ...state, isLoading: true };
    case 'AUTH_SUCCESS':
      return { user: action.payload, isAuthenticated: true, isLoading: false };
    case 'AUTH_LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false };
    case 'AUTH_LOADED':
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

// ── Context ──

interface AuthContextValue extends AuthState {
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, username: string, displayName: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check for existing session on mount & subscribe to Supabase Auth changes
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const user = await authService.getCurrentUser();
        if (mounted) {
          if (user) {
            dispatch({ type: 'AUTH_SUCCESS', payload: user });
          } else {
            // Default demo collector for showcase
            const demoUser = mockDb.login('collector@example.com');
            dispatch({ type: 'AUTH_SUCCESS', payload: demoUser });
          }
        }
      } catch (err) {
        console.warn('Auth init session failed:', err);
        if (mounted) dispatch({ type: 'AUTH_LOADED' });
      }
    }

    initSession();

    // If Supabase is configured, listen to auth state changes
    if (isSupabaseConfigured() && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN' && session?.user) {
          const user = await authService.getCurrentUser();
          if (user && mounted) {
            dispatch({ type: 'AUTH_SUCCESS', payload: user });
          }
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password?: string) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const user = await authService.login(email, password);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'AUTH_LOADED' });
      throw error;
    }
  }, []);

  const register = useCallback(
    async (email: string, username: string, displayName: string, password?: string) => {
      dispatch({ type: 'AUTH_LOADING' });
      try {
        const user = await authService.register(email, username, displayName, password);
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
      } catch (error) {
        dispatch({ type: 'AUTH_LOADED' });
        throw error;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      await authService.logout();
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      dispatch({ type: 'AUTH_LOADED' });
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
