/**
 * Branded HTML email templates + plain-text fallbacks.
 *
 * Every outbound email goes through `renderEmail()` so the shell (red MedCounsel header, dark
 * footer) is identical everywhere. The app theme's primary red is #dc2626 (see client index.css
 * `gradient-primary`). Each builder returns { subject, html, text } — the text is hand-written,
 * not stripped from HTML, so it reads well in text-only clients.
 *
 * Admin-authored content (broadcast body, announcement reminder body) is passed through
 * `escapeHtml` before it reaches the HTML shell so a stray '<' can't break — or inject into — the
 * markup. `paragraphs()` turns newline-separated plain text into escaped <p> blocks.
 */

export interface Email {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escaped, newline-aware paragraphs for admin-authored plain text. */
function paragraphs(body: string): string {
  return String(body || '')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#334155;font-size:15px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

interface Shell {
  heading: string;
  /** Pre-built, trusted HTML for the body (builders assemble this from escaped pieces). */
  bodyHtml: string;
  cta?: { label: string; url: string };
  /** Small muted line under the CTA, e.g. a raw fallback link. */
  footnote?: string;
}

export function renderEmail({ heading, bodyHtml, cta, footnote }: Shell): string {
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
         <tr><td style="border-radius:10px;background:#dc2626;">
           <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(cta.label)}</a>
         </td></tr>
       </table>`
    : '';
  const foot = footnote ? `<p style="margin:12px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;word-break:break-all;">${footnote}</p>` : '';
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#dc2626,#e11d48);padding:22px 28px;">
          <span style="font-size:19px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">MedCounsel&nbsp;AI</span>
          <span style="font-size:12px;color:rgba(255,255,255,0.85);display:block;margin-top:2px;">NEET UG Counselling Assistant</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#0f172a;">${escapeHtml(heading)}</h1>
          ${bodyHtml}
          ${button}
          ${foot}
        </td></tr>
        <tr><td style="background:#0f172a;padding:18px 28px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">You're receiving this because you have a MedCounsel AI account. This is an automated message — please do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ── builders ──────────────────────────────────────────────────────────────

export function welcomeEmail(name: string): Email {
  const first = (name || 'there').split(' ')[0];
  return {
    subject: 'Welcome to MedCounsel AI',
    html: renderEmail({
      heading: `Welcome, ${escapeHtml(first)} 👋`,
      bodyHtml:
        `<p style="margin:0 0 14px;line-height:1.6;color:#334155;font-size:15px;">Your account is ready. MedCounsel AI helps you navigate NEET UG counselling — closing-rank insights, a fee &amp; seat matrix, seat allotments, college reviews, and a document checklist, all in one place.</p>` +
        `<p style="margin:0 0 14px;line-height:1.6;color:#334155;font-size:15px;">Sign in any time to start building your counselling shortlist.</p>`,
    }),
    text: `Welcome, ${first}!\n\nYour MedCounsel AI account is ready. Sign in any time to explore closing ranks, fees, seat allotments, college reviews and your document checklist.\n\n— MedCounsel AI`,
  };
}

export function resetEmail(name: string, resetUrl: string): Email {
  const first = (name || 'there').split(' ')[0];
  return {
    subject: 'Reset your MedCounsel AI password',
    html: renderEmail({
      heading: 'Reset your password',
      bodyHtml:
        `<p style="margin:0 0 14px;line-height:1.6;color:#334155;font-size:15px;">Hi ${escapeHtml(first)}, we received a request to reset your password. Click below to choose a new one. This link expires in 1 hour.</p>` +
        `<p style="margin:0 0 14px;line-height:1.6;color:#334155;font-size:15px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
      cta: { label: 'Reset password', url: resetUrl },
      footnote: `If the button doesn't work, paste this into your browser:<br><a href="${escapeHtml(resetUrl)}" style="color:#dc2626;">${escapeHtml(resetUrl)}</a>`,
    }),
    text: `Hi ${first},\n\nReset your MedCounsel AI password using the link below (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.\n\n— MedCounsel AI`,
  };
}

/** Admin broadcast — `message` is admin-authored plain text (escaped here). */
export function broadcastEmail(subject: string, message: string): Email {
  return {
    subject,
    html: renderEmail({ heading: subject, bodyHtml: paragraphs(message) }),
    text: `${message}\n\n— MedCounsel AI`,
  };
}

export function planExpiryEmail(name: string, daysLeft: number, planName: string): Email {
  const first = (name || 'there').split(' ')[0];
  const when = daysLeft <= 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
  return {
    subject: `Your ${planName} plan expires ${when}`,
    html: renderEmail({
      heading: `Your ${escapeHtml(planName)} plan expires ${when}`,
      bodyHtml: `<p style="margin:0 0 14px;line-height:1.6;color:#334155;font-size:15px;">Hi ${escapeHtml(first)}, a heads-up that your MedCounsel AI <strong>${escapeHtml(planName)}</strong> plan expires ${when}. Renew to keep uninterrupted access through counselling.</p>`,
    }),
    text: `Hi ${first},\n\nYour MedCounsel AI ${planName} plan expires ${when}. Renew to keep access through counselling.\n\n— MedCounsel AI`,
  };
}

/** Scheduled announcement reminder — `title`/`body` are admin-authored (escaped). */
export function announcementReminderEmail(title: string, body: string, url?: string): Email {
  return {
    subject: `Reminder: ${title}`,
    html: renderEmail({
      heading: title,
      bodyHtml: body ? paragraphs(body) : `<p style="margin:0 0 14px;line-height:1.6;color:#334155;font-size:15px;">A counselling update you asked to be reminded about.</p>`,
      cta: url ? { label: 'View details', url } : undefined,
    }),
    text: `Reminder: ${title}\n\n${body || ''}${url ? `\n\n${url}` : ''}\n\n— MedCounsel AI`,
  };
}
