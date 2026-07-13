import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { UserModel } from '../models/user.model';
import { SubmissionModel } from '../models/submission.model';
import { resource } from '../models/resource.model';
import { checklistDocs } from '../schema/collections';
import { aiService } from '../services/ai.service';

/**
 * Admin view of students: who they are, how far through the checklist they are, and
 * what plan they are on.
 *
 * Progress is REAL — it is derived from admin-verified document uploads, not from a
 * client-side localStorage tick. A document only counts as done once an admin has
 * actually verified it, which is the only definition that means anything.
 *
 * Plans are admin-set. There is no payment gateway in this application; see IUser.plan.
 */

const PLANS = ['free', 'pro', 'premium'] as const;
type Plan = (typeof PLANS)[number];

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;

  plan: Plan;
  planExpiresAt: string | null;
  planNote: string;
  /** Derived, not stored — a plan with a past expiry is expired no matter what it says. */
  planActive: boolean;

  docsTotal: number;
  docsVerified: number;
  docsPending: number;
  docsRejected: number;
  docsUploaded: number;
  progressPct: number;

  chatSessions: number;
  lastActiveAt: string | null;
}

function planActive(plan: Plan, expiresAt: string | null): boolean {
  if (plan === 'free') return true;                     // free never expires
  if (!expiresAt) return true;                          // no expiry set = open-ended
  return new Date(expiresAt).getTime() > Date.now();
}

export const studentsController = {
  /** Every user, with their real checklist progress and plan. */
  async list(req: AuthRequest, res: Response): Promise<void> {
    const [users, docs] = await Promise.all([
      UserModel.findAll(),
      resource(checklistDocs).all(),
    ]);
    const docsTotal = docs.length;

    const rows: StudentRow[] = await Promise.all(
      users.map(async (u: any) => {
        const subs = await SubmissionModel.forUser(u.id);
        const verified = subs.filter((s) => s.status === 'verified').length;
        const pending = subs.filter((s) => s.status === 'pending').length;
        const rejected = subs.filter((s) => s.status === 'rejected').length;

        const sessions = aiService.getUserSessions(u.id);
        const lastSub = subs.map((s) => s.updatedAt).sort().at(-1) ?? null;
        const lastChat = sessions.map((s: any) => s.updatedAt).sort().at(-1) ?? null;
        const lastActiveAt = [u.updatedAt, lastSub, lastChat]
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;

        const plan = (u.plan ?? 'free') as Plan;
        const planExpiresAt = u.planExpiresAt ?? null;

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          joinedAt: u.createdAt,

          plan,
          planExpiresAt,
          planNote: u.planNote ?? '',
          planActive: planActive(plan, planExpiresAt),

          docsTotal,
          docsVerified: verified,
          docsPending: pending,
          docsRejected: rejected,
          docsUploaded: subs.length,
          // Progress = VERIFIED / total. An uploaded-but-unverified document is not done.
          progressPct: docsTotal ? Math.round((verified / docsTotal) * 100) : 0,

          chatSessions: sessions.length,
          lastActiveAt,
        };
      })
    );

    const status = String(req.query.plan || '');
    const filtered = PLANS.includes(status as Plan) ? rows.filter((r) => r.plan === status) : rows;

    res.json({
      success: true,
      data: {
        students: filtered,
        docsTotal,
        summary: {
          total: rows.length,
          students: rows.filter((r) => r.role === 'student').length,
          admins: rows.filter((r) => r.role === 'admin').length,
          onPaidPlan: rows.filter((r) => r.plan !== 'free' && r.planActive).length,
          expired: rows.filter((r) => r.plan !== 'free' && !r.planActive).length,
          awaitingReview: rows.reduce((n, r) => n + r.docsPending, 0),
        },
      },
    });
  },

  /** One student: every document with its status, so an admin can see exactly what is missing. */
  async detail(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const user = await UserModel.findById(id);
    if (!user) { res.status(404).json({ success: false, message: 'Student not found' }); return; }

    const [subs, docs] = await Promise.all([
      SubmissionModel.forUser(id),
      resource(checklistDocs).all(),
    ]);
    const byDoc = new Map(subs.map((s) => [s.docId, s]));

    // Every checklist document, whether or not it has been uploaded — the gaps are the
    // point of this view.
    const documents = docs.map((d: any) => {
      const s = byDoc.get(d.id);
      return {
        docId: d.id,
        name: d.name,
        section: d.section,
        mandatory: d.mandatory,
        submissionId: s?.id ?? null,
        status: s?.status ?? 'not_uploaded',
        remarks: s?.remarks ?? '',
        originalName: s?.originalName ?? null,
        size: s?.size ?? null,
        uploadedAt: s?.createdAt ?? null,
        reviewedAt: s?.reviewedAt ?? null,
      };
    });

    const plan = ((user as any).plan ?? 'free') as Plan;
    const planExpiresAt = (user as any).planExpiresAt ?? null;

    res.json({
      success: true,
      data: {
        student: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          joinedAt: user.createdAt,
          plan,
          planExpiresAt,
          planNote: (user as any).planNote ?? '',
          planActive: planActive(plan, planExpiresAt),
        },
        documents,
        chatSessions: aiService.getUserSessions(id).length,
      },
    });
  },

  /** Grant / change / clear a student's plan. */
  async setPlan(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const { plan, planExpiresAt, planNote } = req.body || {};

    if (!PLANS.includes(plan)) {
      res.status(400).json({ success: false, message: `Plan must be one of: ${PLANS.join(', ')}` });
      return;
    }
    if (planExpiresAt) {
      const d = new Date(planExpiresAt);
      if (Number.isNaN(d.getTime())) {
        res.status(400).json({ success: false, message: 'Expiry must be a valid date' });
        return;
      }
      // A plan that expired before it was granted is a data-entry mistake, not a
      // deliberate act — refuse it rather than silently marking them expired.
      if (plan !== 'free' && d.getTime() < Date.now()) {
        res.status(400).json({ success: false, message: 'That expiry date is already in the past.' });
        return;
      }
      // ...and neither is the year 12020. A date input lets a slipped keystroke produce
      // an absurd year, which sails through a "not in the past" check and grants an
      // effectively permanent plan. Bound it.
      const TEN_YEARS = 10 * 365 * 24 * 60 * 60 * 1000;
      if (d.getTime() > Date.now() + TEN_YEARS) {
        res.status(400).json({
          success: false,
          message: `That expiry date is more than 10 years away (${d.getFullYear()}). Check the year.`,
        });
        return;
      }
    }

    const target = await UserModel.findById(id);
    if (!target) { res.status(404).json({ success: false, message: 'Student not found' }); return; }

    const updated = await UserModel.update(id, {
      plan,
      planExpiresAt: planExpiresAt || null,
      planNote: String(planNote ?? '').slice(0, 300),
    });

    res.json({ success: true, data: { student: updated } });
  },
};
