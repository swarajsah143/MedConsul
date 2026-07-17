import './../config/load-env';
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

/**
 * Outbound email over SMTP.
 *
 * Degrades gracefully exactly like config/database.ts and services/ai.service.ts: when SMTP is
 * not configured (or still on the shipped .env placeholders), `send()` no-ops with a log and
 * returns { skipped:true } instead of throwing — so signup, password-reset, broadcasts and the
 * reminder job all keep working before real credentials are added. A transport error is caught
 * and warned, never thrown into a request.
 *
 * Config lives in env.smtp (SMTP_HOST/PORT/USER/PASS/EMAIL_FROM). Filling those in is the only
 * step needed to go live — no code change.
 */

// The values shipped in .env / .env.example. If SMTP_USER/PASS still equal these, treat SMTP as
// unconfigured rather than trying (and failing) to auth against Gmail with a placeholder.
const PLACEHOLDERS = new Set(['your-email@gmail.com', 'your-app-password', '']);

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  ok: boolean;
  skipped?: boolean;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465, // 465 = implicit TLS; 587 = STARTTLS
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      pool: true, // reuse connections across a broadcast batch
      maxConnections: 3,
    });
  }
  return transporter;
}

export const mailService = {
  isConfigured(): boolean {
    return Boolean(env.smtp.host) && !PLACEHOLDERS.has(env.smtp.user) && !PLACEHOLDERS.has(env.smtp.pass);
  },

  /** Send one email. Never throws; returns {skipped} when unconfigured, {ok:false} on failure. */
  async send({ to, subject, html, text }: MailInput): Promise<SendResult> {
    if (!this.isConfigured()) {
      console.log(`  SMTP not configured — skipping email to ${to} (${subject})`);
      return { ok: false, skipped: true };
    }
    try {
      await getTransporter().sendMail({ from: env.smtp.from, to, subject, html, text });
      return { ok: true };
    } catch (err: any) {
      console.warn(`  Email to ${to} failed: ${err?.message || err}`);
      return { ok: false };
    }
  },

  /**
   * Send the same email to many recipients, in batches with a short pause between them so a
   * large broadcast doesn't hammer the provider or exhaust connections. Builds each message from
   * the recipient via `build(recipient)`. Returns tallies; individual failures don't abort the run.
   */
  async sendMany<T extends { email: string }>(
    recipients: T[],
    build: (r: T) => { subject: string; html: string; text: string },
    opts: { batchSize?: number; pauseMs?: number } = {},
  ): Promise<{ sent: number; skipped: number; failed: number; total: number }> {
    const total = recipients.length;
    if (!this.isConfigured()) {
      console.log(`  SMTP not configured — skipping broadcast to ${total} recipient(s)`);
      return { sent: 0, skipped: total, failed: 0, total };
    }
    const batchSize = opts.batchSize ?? 20;
    const pauseMs = opts.pauseMs ?? 1000;
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((r) => {
          const msg = build(r);
          return this.send({ to: r.email, ...msg });
        }),
      );
      for (const res of results) res.ok ? sent++ : failed++;
      if (i + batchSize < recipients.length) await new Promise((res) => setTimeout(res, pauseMs));
    }
    return { sent, skipped: 0, failed, total };
  },
};
