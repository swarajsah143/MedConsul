import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

/**
 * Populates req.user if a valid Bearer token is present, otherwise continues as anonymous.
 * For PUBLIC endpoints whose response depends on the signed-in user's plan (e.g. allotments,
 * predictor) — an invalid/absent token is not an error here, it just means the free tier.
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = verifyAccessToken(header.slice(7)); } catch { /* ignore — treat as anonymous */ }
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }
  next();
}

/**
 * Gate for counsellor-facing pages. Admins are also counsellors in the sense that they can
 * see everything a counsellor can, so they pass too — only students are rejected.
 */
export function requireCounsellor(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin' && req.user?.role !== 'counsellor') {
    res.status(403).json({ success: false, message: 'Counsellor access required' });
    return;
  }
  next();
}

/**
 * Gate for the student identity-document workflow. Staff (admin/counsellor) accounts have
 * no document requirement at all — they must never be able to create a submission of their
 * own, which is what would let a staff account show up in the verification queue.
 */
export function requireStudent(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'student') {
    res.status(403).json({ success: false, message: 'The document workflow is only available to student accounts' });
    return;
  }
  next();
}
