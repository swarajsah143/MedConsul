import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { initializeDatabase } from './config/database';
import { UserModel } from './models/user.model';
import { hashPassword } from './utils/password';

const DEMO_ACCOUNTS = [
  {
    name: 'Admin User',
    email: 'admin@medcounsel.ai',
    password: 'Admin@123',
    role: 'admin',
  },
  {
    name: 'Swaraj Sah',
    email: 'swaraj@medcounsel.ai',
    password: 'Swaraj@123',
    role: 'student',
  },
  {
    name: 'Demo Student',
    email: 'demo@medcounsel.ai',
    password: 'Demo@123',
    role: 'student',
  },
];

async function seed() {
  initializeDatabase();
  console.log('\n  Seeding demo accounts...\n');

  for (const account of DEMO_ACCOUNTS) {
    const existing = UserModel.findByEmail(account.email);
    if (existing) {
      console.log(`  [skip] ${account.email} already exists`);
      continue;
    }
    const hashed = await hashPassword(account.password);
    UserModel.create(account.name, account.email, hashed, account.role);
    console.log(`  [created] ${account.email} (${account.role})`);
  }

  console.log('\n  Seeding complete.\n');
}

seed();
