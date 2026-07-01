import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { connectDatabase } from './config/database';
import { UserModel } from './models/user.model';
import { hashPassword } from './utils/password';
import mongoose from 'mongoose';

const DEMO_ACCOUNTS = [
  {
    name: 'Admin User',
    email: 'admin@medcounsel.ai',
    password: '***REDACTED***',
    role: 'admin',
  },
  {
    name: 'Swaraj Sah',
    email: 'swaraj@medcounsel.ai',
    password: '***REDACTED***',
    role: 'student',
  },
  {
    name: 'Demo Student',
    email: 'demo@medcounsel.ai',
    password: '***REDACTED***',
    role: 'student',
  },
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
