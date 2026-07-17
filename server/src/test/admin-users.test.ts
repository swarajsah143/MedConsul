/**
 * Admin user-management guards.
 *
 * The lockout guards are the reason this file exists. An admin panel that lets the
 * only admin demote or delete themselves locks everyone out permanently, with no
 * recovery short of editing the database by hand.
 *
 *   npx tsx src/test/admin-users.test.ts
 */

const API = process.env.API_URL || 'http://localhost:5050';
let failures = 0;

const check = (name: string, cond: boolean, detail = '') => {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}\n      ${detail}`); }
};

async function login(email: string, password: string): Promise<string> {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const b: any = await r.json();
  if (!r.ok) throw new Error(`login failed for ${email}: ${b?.message}`);
  return b.data.accessToken;
}

async function call(token: string | null, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body: any = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

const TEMP_EMAIL = `zz-guardtest-${Date.now()}@medcounsel.ai`;

async function main() {
  console.log(`\nadmin user management — ${API}\n`);

  const admin = await login('admin@medcounsel.ai', '***REDACTED***');
  const student = await login('swaraj@medcounsel.ai', '***REDACTED***');

  const me = (await call(admin, '/api/auth/me')).body.data.user.id;

  // ── authorization ────────────────────────────────────────────────────
  for (const [name, path, method] of [
    ['list users', '/api/admin/users', 'GET'],
    ['create a user', '/api/admin/users', 'POST'],
    ['delete a user', `/api/admin/users/${me}`, 'DELETE'],
  ] as [string, string, string][]) {
    const r = await call(student, path, { method, body: method === 'POST' ? '{}' : undefined });
    check(`a student cannot ${name}`, r.status === 403, `got ${r.status}`);
  }

  // ── lockout guards ───────────────────────────────────────────────────
  const demoteSelf = await call(admin, `/api/admin/users/${me}`, {
    method: 'PUT',
    body: JSON.stringify({ role: 'student' }),
  });
  check(
    'the only admin CANNOT demote themselves (would lock everyone out)',
    demoteSelf.status === 409,
    `got ${demoteSelf.status} — the admin panel can be permanently locked`
  );

  const deleteSelf = await call(admin, `/api/admin/users/${me}`, { method: 'DELETE' });
  check('an admin cannot delete their own account', deleteSelf.status === 409, `got ${deleteSelf.status}`);

  const stillAdmin = await call(admin, '/api/auth/me');
  check('the admin is still an admin after both refusals', stillAdmin.body?.data?.user?.role === 'admin');

  // ── validation ───────────────────────────────────────────────────────
  const weak = await call(admin, '/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'Weak', email: TEMP_EMAIL, password: 'abc' }),
  });
  check('a weak password is rejected', weak.status === 400, `got ${weak.status}`);

  const dupe = await call(admin, '/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'Dupe', email: 'swaraj@medcounsel.ai', password: 'Strong@123' }),
  });
  check('a duplicate email is rejected', dupe.status === 409, `got ${dupe.status}`);

  const badRole = await call(admin, '/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'Bad', email: TEMP_EMAIL, password: 'Strong@123', role: 'superuser' }),
  });
  check('an unknown role is rejected', badRole.status === 400, `got ${badRole.status}`);

  // ── the happy path ───────────────────────────────────────────────────
  const created = await call(admin, '/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'ZZ Guard Test', email: TEMP_EMAIL, password: 'Strong@123', role: 'student' }),
  });
  check('an admin can create a user', created.status === 201, JSON.stringify(created.body));
  const newId: string = created.body?.data?.user?.id;

  const promoted = await call(admin, `/api/admin/users/${newId}`, {
    method: 'PUT',
    body: JSON.stringify({ role: 'admin' }),
  });
  check('an admin can promote a user', promoted.body?.data?.user?.role === 'admin');

  // With a second admin now present, the last-admin guard must relax.
  const demoteOther = await call(admin, `/api/admin/users/${newId}`, {
    method: 'PUT',
    body: JSON.stringify({ role: 'student' }),
  });
  check(
    'with two admins, one CAN be demoted (the guard is about the LAST admin, not any admin)',
    demoteOther.body?.data?.user?.role === 'student',
    JSON.stringify(demoteOther.body)
  );

  const reset = await call(admin, `/api/admin/users/${newId}/password`, {
    method: 'POST',
    body: JSON.stringify({ password: 'Reset@1234' }),
  });
  check('an admin can reset a password', reset.status === 200);

  const loginNew = await call(null, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: TEMP_EMAIL, password: 'Reset@1234' }),
  });
  check('the user can log in with the new password', loginNew.status === 200, `got ${loginNew.status}`);

  const removed = await call(admin, `/api/admin/users/${newId}`, { method: 'DELETE' });
  check('an admin can delete a user', removed.status === 200);
  check(
    'deleting a user reports how many of their documents were destroyed',
    typeof removed.body?.data?.deletedDocuments === 'number'
  );

  const after = await call(admin, '/api/admin/users');
  check('the deleted user is gone', !after.body.data.users.some((u: any) => u.email === TEMP_EMAIL));

  console.log(failures ? `\n${failures} FAILED\n` : '\nall admin user-management checks passed\n');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
