import { store } from '../config/database';
import { v4 as uuid } from 'uuid';

export const TokenModel = {
  createRefreshToken(userId: string, token: string, expiresAt: Date): void {
    const db = store.load();
    db.refreshTokens[token] = { id: uuid(), userId, token, expiresAt: expiresAt.toISOString() };
    store.save(db);
  },

  findRefreshToken(token: string): { userId: string; token: string; expiresAt: string } | undefined {
    const db = store.load();
    return db.refreshTokens[token];
  },

  deleteRefreshToken(token: string): void {
    const db = store.load();
    delete db.refreshTokens[token];
    store.save(db);
  },

  deleteAllUserRefreshTokens(userId: string): void {
    const db = store.load();
    for (const key of Object.keys(db.refreshTokens)) {
      if (db.refreshTokens[key].userId === userId) {
        delete db.refreshTokens[key];
      }
    }
    store.save(db);
  },

  createPasswordReset(userId: string, token: string, expiresAt: Date): void {
    const db = store.load();
    // Remove old resets for this user
    for (const key of Object.keys(db.passwordResets)) {
      if (db.passwordResets[key].userId === userId) {
        delete db.passwordResets[key];
      }
    }
    db.passwordResets[token] = { id: uuid(), userId, token, expiresAt: expiresAt.toISOString(), used: false };
    store.save(db);
  },

  findValidPasswordReset(token: string): { userId: string; token: string; expiresAt: string; used: boolean } | undefined {
    const db = store.load();
    const reset = db.passwordResets[token];
    if (!reset || reset.used || new Date(reset.expiresAt) < new Date()) return undefined;
    return reset;
  },

  markResetUsed(token: string): void {
    const db = store.load();
    if (db.passwordResets[token]) {
      db.passwordResets[token].used = true;
      store.save(db);
    }
  },
};
