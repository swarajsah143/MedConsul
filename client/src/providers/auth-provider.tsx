import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, markLoggedOut, clearLoggedOut } from '@/lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; resetToken?: string }>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          if (res.success && res.data?.user) setUser(res.data.user);
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string, remember = false) => {
    clearLoggedOut();
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      localStorage.setItem('accessToken', res.data.accessToken);
      if (remember) localStorage.setItem('rememberEmail', email);
      else localStorage.removeItem('rememberEmail');
      setUser(res.data.user);
    } else {
      throw { message: res.message || 'Login failed' };
    }
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
