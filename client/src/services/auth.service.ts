import { api } from '@/lib/api';
import type { AuthResponse, ApiResponse } from '@/types';

export const authService = {
  /**
   * Request mobile OTP (WhatsApp with SMS fallback)
   */
  async requestOtp(phone: string) {
    const res = await api.post<ApiResponse<{ deliveryChannel: 'whatsapp' | 'sms' | 'console'; expiresInSeconds: number }>>(
      '/auth/request-otp',
      { phone }
    );
    return res.data;
  },

  /**
   * Verify mobile OTP
   */
  async verifyOtp(phone: string, otp: string) {
    const res = await api.post<AuthResponse>('/auth/verify-otp', { phone, otp });
    return res.data;
  },

  /**
   * Fetch current user profile details
   */
  async getProfile() {
    const res = await api.get<ApiResponse<{ user: any }>>('/auth/me');
    return res.data;
  },

  /**
   * Log out active session
   */
  async logout() {
    const res = await api.post<ApiResponse>('/auth/logout');
    localStorage.removeItem('accessToken');
    return res.data;
  },
};
export default authService;
