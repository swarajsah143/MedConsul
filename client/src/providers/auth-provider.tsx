import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { googleLogout } from '@react-oauth/google';
import { api, markLoggedOut, clearLoggedOut } from '@/lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  /** Subscription tier + expiry (from toSafe → /auth/me). Drives feature gating; see usePlan(). */
  plan?: 'free' | 'pro' | 'premium';
  planExpiresAt?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<AuthUser>;
  loginWithGoogle: (idToken: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; resetToken?: string }>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Restore the session on mount.
   *
   * This used to give up the moment localStorage had no accessToken — so the
   * httpOnly refresh cookie (valid 7 days) was never used to restore a session.
   * The access token lives 15 minutes, which meant: sit on the site for a quarter
   * of an hour, press reload, and you were dumped on the login page despite holding
   * a week-long valid session. "Remember me" did nothing.
   *
   * Now: try the access token, and fall back to the refresh cookie.
   */
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const token = localStorage.getItem('accessToken');

      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.success && res.data?.user) {
            if (!cancelled) { setUser(res.data.user); setIsLoading(false); }
            return;
          }
        } catch {
          localStorage.removeItem('accessToken');   // expired or invalid; fall through
        }
      }

      // No usable access token — exchange the refresh cookie for a new one.
      try {
        const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        const data = await r.json().catch(() => null);
        if (r.ok && data?.success && data.data?.accessToken) {
          localStorage.setItem('accessToken', data.data.accessToken);
          if (data.data.user) {
            if (!cancelled) setUser(data.data.user);
          } else {
            const me = await api.get('/auth/me');
            if (me.success && me.data?.user && !cancelled) setUser(me.data.user);
          }
        }
      } catch {
        /* no valid refresh cookie — stay logged out */
      }

      if (!cancelled) setIsLoading(false);
    };

    restore();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string, remember = false) => {
    clearLoggedOut();
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      localStorage.setItem('accessToken', res.data.accessToken);
      if (remember) localStorage.setItem('rememberEmail', email);
      else localStorage.removeItem('rememberEmail');
      setUser(res.data.user);
      return res.data.user as AuthUser;
    }
    throw { message: res.message || 'Login failed' };
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    clearLoggedOut();
    const res = await api.post('/auth/google', { idToken });
    if (res.success && res.data) {
      localStorage.setItem('accessToken', res.data.accessToken);
      setUser(res.data.user);
      return res.data.user as AuthUser;
    }
    throw { message: res.message || 'Google sign-in failed' };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    clearLoggedOut();
    const res = await api.post('/auth/register', { name, email, password });
    if (res.success && res.data) {
      localStorage.setItem('accessToken', res.data.accessToken);
      setUser(res.data.user);
    } else {
      throw { message: res.message || 'Registration failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    // 1. Prevent in-flight requests from re-setting the token
    markLoggedOut();
    // 2. Clear storage
    localStorage.removeItem('accessToken');
    sessionStorage.clear();
    // 3. Clear user state — triggers ProtectedRoute → <Navigate to="/login">
    setUser(null);
    // 4. Invalidate server session (fire and forget, don't block UI)
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    // 5. Drop Google's client-side auto-select session so the next visit doesn't
    // silently re-sign the same Google account back in via One Tap.
    googleLogout();
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const res = await api.post('/auth/forgot-password', { email });
    if (!res.success) throw { message: res.message };
    return { message: res.message, resetToken: res.resetToken };
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    const res = await api.post('/auth/reset-password', { token, password });
    if (!res.success) throw { message: res.message };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        register,
        logout,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
