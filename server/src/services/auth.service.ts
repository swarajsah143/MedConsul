import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { config } from '../config';
import { generateOtp } from '../utils/otp';
import { generateTokenPair, verifyRefreshToken } from '../utils/token';
import { phoneService } from './phone.service';
import { JwtPayload } from '../types';
import { AppError } from '../utils/errors';

const OTP_EXPIRY = 180; // 3 minutes in seconds
const RATE_LIMIT_WINDOW = 600; // 10 minutes in seconds
const MAX_OTP_SENDS = 3; // Max 3 OTPs in 10 minutes
const MAX_RETRY_ATTEMPTS = 3; // Max 3 wrong attempts per OTP

export class AuthService {
  /**
   * Helper to format phone number to E.164
   */
  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (!phone.startsWith('+')) {
      if (cleaned.length === 10) {
        return `+91${cleaned}`;
      }
      return `+${cleaned}`;
    }
    return `+${cleaned}`;
  }

  /**
   * Request OTP for Mobile Number Login
   */
  async requestMobileOtp(phone: string) {
    const formattedPhone = this.formatPhone(phone);

    // 1. Check Resend Throttling (minimum 60 seconds gap)
    const throttleKey = `otp_throttle:${formattedPhone}`;
    const isThrottled = await redis.get(throttleKey);
    if (isThrottled) {
      throw new AppError('Please wait 60 seconds before requesting another OTP.', 429);
    }

    // 2. Check Rate Limit (max 3 OTPs per 10 minutes)
    const rateKey = `otp_rate:${formattedPhone}`;
    const sendCount = await redis.get(rateKey);
    if (sendCount && parseInt(sendCount, 10) >= MAX_OTP_SENDS) {
      throw new AppError('Too many OTP requests. Please try again after 10 minutes.', 429);
    }

    // 3. Generate 6-digit OTP
    const otp = generateOtp(6);
    const otpKey = `otp_val:${formattedPhone}`;
    const attemptsKey = `otp_attempts:${formattedPhone}`;

    // 4. Save to Redis with Expiry (3 minutes)
    await redis.set(otpKey, otp, 'EX', OTP_EXPIRY);
    // Reset verify attempts for this new OTP
    await redis.set(attemptsKey, '0', 'EX', OTP_EXPIRY);

    // 5. Set Resend Throttle (60 seconds)
    await redis.set(throttleKey, '1', 'EX', 60);

    // 6. Increment Rate Limit Send Counter
    if (!sendCount) {
      await redis.set(rateKey, '1', 'EX', RATE_LIMIT_WINDOW);
    } else {
      await redis.incr(rateKey);
    }

    // 7. Deliver OTP (WhatsApp with SMS fallback)
    const delivery = await phoneService.sendOtp(formattedPhone, otp);

    return {
      message: `OTP sent successfully via ${delivery.channel}.`,
      deliveryChannel: delivery.channel,
      expiresInSeconds: OTP_EXPIRY,
    };
  }

  /**
   * Verify OTP and Login/Register User
   */
  async verifyMobileOtp(phone: string, otp: string) {
    const formattedPhone = this.formatPhone(phone);
    const otpKey = `otp_val:${formattedPhone}`;
    const attemptsKey = `otp_attempts:${formattedPhone}`;

    // 1. Get attempts count
    const attemptsStr = await redis.get(attemptsKey);
    if (attemptsStr === null) {
      throw new AppError('OTP expired or invalid. Please request a new one.', 400);
    }

    let attempts = parseInt(attemptsStr, 10);

    // 2. Increment attempts immediately
    attempts += 1;
    await redis.set(attemptsKey, String(attempts), 'EX', OTP_EXPIRY);

    // Check if max attempts reached
    if (attempts > MAX_RETRY_ATTEMPTS) {
      await redis.del(otpKey);
      await redis.del(attemptsKey);
      throw new AppError('Too many incorrect attempts. This OTP has been invalidated. Please request a new one.', 400);
    }

    // 3. Verify OTP code
    const storedOtp = await redis.get(otpKey);
    if (!storedOtp) {
      throw new AppError('OTP expired or invalid. Please request a new one.', 400);
    }

    if (storedOtp !== otp) {
      const remaining = MAX_RETRY_ATTEMPTS - attempts;
      throw new AppError(`Invalid OTP. You have ${remaining} attempts remaining.`, 400);
    }

    // OTP is correct - clear verification state from Redis
    await redis.del(otpKey);
    await redis.del(attemptsKey);

    // 4. Retrieve or Create User (Passwordless mobile-first signup)
    let user = await prisma.user.findUnique({
      where: { phone: formattedPhone },
    });

    let isNewUser = false;

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: formattedPhone,
          isVerified: true,
        },
      });
      isNewUser = true;
    } else if (!user.isVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    // 5. Generate Auth Tokens
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email || '',
      role: user.role,
    };

    const tokens = generateTokenPair(payload);

    // 6. Save Refresh Token in Redis for Session Control (30 Days TTL)
    await redis.set(
      `refresh_token:${user.id}`,
      tokens.refreshToken,
      'EX',
      30 * 24 * 60 * 60
    );

    return {
      message: isNewUser ? 'Registration successful' : 'Login successful',
      isNewUser,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        neetScore: user.neetScore,
        neetRank: user.neetRank,
        state: user.state,
        category: user.category,
      },
      tokens,
    };
  }

  /**
   * Refresh Token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);

      // Verify active session in Redis
      const storedToken = await redis.get(`refresh_token:${payload.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new AppError('Session expired or invalid refresh token.', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const newPayload: JwtPayload = {
        userId: user.id,
        email: user.email || '',
        role: user.role,
      };

      const tokens = generateTokenPair(newPayload);

      // Rotate Refresh Token
      await redis.set(
        `refresh_token:${user.id}`,
        tokens.refreshToken,
        'EX',
        30 * 24 * 60 * 60
      );

      return { tokens };
    } catch (error) {
      throw new AppError('Invalid refresh token. Please login again.', 401);
    }
  }

  /**
   * Logout (session invalidation)
   */
  async logout(userId: string) {
    await redis.del(`refresh_token:${userId}`);
    return { message: 'Logged out successfully' };
  }

  /**
   * Fetch current profile details
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        neetScore: true,
        neetRank: true,
        category: true,
        state: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }
}
