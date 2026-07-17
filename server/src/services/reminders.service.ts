import { isMongoConnected, store } from '../config/database';
import { UserModel } from '../models/user.model';
import { resource } from '../models/resource.model';
import { announcements } from '../schema/collections';
import { mailService } from './mail.service';
import { planExpiryEmail, announcementReminderEmail } from './mail.templates';

/**
 * The scheduled-reminder jobs, run daily (and once on boot) by jobs/scheduler.ts, or manually via
 * POST /api/admin/students/run-reminders.
 *
 * Two sources, because the app has no generic "deadline" data:
 *   1. plan-expiry — students whose paid plan expires within N days (uses existing planExpiresAt).
 *   2. scheduled announcements — an announcement whose `reminderDate` is today (admins schedule it
 *      when creating the announcement).
 *
 * Idempotency: every send is guarded so the daily tick, the boot catch-up and a manual trigger all
 * converge to exactly one send. A send that is SKIPPED because SMTP is unconfigured is NOT marked,
 * so due reminders still fire once (and only once) after credentials are added.
 */

const REMIND_DAYS_BEFORE_EXPIRY = 3;

/** Server-local YYYY-MM-DD. Announcement reminderDate is compared against this. */
function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

// ── idempotency markers (plan-expiry) — kept in the always-present JSON store, keyed so one
//    expiry event yields at most one email. Writes are sequential (the job runs one at a time). ──

function hasSent(key: string): boolean {
  const db = store.load() as any;
  return Boolean(db.sentReminders?.[key]);
}
function markSent(key: string): void {
  const db = store.load() as any;
  db.sentReminders = db.sentReminders || {};
  db.sentReminders[key] = todayISO();
  store.save(db);
}

// ── the jobs ────────────────────────────────────────────────────────────────

async function planExpiryReminders(): Promise<{ sent: number; skipped: number }> {
  const users = await UserModel.findAll();
  let sent = 0;
  let skipped = 0;
  for (const u of users as any[]) {
    const plan = u.plan ?? 'free';
    if (plan === 'free' || !u.planExpiresAt || !u.email) continue;
    const left = daysUntil(u.planExpiresAt);
    if (left < 0 || left > REMIND_DAYS_BEFORE_EXPIRY) continue; // only the window [today .. +N]

    // Keyed by the expiry date so a user gets exactly one expiry reminder per plan period.
    const key = `plan-expiry:${u.id}:${String(u.planExpiresAt).slice(0, 10)}`;
    if (hasSent(key)) continue;

    const res = await mailService.send({ to: u.email, ...planExpiryEmail(u.name, left, plan) });
    if (res.skipped) { skipped++; continue; }        // unconfigured → do NOT mark; retry later
    if (res.ok) markSent(key);
    sent++;
  }
  return { sent, skipped };
}

async function announcementReminders(): Promise<{ sent: number; skipped: number; announcements: number }> {
  const today = todayISO();
  const all = await resource(announcements).all();
  const due = (all as any[]).filter((a) => a.reminderDate === today && !a.reminderSent);
  if (due.length === 0) return { sent: 0, skipped: 0, announcements: 0 };

  const users = await UserModel.findAll();
  const students = (users as any[]).filter((u) => u.role === 'student' && u.email);

  let sent = 0;
  let skipped = 0;
  for (const a of due) {
    const audience = a.reminderAudience && a.reminderAudience !== 'all'
      ? students.filter((u) => (u.plan ?? 'free') === a.reminderAudience)
      : students;

    const result = await mailService.sendMany(audience, () =>
      announcementReminderEmail(a.title, a.reminderBody || a.shortDescription || '', a.documentUrl),
    );
    sent += result.sent;
    skipped += result.skipped;

    // Mark the announcement done ONLY if it actually went out. If every recipient was skipped
    // (SMTP unconfigured), leave it unsent so it fires once creds arrive.
    if (result.skipped < result.total || result.total === 0) {
      await resource(announcements).update(a.id, { reminderSent: true });
    }
  }
  return { sent, skipped, announcements: due.length };
}

/** Run every due reminder source. Safe to call repeatedly (idempotent) and when unconfigured. */
export async function runAllDueReminders(): Promise<{
  planExpiry: { sent: number; skipped: number };
  announcements: { sent: number; skipped: number; announcements: number };
}> {
  if (!isMongoConnected()) {
    console.log('  Reminders: MongoDB not connected — skipping this run');
    return { planExpiry: { sent: 0, skipped: 0 }, announcements: { sent: 0, skipped: 0, announcements: 0 } };
  }
  const planExpiry = await planExpiryReminders();
  const anns = await announcementReminders();
  const configured = mailService.isConfigured();
  console.log(
    `  Reminders run — plan-expiry: ${planExpiry.sent} sent/${planExpiry.skipped} skipped; ` +
    `announcements: ${anns.sent} sent/${anns.skipped} skipped across ${anns.announcements} due` +
    (configured ? '' : ' (SMTP not configured — nothing actually mailed)'),
  );
  return { planExpiry, announcements: anns };
}
