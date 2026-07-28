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

type SeedRole = 'admin' | 'counsellor' | 'student';

const DEMO_ACCOUNTS: { name: string; email: string; password: string; role: SeedRole }[] = [
  { name: 'Admin User', email: 'admin@medcounsel.ai', password: adminPassword, role: 'admin' },
  { name: 'Demo Counsellor', email: 'counsellor@medcounsel.ai', password: studentPassword, role: 'counsellor' },
  { name: 'Swaraj Sah', email: 'swaraj@medcounsel.ai', password: studentPassword, role: 'student' },
  { name: 'Demo Student', email: 'demo@medcounsel.ai', password: studentPassword, role: 'student' },
];

async function seed() {
  await connectDatabase();
  console.log('\n  Seeding demo accounts...\n');

  for (const account of DEMO_ACCOUNTS) {
    const existing = await UserModel.findByEmail(account.email);
    if (existing) {
      console.log(`  [skip] ${account.email} already exists`);
      continue;
    }
    const hashed = await hashPassword(account.password);
    await UserModel.create(account.name, account.email, hashed, account.role);
    console.log(`  [created] ${account.email} (${account.role})`);
  }

  console.log('\n  Seeding complete.\n');
  await mongoose.disconnect();
  process.exit(0);
}

seed();
