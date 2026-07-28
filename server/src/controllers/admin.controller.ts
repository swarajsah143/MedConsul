import { Response } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { AuthRequest } from '../middlewares/auth.middleware';
import { UserModel, PROFILE_FIELDS } from '../models/user.model';
import { SubmissionModel } from '../models/submission.model';
import { resolveStored } from '../config/uploads';
import { isMongoConnected } from '../config/database';
import { mailService } from '../services/mail.service';
import { COLLECTIONS } from '../schema/collections';
import { resource } from '../models/resource.model';
import { effectiveTier, type PlanTier } from '../utils/plan';

/**
 * Admin user management.
 *
 * The guards are the important part here. An admin panel that lets the only admin
 * demote or delete themselves is a panel that locks everyone out permanently — there
 * is no recovery short of editing the database by hand.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['student', 'admin', 'counsellor'];

/** The same rules signup enforces — an admin-set password must not be weaker. */
function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain a number';
  return null;
}

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'PwD'];

/**
 * Validate the counselling details. Shared by create and update so an admin cannot
 * sneak a bad value in through whichever door they happen to use.
 */
export function profileProblem(p: Record<string, any>): string | null {
  if (p.category && !CATEGORIES.includes(p.category)) {
    return `Category must be one of: ${CATEGORIES.join(', ')}`;
  }
  for (const [field, label] of [['neetRank', 'NEET rank'], ['neetScore', 'NEET score']] as const) {
    if (p[field] === null || p[field] === undefined || p[field] === '') continue;
    const n = Number(p[field]);
    if (!Number.isFinite(n) || n < 0) return `${label} must be a positive number`;
    // NEET UG is scored out of 720. A "score" of 7200 is a typo, not a prodigy.
    if (field === 'neetScore' && n > 720) return 'NEET score cannot exceed 720';
    p[field] = n;
  }
  if (p.phone && !/^[+\d][\d\s-]{6,19}$/.test(String(p.phone))) {
    return 'Phone number looks invalid';
  }
  if (p.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(String(p.dateOfBirth))) {
    return 'Date of birth must be YYYY-MM-DD';
  }
  // Profile picture: a small data URL, or blank (= no picture). The client downscales to
  // 256px and re-encodes, so a legitimate avatar is tens of KB. Reject anything that is not
  // an image data URL, or that is implausibly large (uncompressed / abusive).
  if (p.avatar !== undefined && p.avatar !== null && p.avatar !== '') {
    const s = String(p.avatar);
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(s)) {
      return 'Profile picture must be a PNG, JPG or WEBP image.';
    }
    if (s.length > 700_000) {
      return 'Profile picture is too large — please choose a smaller image.';
    }
  }
  return null;
}

export const adminController = {
  async listUsers(_req: AuthRequest, res: Response): Promise<void> {
    const users = await UserModel.findAll();
    res.json({ success: true, data: { users } });
  },

  async stats(_req: AuthRequest, res: Response): Promise<void> {
    const users = await UserModel.findAll();
    const admins = users.filter((u) => u.role === 'admin').length;
    const counsellors = users.filter((u) => u.role === 'counsellor').length;
    const students = users.filter((u) => u.role === 'student').length;
    res.json({
      success: true,
      data: { totalUsers: users.length, admins, counsellors, students },
    });
  },

  /**
   * Dashboard analytics — every number here is aggregated from real data (users, uploaded
   * documents, the content collections) plus live process/DB/integration health. Nothing is
   * fabricated: when Mongo is down the content counts are simply omitted rather than guessed,
   * and plan tiers use effectiveTier() so an expired paid plan counts as free (matching gating).
   */
  async analytics(_req: AuthRequest, res: Response): Promise<void> {
    const users = await UserModel.findAll();
    const now = Date.now();

    // ── users ──
    const admins = users.filter((u) => u.role === 'admin').length;
    const counsellors = users.filter((u) => u.role === 'counsellor').length;
    const students = users.filter((u) => u.role === 'student').length;
    const plans: Record<PlanTier, number> = { free: 0, pro: 0, premium: 0 };
    let activeSubscriptions = 0;
    let withProfile = 0;
    for (const u of users) {
      plans[effectiveTier(u.plan, u.planExpiresAt)] += 1;
      if (effectiveTier(u.plan, u.planExpiresAt) !== 'free') activeSubscriptions += 1;
      if (PROFILE_FIELDS.some((f) => f !== 'avatar' && (u as any)[f])) withProfile += 1;
    }

    // Signups per day for the last 30 days, zero-filled so the chart shows gaps as gaps.
    const DAYS = 30;
    const byDay = new Map<string, number>();
    for (let i = DAYS - 1; i >= 0; i--) {
      byDay.set(new Date(now - i * 86_400_000).toISOString().slice(0, 10), 0);
    }
    for (const u of users) {
      const key = new Date(u.createdAt).toISOString().slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const signupsByDay = [...byDay.entries()].map(([date, count]) => ({ date, count }));

    // ── documents (verification queue) ──
    let documents = { pending: 0, verified: 0, rejected: 0 };
    try { documents = await SubmissionModel.counts(); } catch { /* store unavailable */ }

    // ── content library (domain data is Mongo-only) ──
    const content: { collection: string; label: string; count: number }[] = [];
    if (isMongoConnected()) {
      await Promise.all(
        COLLECTIONS.map(async (schema) => {
          try {
            content.push({ collection: schema.name, label: schema.labelPlural, count: await resource(schema).count() });
          } catch { /* skip a collection that fails to count */ }
        }),
      );
      content.sort((a, b) => b.count - a.count);
    }

    // ── system / integrations ──
    const mem = process.memoryUsage();
    const system = {
      dbConnected: isMongoConnected(),
      dbMode: isMongoConnected() ? 'mongodb' : 'json',
      aiConfigured: Boolean(process.env.AI_API_KEY),
      mailConfigured: mailService.isConfigured(),
      uptimeSeconds: Math.round(process.uptime()),
      memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: {
        users: { total: users.length, students, admins, counsellors, plans, activeSubscriptions, withProfile, signupsByDay },
        documents: { ...documents, total: documents.pending + documents.verified + documents.rejected },
        content,
        system,
      },
    });
  },

  async createUser(req: AuthRequest, res: Response): Promise<void> {
    const { name, email, password, role = 'student' } = req.body || {};

    if (!String(name || '').trim()) { res.status(400).json({ success: false, message: 'Name is required' }); return; }
    if (!EMAIL_RE.test(String(email || ''))) { res.status(400).json({ success: false, message: 'A valid email is required' }); return; }
    if (!ROLES.includes(role)) { res.status(400).json({ success: false, message: `Role must be one of: ${ROLES.join(', ')}` }); return; }

    const pwProblem = passwordProblem(String(password || ''));
    if (pwProblem) { res.status(400).json({ success: false, message: pwProblem }); return; }

    if (await UserModel.findByEmail(email)) {
      res.status(409).json({ success: false, message: 'A user with that email already exists' });
      return;
    }

    // An admin registering a walk-in student should be able to record their details in
    // one go, not create an empty shell and then edit it.
    const profile: Record<string, any> = {};
    for (const f of PROFILE_FIELDS) {
      if (req.body[f] !== undefined) profile[f] = req.body[f];
    }
    if (req.body.adminNotes !== undefined) profile.adminNotes = String(req.body.adminNotes).slice(0, 2000);

    const problem = profileProblem(profile);
    if (problem) { res.status(400).json({ success: false, message: problem }); return; }

    const user = await UserModel.create(String(name).trim(), email, await bcrypt.hash(password, 12), role, profile);
    res.status(201).json({ success: true, data: { user } });
  },

  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const me = req.user!.userId;
    const { name, email, role } = req.body || {};

    const target = await UserModel.findById(id);
    if (!target) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    if (email !== undefined) {
      if (!EMAIL_RE.test(String(email))) { res.status(400).json({ success: false, message: 'A valid email is required' }); return; }
      const clash = await UserModel.findByEmail(String(email));
      if (clash && clash.id !== id) {
        res.status(409).json({ success: false, message: 'Another user already has that email' });
        return;
      }
    }

    if (role !== undefined) {
      if (!ROLES.includes(role)) { res.status(400).json({ success: false, message: `Role must be one of: ${ROLES.join(', ')}` }); return; }

      // You cannot demote yourself — you would lose the panel mid-action, with no undo.
      if (id === me && role !== 'admin') {
        res.status(409).json({ success: false, message: 'You cannot remove your own admin role.' });
        return;
      }
      // And nobody can demote the last admin.
      if (target.role === 'admin' && role !== 'admin' && (await UserModel.countAdmins()) <= 1) {
        res.status(409).json({ success: false, message: 'This is the only admin. Promote someone else first.' });
        return;
      }
    }

    const profile: Record<string, any> = {};
    for (const f of PROFILE_FIELDS) {
      if (req.body[f] !== undefined) profile[f] = req.body[f];
    }
    if (req.body.adminNotes !== undefined) profile.adminNotes = String(req.body.adminNotes).slice(0, 2000);

    const problem = profileProblem(profile);
    if (problem) { res.status(400).json({ success: false, message: problem }); return; }

    const updated = await UserModel.update(id, {
      name: name !== undefined ? String(name).trim() : undefined,
      email,
      role,
      ...profile,
    });
    res.json({ success: true, data: { user: updated } });
  },

  /** Admin sets a new password — e.g. a student is locked out of their account. */
  async resetPassword(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const { password } = req.body || {};

    const target = await UserModel.findById(id);
    if (!target) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    const problem = passwordProblem(String(password || ''));
    if (problem) { res.status(400).json({ success: false, message: problem }); return; }

    await UserModel.updatePassword(id, await bcrypt.hash(password, 12));
    res.json({ success: true, message: `Password updated for ${target.email}` });
  },

  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const me = req.user!.userId;

    const target = await UserModel.findById(id);
    if (!target) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    if (id === me) {
      res.status(409).json({ success: false, message: 'You cannot delete your own account.' });
      return;
    }
    if (target.role === 'admin' && (await UserModel.countAdmins()) <= 1) {
      res.status(409).json({ success: false, message: 'This is the only admin. Promote someone else first.' });
      return;
    }

    // Their uploaded identity documents go with them. Leaving Aadhaar scans and
    // marksheets on disk after the account is gone is a data-retention problem,
    // not a tidiness one.
    const submissions = await SubmissionModel.forUser(id);
    for (const s of submissions) {
      const full = resolveStored(s.storedName);
      if (full) await fs.promises.unlink(full).catch(() => {});
      await SubmissionModel.remove(s.id);
    }

    await UserModel.remove(id);
    res.json({
      success: true,
      message: `Deleted ${target.email}`,
      data: { deletedDocuments: submissions.length },
    });
  },
};
