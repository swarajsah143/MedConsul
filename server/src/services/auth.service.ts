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
import { effectiveTier } from '../utils/plan';
import { mailService } from './mail.service';
import { welcomeEmail, resetEmail } from './mail.templates';
import { env } from '../config/env';
import crypto from 'crypto';

export class AuthService {
  async register(name: string, email: string, password: string) {
    const nameErr = validateName(name);
    if (nameErr) throw { status: 400, message: nameErr };

    if (!validateEmail(email)) throw { status: 400, message: 'Invalid email address' };

    const pwErr = validatePassword(password);
    if (pwErr) throw { status: 400, message: pwErr };

    const existing = await UserModel.findByEmail(email);
    if (existing) throw { status: 409, message: 'An account with this email already exists' };

    const hashed = await hashPassword(password);
    const user = await UserModel.create(name.trim(), email, hashed);

    // Welcome email — fire-and-forget so a mail failure never fails the signup. mailService
    // no-ops (logs) when SMTP is unconfigured, so this is safe before credentials are added.
    void mailService.send({ to: user.email, ...welcomeEmail(user.name) });

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role, plan: effectiveTier(user.plan, user.planExpiresAt) };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await TokenModel.createRefreshToken(user.id, refreshToken, getRefreshTokenExpiry());

    return { user, accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    if (!email || !password) throw { status: 400, message: 'Email and password are required' };

    const user = await UserModel.findByEmail(email);
    if (!user) throw { status: 401, message: 'Invalid email or password' };

    const valid = await comparePassword(password, user.password);
    if (!valid) throw { status: 401, message: 'Invalid email or password' };

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role, plan: effectiveTier(user.plan, user.planExpiresAt) };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await TokenModel.createRefreshToken(user.id, refreshToken, getRefreshTokenExpiry());

    return { user: toSafe(user), accessToken, refreshToken };
  }

  async refreshToken(token: string) {
    if (!token) throw { status: 401, message: 'Refresh token required' };

    const stored = await TokenModel.findRefreshToken(token);
    if (!stored) throw { status: 401, message: 'Invalid refresh token' };

    if (new Date(stored.expiresAt) < new Date()) {
      await TokenModel.deleteRefreshToken(token);
      throw { status: 401, message: 'Refresh token expired' };
    }

    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      await TokenModel.deleteRefreshToken(token);
      throw { status: 401, message: 'Invalid refresh token' };
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) throw { status: 401, message: 'User not found' };

    // Rotate refresh token
    await TokenModel.deleteRefreshToken(token);
    const newPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role, plan: effectiveTier(user.plan, user.planExpiresAt) };
    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);
    await TokenModel.createRefreshToken(user.id, newRefreshToken, getRefreshTokenExpiry());

    return { user: toSafe(user), accessToken, refreshToken: newRefreshToken };
  }

  async logout(token: string) {
    if (token) await TokenModel.deleteRefreshToken(token);
  }

  async logoutAll(userId: string) {
    await TokenModel.deleteAllUserRefreshTokens(userId);
  }

  async forgotPassword(email: string) {
    if (!validateEmail(email)) throw { status: 400, message: 'Invalid email address' };

    const user = await UserModel.findByEmail(email);
    if (!user) return { message: 'If an account exists, a reset link has been generated' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await TokenModel.createPasswordReset(user.id, resetToken, expiresAt);

    // Email the reset LINK (this is what fixes the prod-broken flow — previously the token was
    // only console-logged and never reached the user). The link matches reset-password.tsx's
    // `?token=` param. Fire-and-forget; when SMTP is unconfigured mailService logs and skips.
    const resetUrl = `${env.clientUrl}/reset-password?token=${resetToken}`;
    void mailService.send({ to: user.email, ...resetEmail(user.name, resetUrl) });

    // Keep the console log too — it is the dev/unconfigured fallback for retrieving the token.
    console.log(`\n  Password reset token for ${email}: ${resetToken}\n`);

    return { message: 'If an account exists, a reset link has been generated', resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token) throw { status: 400, message: 'Reset token is required' };

    const pwErr = validatePassword(newPassword);
    if (pwErr) throw { status: 400, message: pwErr };

    const reset = await TokenModel.findValidPasswordReset(token);
    if (!reset) throw { status: 400, message: 'Invalid or expired reset token' };

    const hashed = await hashPassword(newPassword);
    await UserModel.updatePassword(reset.userId, hashed);
    await TokenModel.markResetUsed(token);
    await TokenModel.deleteAllUserRefreshTokens(reset.userId);

    return { message: 'Password reset successfully. Please login with your new password.' };
  }

  async getProfile(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw { status: 404, message: 'User not found' };
    return toSafe(user);
  }
}
