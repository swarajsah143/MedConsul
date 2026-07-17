import cron from 'node-cron';
import { runAllDueReminders } from '../services/reminders.service';

/**
 * In-process scheduler for the reminder jobs.
 *
 * One systemd service on one EC2 box → in-process node-cron is the right fit (a systemd timer
 * would need a second unit + a secret endpoint for no benefit at single-instance scale, and there
 * is no multi-node double-fire risk).
 *
 * Runs daily at 08:00 IST, PLUS a catch-up shortly after boot so a restart never skips a day.
 * runAllDueReminders() is idempotent (see reminders.service) so an extra run never double-sends.
 */
export function startScheduler(): void {
  cron.schedule('0 8 * * *', () => void runAllDueReminders(), { timezone: 'Asia/Kolkata' });

  // Boot catch-up — delayed so the Mongo connection (started in the background) has settled.
  // If it hasn't, runAllDueReminders no-ops (isMongoConnected guard) and the daily tick covers it.
  setTimeout(() => void runAllDueReminders(), 20_000);

  console.log('  Reminder scheduler started (daily 08:00 IST + boot catch-up)');
}
