import { UserModel, toSafe } from '../models/user.model';
import { TokenModel } from '../models/token.model';
import { hashPassword, comparePassword } from '../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
  JwtPayload,
} from '../utils/jwt';
import { validateEmail, validatePassword, validateName } from '../utils/validate';
import crypto from 'crypto';

export class AuthService {
  async register(name: string, email: string, password: string) {
    const nameErr = validateName(name);
    if (nameErr) throw { status: 400, message: nameErr };

    if (!validateEmail(email)) throw { status: 400, message: 'Invalid email address' };

    const pwErr = validatePassword(password);
    if (pwErr) throw { status: 400, message: pwErr };

    const existing = UserModel.findByEmail(email);
    if (existing) throw { status: 409, message: 'An account with this email already exists' };

    const hashed = await hashPassword(password);
    const user = UserModel.create(name.trim(), email, hashed);

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    TokenModel.createRefreshToken(user.id, refreshToken, getRefreshTokenExpiry());

    return { user, accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    if (!email || !password) throw { status: 400, message: 'Email and password are required' };

    const user = UserModel.findByEmail(email);
    if (!user) throw { status: 401, message: 'Invalid email or password' };

    const valid = await comparePassword(password, user.password);
    if (!valid) throw { status: 401, message: 'Invalid email or password' };

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    TokenModel.createRefreshToken(user.id, refreshToken, getRefreshTokenExpiry());

    return { user: toSafe(user), accessToken, refreshToken };
  }

  async refreshToken(token: string) {
    if (!token) throw { status: 401, message: 'Refresh token required' };

    const stored = TokenModel.findRefreshToken(token);
    if (!stored) throw { status: 401, message: 'Invalid refresh token' };

    if (new Date(stored.expires_at) < new Date()) {
      TokenModel.deleteRefreshToken(token);
      throw { status: 401, message: 'Refresh token expired' };
    }

    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      TokenModel.deleteRefreshToken(token);
      throw { status: 401, message: 'Invalid refresh token' };
    }

    const user = UserModel.findById(payload.userId);
    if (!user) throw { status: 401, message: 'User not found' };

    // Rotate refresh token
    TokenModel.deleteRefreshToken(token);
    const newPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);
    TokenModel.createRefreshToken(user.id, newRefreshToken, getRefreshTokenExpiry());

    return { user: toSafe(user), accessToken, refreshToken: newRefreshToken };
  }

  async logout(token: string) {
    if (token) TokenModel.deleteRefreshToken(token);
  }

  async logoutAll(userId: string) {
    TokenModel.deleteAllUserRefreshTokens(userId);
  }

  async forgotPassword(email: string) {
    if (!validateEmail(email)) throw { status: 400, message: 'Invalid email address' };

    const user = UserModel.findByEmail(email);
    // Always return success to avoid email enumeration
    if (!user) return { message: 'If an account exists, a reset link has been generated' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    TokenModel.createPasswordReset(user.id, resetToken, expiresAt);

    // In production: send email with reset link
    // For development: log the token
    console.log(`\n  Password reset token for ${email}: ${resetToken}\n`);

    return { message: 'If an account exists, a reset link has been generated', resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token) throw { status: 400, message: 'Reset token is required' };

    const pwErr = validatePassword(newPassword);
    if (pwErr) throw { status: 400, message: pwErr };

    const reset = TokenModel.findValidPasswordReset(token);
    if (!reset) throw { status: 400, message: 'Invalid or expired reset token' };

    const hashed = await hashPassword(newPassword);
    UserModel.updatePassword(reset.user_id, hashed);
    TokenModel.markResetUsed(token);

    // Invalidate all sessions
    TokenModel.deleteAllUserRefreshTokens(reset.user_id);

    return { message: 'Password reset successfully. Please login with your new password.' };
  }

  getProfile(userId: string) {
    const user = UserModel.findById(userId);
    if (!user) throw { status: 404, message: 'User not found' };
    return toSafe(user);
  }
}
