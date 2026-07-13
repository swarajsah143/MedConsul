#!/usr/bin/env node
/**
 * Open MedCounsel in a real browser, already signed in.
 *
 *   npm run open                  → local dev (http://localhost:5173) as admin
 *   npm run open -- student       → as the demo student
 *   npm run open -- prod          → against production
 *   npm run open -- prod student  → production, as the student
 *   npm run open -- --url http://localhost:5173 --at /admin/students
 *
 * CREDENTIALS COME FROM THE ENVIRONMENT, never from this file:
 *
 *   MEDC_ADMIN_EMAIL / MEDC_ADMIN_PASSWORD
 *   MEDC_STUDENT_EMAIL / MEDC_STUDENT_PASSWORD
 *
 * They fall back to the demo accounts in CREDENTIALS.md, which are already public in
 * this repo. Do NOT hardcode a real password here — this file is committed. Put real
 * ones in your shell profile or a gitignored .env.local and export them.
 */

import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (f, d) => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : d;
};

const PROD = 'http://32.236.16.232';
const LOCAL = 'http://localhost:5173';

const base = (opt('--url', null) ?? (has('prod') ? PROD : LOCAL)).replace(/\/$/, '');
const asStudent = has('student');
const landing = opt('--at', asStudent ? '/dashboard' : '/admin/students');
const headless = has('--headless');

const account = asStudent
  ? {
      label: 'student',
      email: process.env.MEDC_STUDENT_EMAIL ?? 'swaraj@medcounsel.ai',
      password: process.env.MEDC_STUDENT_PASSWORD ?? '***REDACTED***',
    }
  : {
      label: 'admin',
      email: process.env.MEDC_ADMIN_EMAIL ?? 'admin@medcounsel.ai',
      password: process.env.MEDC_ADMIN_PASSWORD ?? '***REDACTED***',
    };

const usingDefaults =
  (asStudent && !process.env.MEDC_STUDENT_PASSWORD) || (!asStudent && !process.env.MEDC_ADMIN_PASSWORD);

async function main() {
  console.log(`\n  ${base}  ·  signing in as ${account.label} (${account.email})`);
  if (usingDefaults) {
    console.log('  using the public demo password from CREDENTIALS.md');
    console.log('  (set MEDC_ADMIN_PASSWORD / MEDC_STUDENT_PASSWORD to override)');
  }

  // Fail fast with a useful message rather than a Playwright timeout wall.
  try {
    const health = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error(`status ${health.status}`);
  } catch (e) {
    console.error(`\n  Cannot reach ${base} — ${e.message}`);
    console.error(base === LOCAL ? '  Is `npm run dev` running?\n' : '  Is the server up?\n');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless, args: ['--start-maximized'] });
  const page = await (await browser.newContext({ viewport: null })).newPage();

  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });

  await page.getByLabel(/email/i).fill(account.email);
  await page.getByLabel(/password/i).fill(account.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // The app redirects to /dashboard on success and stays on /login on failure.
  try {
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
  } catch {
    const msg = await page.locator('[role="alert"], .text-red-600, .text-red-500').first().textContent().catch(() => null);
    console.error(`\n  Login failed${msg ? `: ${msg.trim()}` : ''}`);
    console.error('  Check the credentials, or the account may not exist on this server.\n');
    await browser.close();
    process.exit(1);
  }

  if (landing && landing !== '/dashboard') {
    await page.goto(`${base}${landing}`, { waitUntil: 'domcontentloaded' });
  }

  console.log(`  signed in → ${base}${landing}`);

  if (headless) {
    await browser.close();
    return;
  }

  console.log('  browser is open. Ctrl-C here to close it.\n');
  // Keep the process alive so the window stays up; close cleanly on Ctrl-C.
  await new Promise((resolve) => {
    process.on('SIGINT', resolve);
    browser.on('disconnected', resolve);
  });
  await browser.close().catch(() => {});
}

main().catch((e) => {
  console.error('\n ', e.message, '\n');
  process.exit(1);
});
