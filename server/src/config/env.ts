import './load-env';

/**
 * A JWT secret MUST be a real, set value — never a silent fallback. The old `|| 'fallback-secret'`
 * meant a deploy that failed to load .env would boot happily and sign forgeable admin tokens with
 * a public, guessable key. Now the server refuses to start instead.
 */
function requiredSecret(name: string, value: string | undefined): string {
  if (!value || value.startsWith('fallback-')) {
    throw new Error(`${name} is not set (or is the insecure fallback). Put a strong random secret in the repo-root .env before starting the server.`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwt: {
    secret: requiredSecret('JWT_SECRET', process.env.JWT_SECRET),
    refreshSecret: requiredSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET),
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
  // Google Sign-In. Optional, like SMTP — a blank clientId means the /auth/google
  // route responds 503 instead of the server refusing to boot (unlike the JWT
  // secrets, this isn't a security-critical value to fail fast on).
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
} as const;
