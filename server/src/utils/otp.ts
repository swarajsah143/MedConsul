import crypto from 'crypto';
import { config } from '../config';

/**
 * Generate a cryptographically secure numeric OTP
 */
export function generateOtp(length: number = config.otp.length): string {
  const digits = '0123456789';
  let otp = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
}

/**
 * Get OTP expiry timestamp
 */
export function getOtpExpiry(minutes: number = config.otp.expiryMinutes): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Get Redis key for OTP storage
 */
export function getOtpRedisKey(email: string, purpose: string): string {
  return `otp:${purpose.toLowerCase()}:${email.toLowerCase()}`;
}

/**
 * Get Redis key for OTP rate limiting
 */
export function getOtpRateLimitKey(email: string): string {
  return `otp_rate:${email.toLowerCase()}`;
}
