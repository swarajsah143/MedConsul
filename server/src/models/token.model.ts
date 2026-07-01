import mongoose, { Schema } from 'mongoose';
import { isMongoConnected, store } from '../config/database';
import { v4 as uuid } from 'uuid';

// ── Mongoose schemas ───────────────────────────────────────

const refreshTokenSchema = new Schema({
  userId: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const RefreshTokenDoc = mongoose.model('RefreshToken', refreshTokenSchema);

const passwordResetSchema = new Schema({
  userId: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
});
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
const PasswordResetDoc = mongoose.model('PasswordReset', passwordResetSchema);

// ── Public API (auto-switches between Mongo and JSON) ─────

export const TokenModel = {
  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    if (isMongoConnected()) {
      await RefreshTokenDoc.create({ userId, token, expiresAt });
      return;
    }
    const db = store.load();
    if (!db.refreshTokens) db.refreshTokens = {};
    db.refreshTokens[token] = { id: uuid(), userId, token, expiresAt: expiresAt.toISOString() };
    store.save(db);
  },

  async findRefreshToken(token: string) {
    if (isMongoConnected()) {
      const doc = await RefreshTokenDoc.findOne({ token });
      if (!doc) return undefined;
      return { userId: doc.userId as string, token: doc.token as string, expiresAt: (doc.expiresAt as Date).toISOString() };
    }
    const db = store.load();
    return db.refreshTokens?.[token];
  },

  async deleteRefreshToken(token: string): Promise<void> {
    if (isMongoConnected()) {
      await RefreshTokenDoc.deleteOne({ token });
      return;
    }
    const db = store.load();
    if (db.refreshTokens) { delete db.refreshTokens[token]; store.save(db); }
  },

  async deleteAllUserRefreshTokens(userId: string): Promise<void> {
    if (isMongoConnected()) {
      await RefreshTokenDoc.deleteMany({ userId });
      return;
    }
    const db = store.load();
    if (db.refreshTokens) {
      for (const key of Object.keys(db.refreshTokens)) {
        if (db.refreshTokens[key].userId === userId) delete db.refreshTokens[key];
      }
      store.save(db);
    }
  },

  async createPasswordReset(userId: string, token: string, expiresAt: Date): Promise<void> {
    if (isMongoConnected()) {
      await PasswordResetDoc.deleteMany({ userId });
      await PasswordResetDoc.create({ userId, token, expiresAt });
      return;
    }
    const db = store.load();
    if (!db.passwordResets) db.passwordResets = {};
    for (const key of Object.keys(db.passwordResets)) {
      if (db.passwordResets[key].userId === userId) delete db.passwordResets[key];
    }
    db.passwordResets[token] = { id: uuid(), userId, token, expiresAt: expiresAt.toISOString(), used: false };
    store.save(db);
  },

  async findValidPasswordReset(token: string) {
    if (isMongoConnected()) {
      const doc = await PasswordResetDoc.findOne({ token, used: false, expiresAt: { $gt: new Date() } });
      if (!doc) return undefined;
      return { userId: doc.userId as string, token: doc.token as string, expiresAt: (doc.expiresAt as Date).toISOString(), used: doc.used as boolean };
    }
    const db = store.load();
    const reset = db.passwordResets?.[token];
    if (!reset || reset.used || new Date(reset.expiresAt) < new Date()) return undefined;
    return reset;
  },

  async markResetUsed(token: string): Promise<void> {
    if (isMongoConnected()) {
      await PasswordResetDoc.findOneAndUpdate({ token }, { used: true });
      return;
    }
    const db = store.load();
    if (db.passwordResets?.[token]) { db.passwordResets[token].used = true; store.save(db); }
  },
};
