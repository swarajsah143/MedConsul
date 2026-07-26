import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { connectDatabase } from './config/database';
import { UserModel } from './models/user.model';
import { hashPassword } from './utils/password';
import mongoose from 'mongoose';

// Seeding a PRODUCTION database with demo accounts is how the default admin password ended up
// live. Refuse unless explicitly forced.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
  console.error('\n  Refusing to seed demo accounts while NODE_ENV=production.\n  Set ALLOW_PROD_SEED=true only if you truly intend to.\n');
  process.exit(1);
}

// The admin password MUST come from the environment — there is deliberately NO default (the old
// hardcoded '***REDACTED***' was a security hole that stayed live in production).
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
if (!adminPassword || adminPassword.length < 10) {
  console.error('\n  SEED_ADMIN_PASSWORD is required (min 10 chars). Set a strong admin password in the environment before seeding.\n  e.g.  SEED_ADMIN_PASSWORD=... npm run seed\n');
  process.exit(1);
}
const studentPassword = process.env.SEED_STUDENT_PASSWORD || 'ChangeMe#Student1';

// Plans are an ADMIN grant, not billing (see user.model.ts). A pro/premium plan needs a future
// expiry or effectiveTier() treats it as free — so seeded paid accounts get a year of runway.
const PLAN_EXPIRY = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

type SeedAccount = {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'student';
  plan?: 'free' | 'pro' | 'premium';
  planNote?: string;
};

// One account per tier so every gated path (allotment export, full predict shortlist, unlimited
// AI) has a login that exercises it. isPro = pro OR premium; isPremium = premium only.
const DEMO_ACCOUNTS: SeedAccount[] = [
  { name: 'Admin User', email: 'admin@medcounsel.ai', password: adminPassword, role: 'admin' },
  { name: 'Swaraj Sah', email: 'swaraj@medcounsel.ai', password: studentPassword, role: 'student', plan: 'free' },
  { name: 'Demo Student', email: 'demo@medcounsel.ai', password: studentPassword, role: 'student', plan: 'free' },
  { name: 'Pro Student', email: 'pro@medcounsel.ai', password: studentPassword, role: 'student', plan: 'pro', planNote: 'Seeded Pro demo account' },
  { name: 'Premium Student', email: 'premium@medcounsel.ai', password: studentPassword, role: 'student', plan: 'premium', planNote: 'Seeded Premium demo account' },
];

// Make the account's plan match the seed exactly. The seed is the source of truth for these
// demo logins, so a `free` account is reset to free (clearing any stale grant from earlier dev
// testing) and a paid account gets a year of runway. Only the DEMO_ACCOUNTS emails are touched —
// real users an admin has upgraded are never seeded, so never reset.
async function applyPlan(id: string, account: SeedAccount): Promise<void> {
  if (!account.plan) return; // admin: no plan concept
  const paid = account.plan !== 'free';
  await UserModel.update(id, {
    plan: account.plan,
    planExpiresAt: paid ? PLAN_EXPIRY : null,
    planNote: paid ? account.planNote : undefined,
  });
}

async function seed() {
  await connectDatabase();
  console.log('\n  Seeding demo accounts...\n');

  for (const account of DEMO_ACCOUNTS) {
    const existing = await UserModel.findByEmail(account.email);
    if (existing) {
      // Idempotent: don't recreate, but still make sure the plan grant is in place so re-running
      // after adding a tier upgrades the existing row rather than silently skipping it.
      await applyPlan(existing.id, account);
      const planLabel = account.plan && account.plan !== 'free' ? ` [plan: ${account.plan}]` : '';
      console.log(`  [skip] ${account.email} already exists${planLabel}`);
      continue;
    }
    const hashed = await hashPassword(account.password);
    const created = await UserModel.create(account.name, account.email, hashed, account.role);
    await applyPlan(created.id, account);
    const planLabel = account.plan && account.plan !== 'free' ? `, ${account.plan}` : '';
    console.log(`  [created] ${account.email} (${account.role}${planLabel})`);
  }

  console.log('\n  Seeding complete.');
  console.log('  Logins: admin@ (admin) · demo@/swaraj@ (free) · pro@ (pro) · premium@ (premium)');
  console.log('  Student password: SEED_STUDENT_PASSWORD (default "ChangeMe#Student1").\n');
  await mongoose.disconnect();
  process.exit(0);
}

seed();
