import rateLimit from 'express-rate-limit';

/**
 * Rate limiting. The app sits behind nginx, so `app.set('trust proxy', 1)` is set in server.ts
 * and these limiters key on the real client IP from X-Forwarded-For (without it, every request
 * looks like 127.0.0.1 and all users would share one bucket).
 */

const json = (message: string) => ({
  handler: (_req: any, res: any) => res.status(429).json({ success: false, message }),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict limiter for credential endpoints (login / register / forgot / reset). This is the one
 * that closes the account-takeover brute-force hole. 10 attempts / 15 min / IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  ...json('Too many attempts. Please wait a few minutes and try again.'),
});

/**
 * Generous global backstop against scripted abuse of the public API. Set high enough that heavy
 * legitimate browsing (a page can fire paged + facets + colleges requests) never trips it.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3000,
  ...json('Too many requests. Please slow down.'),
});
