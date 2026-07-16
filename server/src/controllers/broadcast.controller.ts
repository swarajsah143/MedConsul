import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { UserModel } from '../models/user.model';
import { mailService } from '../services/mail.service';
import { broadcastEmail } from '../services/mail.templates';
import { runAllDueReminders } from '../services/reminders.service';

/**
 * Admin-triggered email to students, plus a manual reminders trigger for testing.
 *
 * Audience is always role=student, optionally narrowed to one plan. Sends go through
 * mailService (which no-ops when SMTP is unconfigured), so this is safe before creds exist.
 */

const PLANS = ['free', 'pro', 'premium'] as const;
type Plan = (typeof PLANS)[number];

// Above this many recipients, don't make the admin's HTTP request wait for every SMTP round-trip
// (a proxy would time out); kick the batched send off in the background and return immediately.
const SYNC_MAX = 50;

/** role=student, optionally one plan → [{ name, email }]. */
async function recipients(plan?: string): Promise<{ name: string; email: string }[]> {
  const users = await UserModel.findAll();
  return users
    .filter((u: any) => u.role === 'student' && u.email)
    .filter((u: any) => (PLANS.includes(plan as Plan) ? (u.plan ?? 'free') === plan : true))
    .map((u: any) => ({ name: u.name, email: u.email }));
}

export const broadcastController = {
  /** Live recipient count for the compose modal. */
  async previewRecipients(req: AuthRequest, res: Response): Promise<void> {
    const list = await recipients(String(req.query.plan || ''));
    res.json({ success: true, data: { recipientCount: list.length } });
  },

  /** Email `{ subject, message }` to the selected students. */
  async broadcast(req: AuthRequest, res: Response): Promise<void> {
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();
    const plan = req.body?.audience?.plan as string | undefined;

    if (!subject || !message) {
      res.status(400).json({ success: false, message: 'Subject and message are required' });
      return;
    }
    if (subject.length > 200) {
      res.status(400).json({ success: false, message: 'Subject is too long (max 200 chars)' });
      return;
    }

    const list = await recipients(plan);
    if (list.length === 0) {
      res.json({ success: true, data: { recipientCount: 0, sent: 0, skipped: 0, failed: 0, accepted: false } });
      return;
    }

    const build = () => broadcastEmail(subject, message);

    // Big audience → return now, send in the background so the request never times out.
    if (list.length > SYNC_MAX) {
      void mailService.sendMany(list, build);
      res.json({ success: true, data: { recipientCount: list.length, accepted: true } });
      return;
    }

    const result = await mailService.sendMany(list, build);
    res.json({ success: true, data: { recipientCount: list.length, accepted: true, ...result } });
  },

  /** Manually run the due-reminders job — for testing the scheduled path without waiting for cron. */
  async runReminders(_req: AuthRequest, res: Response): Promise<void> {
    const result = await runAllDueReminders();
    res.json({ success: true, data: result });
  },
};
