import './load-env';

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  // SMTP for outbound student email (welcome, password reset, admin broadcast, reminders).
  // The vars already exist in the repo-root .env as placeholders; mail.service treats the
  // shipped placeholders (`your-email@gmail.com` / `your-app-password`) as "not configured"
  // so it no-ops until real creds are filled in. See services/mail.service.ts.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'MedCounsel AI <noreply@medcounsel.ai>',
  },
} as const;
