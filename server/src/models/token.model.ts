import mongoose, { Schema, Document } from 'mongoose';

// ── Refresh Token ──────────────────────────────────────────

interface IRefreshToken extends Document {
  userId: string;
  token: string;
  expiresAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  userId: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-cleanup

const RefreshTokenDoc = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);

// ── Password Reset ─────────────────────────────────────────

interface IPasswordReset extends Document {
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}

const passwordResetSchema = new Schema<IPasswordReset>({
  userId: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
});

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 }); // cleanup after 1hr

const PasswordResetDoc = mongoose.model<IPasswordReset>('PasswordReset', passwordResetSchema);

// ── Public API ─────────────────────────────────────────────

export const TokenModel = {
  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await RefreshTokenDoc.create({ userId, token, expiresAt });
  },

  async findRefreshToken(token: string) {
    const doc = await RefreshTokenDoc.findOne({ token });
    if (!doc) return undefined;
    return { userId: doc.userId, token: doc.token, expiresAt: doc.expiresAt.toISOString() };
  },

  async deleteRefreshToken(token: string): Promise<void> {
    await RefreshTokenDoc.deleteOne({ token });
  },

  async deleteAllUserRefreshTokens(userId: string): Promise<void> {
    await RefreshTokenDoc.deleteMany({ userId });
  },

  async createPasswordReset(userId: string, token: string, expiresAt: Date): Promise<void> {
    await PasswordResetDoc.deleteMany({ userId }); // remove old resets
    await PasswordResetDoc.create({ userId, token, expiresAt });
  },

  async findValidPasswordReset(token: string) {
    const doc = await PasswordResetDoc.findOne({ token, used: false, expiresAt: { $gt: new Date() } });
    if (!doc) return undefined;
    return { userId: doc.userId, token: doc.token, expiresAt: doc.expiresAt.toISOString(), used: doc.used };
  },

  async markResetUsed(token: string): Promise<void> {
    await PasswordResetDoc.findOneAndUpdate({ token }, { used: true });
  },
};
