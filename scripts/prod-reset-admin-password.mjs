#!/usr/bin/env node
/**
 * Set a NEW admin password on PRODUCTION. **Runs on the prod host.**
 *
 *   scp -i <key> scripts/prod-reset-admin-password.mjs ec2-user@<host>:/tmp/
 *   ssh  -i <key> ec2-user@<host> 'cd /opt/medconsul/server && node /tmp/prod-reset-admin-password.mjs'
 *   ssh  -i <key> ec2-user@<host> 'cd /opt/medconsul/server && node /tmp/prod-reset-admin-password.mjs --confirm'
 *
 * WHY THIS SCRIPT EXISTS
 * The admin password was lost, and there is no other way back in:
 *   - `npm run seed` is idempotent — it prints [skip] for an existing account and never touches
 *     the password (seed.ts:66-75)
 *   - POST /api/admin/users/:id/password requires you to already BE an admin (chicken and egg)
 *   - forgot-password mails admin@medcounsel.ai, which needs working SMTP and that mailbox
 *
 * THE PASSWORD IS GENERATED HERE, ON THE BOX.
 * It is never typed into a shell command, so it cannot leak into shell history, the process list,
 * or a command-line argument. It is printed exactly once, to stdout, and never stored on disk.
 *
 * Hashing matches the app exactly — bcrypt at 12 rounds (server/src/utils/password.ts) — so the
 * normal login path validates it with no special casing.
 *
 * Touches ONE document: the `admin` user. Never reads or writes any other account.
 */
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';
import path from 'path';

const CONFIRM = process.argv.includes('--confirm');
const ENV_PATH = '/opt/medconsul/.env';
const SALT_ROUNDS = 12;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@medcounsel.ai';

/**
 * Readable but strong: 4 groups of 5 chars from an unambiguous alphabet (no O/0, l/1/I) plus a
 * symbol and digits. ~100 bits of entropy, and a human can retype it off a screen without
 * guessing which character it is.
 */
function generatePassword() {
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const pick = (n) => Array.from(randomBytes(n)).map((b) => ALPHA[b % ALPHA.length]).join('');
  return `${pick(5)}-${pick(5)}-${pick(5)}-${pick(5)}`;
}

function mongoUri() {
  const line = readFileSync(ENV_PATH, 'utf8').split('\n').find((l) => l.startsWith('MONGODB_URI='));
  if (!line) throw new Error(`MONGODB_URI not found in ${ENV_PATH}`);
  return line.slice('MONGODB_URI='.length).trim().replace(/^["']|["']$/g, '');
}

const fromServer = (m) =>
  import(path.join('/opt/medconsul/server/node_modules', m)).catch(() => import(m));

async function main() {
  const { MongoClient } = await fromServer('mongodb/lib/index.js');
  const bcrypt = (await fromServer('bcryptjs/index.js')).default || (await fromServer('bcryptjs'));

  const client = new MongoClient(mongoUri());
  await client.connect();
  const users = client.db().collection('users');

  const admin = await users.findOne({ email: ADMIN_EMAIL }, { projection: { email: 1, role: 1, name: 1 } });
  if (!admin) {
    console.error(`\n  No user with email ${ADMIN_EMAIL}. Aborting.\n`);
    await client.close();
    process.exit(1);
  }
  if (admin.role !== 'admin') {
    console.error(`\n  ${ADMIN_EMAIL} has role "${admin.role}", not admin. Refusing to touch it.\n`);
    await client.close();
    process.exit(1);
  }

  console.log(`\n  target: ${admin.email}  (${admin.name}, role=${admin.role})`);

  if (!CONFIRM) {
    console.log('  DRY RUN — no password changed. Re-run with --confirm.\n');
    await client.close();
    return;
  }

  const password = generatePassword();
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const res = await users.updateOne(
    { _id: admin._id },
    { $set: { password: hashed, updatedAt: new Date() } },
  );
  if (res.modifiedCount !== 1) throw new Error('update did not modify exactly one document');

  // Sanity-check through the same comparison the login route uses, so a bad hash is caught here
  // rather than by a locked-out human.
  const check = await users.findOne({ _id: admin._id }, { projection: { password: 1 } });
  const ok = await bcrypt.compare(password, check.password);

  console.log(`  password updated. login verification: ${ok ? 'PASS' : 'FAIL — do not use, investigate'}`);
  console.log(`\n  email    : ${admin.email}`);
  console.log(`  password : ${password}`);
  console.log('\n  Shown once. Store it in a password manager — do NOT put it in the repo.\n');

  await client.close();
}

main().catch((e) => { console.error(`\n  ERROR: ${e.message}\n`); process.exit(1); });
