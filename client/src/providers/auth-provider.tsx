import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requestOtp: (phone: string) => Promise<{ deliveryChannel: 'whatsapp' | 'sms' | 'console'; expiresInSeconds: number }>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: 'mock-admin-id',
    email: 'admin@medcounsel.ai',
    firstName: 'Swaraj',
    lastName: 'Sah',
    phone: '+919999999999',
    role: 'ADMIN',
    isVerified: true,
    neetScore: 685,
    neetRank: 1204,
    state: 'Maharashtra',
    category: 'General',
  });
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!user;

  // Check if user has active session on mount
  // Skip profile fetch when running with mock user (MVP mode)
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && token !== 'mock') {
      authService
        .getProfile()
        .then((res) => {
          if (res.success && res.data?.user) {
            setUser(res.data.user);
          }
        })
        .catch(() => {
          // Don't clear mock user — only remove the stale token
          localStorage.removeItem('accessToken');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    try {
      const res = await authService.requestOtp(phone);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.message || 'Failed to send OTP');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to request OTP';
      throw new Error(message);
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    try {
      const res = await authService.verifyOtp(phone, otp);
      if (res.success && res.data?.accessToken) {
        localStorage.setItem('accessToken', res.data.accessToken);
        setUser(res.data.user);
      } else {
        throw new Error(res.message || 'OTP verification failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Verification failed';
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Continue cleanup on failure
    }
    localStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await authService.getProfile();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      }
    } catch {
      // Gracefully ignore failures on passive refresh
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        requestOtp,
        verifyOtp,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
export default AuthProvider;
