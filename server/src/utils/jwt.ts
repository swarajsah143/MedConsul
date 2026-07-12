import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  } as jwt.SignOptions);
}

/**
 * Refresh tokens carry a random jti.
 *
 * Without it, the payload is {userId, email, role} + `iat`, and `iat` has ONE-SECOND
 * resolution — so two logins by the same user inside the same second produce a
 * byte-identical token. The refreshTokens collection has a unique index on `token`,
 * so the second one died with E11000 and the user got a 500.
 *
 * That is not a rare race: it fires on a double-clicked "Sign In", on two tabs
 * authenticating together, and on any script that logs in twice in quick succession.
 */
export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
    jwtid: randomUUID(),
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.secret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
}

export function getRefreshTokenExpiry(): Date {
  const match = env.jwt.refreshExpiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] || 86400000;
  return new Date(Date.now() + value * ms);
}
