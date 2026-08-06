#!/usr/bin/env node
/**
 * Create (or re-password) the demo COUNSELLOR and PREMIUM STUDENT accounts on production.
 * **Runs on the prod host.**
 *
 *   ssh … 'cd /opt/medconsul/server && node /tmp/prod-create-demo-accounts.mjs'
 *   ssh … 'cd /opt/medconsul/server && node /tmp/prod-create-demo-accounts.mjs --confirm'
 *
 * Passwords are generated HERE, on the box, so they never appear in a shell command, shell
 * history, or a process list. They are printed exactly once.
 *
 * Only ever touches the two demo addresses below. Real user accounts are never read or modified —
 * production holds the only copy of those.
 *
 * The premium account needs `planExpiresAt` in the FUTURE: `effectiveTier` (server/src/utils/plan.ts)
 * treats an expired paid plan as free, so a premium account without a live expiry silently behaves
 * like a free one and demos nothing.
 */
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';
import path from 'path';

const CONFIRM = process.argv.includes('--confirm');
const ENV_PATH = '/opt/medconsul/.env';
const SALT_ROUNDS = 12;

/**
 * Defaults, or override from the CLI to mint one specific account:
 *   node prod-create-demo-accounts.mjs --email x@y.ai --name "X" --role student --plan free --confirm
 */
const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const ACCOUNTS = arg('--email')
  ? [{
      name: arg('--name') || 'Demo Student',
      email: arg('--email'),
      role: arg('--role') || 'student',
      // 'free' is the absence of a paid grant, not a grant — passing plan:'free' would set a
      // planExpiresAt and planNote for a tier that has neither.
      ...(arg('--plan') && arg('--plan') !== 'free' ? { plan: arg('--plan') } : {}),
    }]
  : [
      { name: 'Demo Counsellor', email: 'counsellor@medcounsel.ai', role: 'counsellor' },
      { name: 'Premium Student', email: 'premium@medcounsel.ai', role: 'student', plan: 'premium' },
    ];

/** Readable but strong: unambiguous alphabet (no O/0, l/1/I) so it can be retyped off a screen. */
function generatePassword() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const pick = (n) => Array.from(randomBytes(n)).map((b) => A[b % A.length]).join('');
  return `${pick(5)}-${pick(5)}-${pick(5)}`;
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

  console.log('');
  for (const a of ACCOUNTS) {
    const existing = await users.findOne({ email: a.email }, { projection: { email: 1, role: 1 } });
    console.log(`  ${a.email.padEnd(28)} ${existing ? 'exists — will re-password' : 'will be CREATED'}  (role ${a.role}${a.plan ? `, plan ${a.plan}` : ''})`);
  }

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing written. Re-run with --confirm.\n');
    await client.close();
    return;
  }

  const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const out = [];

  for (const a of ACCOUNTS) {
    const password = generatePassword();
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date();

    const set = { name: a.name, password: hashed, role: a.role, updatedAt: now };
    if (a.plan) {
      set.plan = a.plan;
      set.planExpiresAt = oneYear;      // without this, effectiveTier() reads it as free
      set.planNote = 'Seeded demo account';
    } else if (a.role === 'student') {
      // An explicit free tier with no expiry — otherwise a re-run over a previously-paid account
      // would leave a stale grant in place and the "free" demo would behave as pro.
      set.plan = 'free';
      set.planExpiresAt = null;
      set.planNote = '';
    }

    await users.updateOne(
      { email: a.email },
      { $set: set, $setOnInsert: { email: a.email, createdAt: now, isActive: true } },
      { upsert: true },
    );

    // Verify through the same comparison the login route uses, so a bad hash is caught here and
    // not by a locked-out human.
    const check = await users.findOne({ email: a.email }, { projection: { password: 1 } });
    const ok = await bcrypt.compare(password, check.password);
    out.push({ ...a, password, ok });
  }

  console.log('\n  ── credentials (shown once) ──');
  for (const o of out) {
    console.log(`  ${o.role.toUpperCase()}${o.plan ? ` — ${o.plan.toUpperCase()}` : ' — FREE'}`);
    console.log(`    email    : ${o.email}`);
    console.log(`    password : ${o.password}`);
    console.log(`    login check: ${o.ok ? 'PASS' : 'FAIL — do not use'}`);
  }
  console.log('\n  Store these in a password manager — do NOT put them in the repo.\n');
  await client.close();
}

main().catch((e) => { console.error(`\n  ERROR: ${e.message}\n`); process.exit(1); });
