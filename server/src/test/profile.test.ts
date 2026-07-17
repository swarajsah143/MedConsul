/**
 * Student profiles: an admin can register a walk-in student with their full counselling
 * details, and the student can maintain them afterwards.
 *
 * The two assertions that matter are privilege and privacy:
 *
 *   - A student PUTting {role:'admin', plan:'premium'} to their own profile must not
 *     become an admin on a premium plan. The endpoint copies an ALLOW-LIST, it does not
 *     merge the body.
 *   - `adminNotes` is where a counsellor writes candid things about a family's finances.
 *     It must never be one API call away from the student it is about.
 *
 *   npx tsx src/test/profile.test.ts
 */

const API = process.env.API_URL || 'http://localhost:5050';
let failures = 0;

const check = (name: string, cond: boolean, detail = '') => {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}\n      ${detail}`); }
};

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

const login = async (email: string, password: string) =>
  (await call(null, '/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }))
    .body.data.accessToken as string;

const EMAIL = `zz-profile-${Date.now()}@medcounsel.ai`;
const NOTES = 'Family can only afford a government seat. Do not push deemed colleges.';

async function main() {
  console.log(`\nstudent profiles — ${API}\n`);
  const admin = await login('admin@medcounsel.ai', '***REDACTED***');

  // ── an admin registers a walk-in student, details and all ────────────
  const created = await call(admin, '/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      name: 'ZZ Profile Test', email: EMAIL, password: 'Strong@123', role: 'student',
      phone: '+91 98765 43210', dateOfBirth: '2007-04-12', neetRollNo: '2601234567',
      neetRank: 15420, neetScore: 612, category: 'OBC', domicileState: 'Maharashtra',
      coursePreference: 'MBBS', guardianName: 'Anil Sharma', guardianPhone: '+91 98765 00000',
      adminNotes: NOTES,
    }),
  });
  check('an admin can create a student WITH their counselling details in one request', created.status === 201,
    JSON.stringify(created.body));
  const id: string = created.body?.data?.user?.id;
  const u = created.body?.data?.user ?? {};
  check('the details are stored', u.neetRank === 15420 && u.category === 'OBC' && u.domicileState === 'Maharashtra',
    JSON.stringify(u));

  // ── validation ───────────────────────────────────────────────────────
  const cases: [string, Record<string, any>][] = [
    ['a NEET score above 720', { neetScore: 7200 }],
    ['an unknown category', { category: 'VIP' }],
    ['a nonsense phone number', { phone: 'lol' }],
    ['a DD/MM/YYYY date of birth', { dateOfBirth: '12/04/2007' }],
    ['a negative rank', { neetRank: -5 }],
  ];
  for (const [label, patch] of cases) {
    const r = await call(admin, `/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
    check(`${label} is rejected`, r.status === 400, `got ${r.status}: ${r.body?.message}`);
  }

  // ── PRIVACY: the student must not see the counsellor's notes ─────────
  const student = await login(EMAIL, 'Strong@123');
  const mine = await call(student, '/api/profile');
  const p = mine.body?.data?.profile ?? {};

  check('the student can read their own profile', mine.status === 200);
  check('their own details are there', p.neetRank === 15420 && p.category === 'OBC');
  check(
    "the counsellor's private notes are NOT in the student's own profile",
    !('adminNotes' in p),
    `adminNotes leaked to the student: "${p.adminNotes}"`
  );
  check('the internal plan note is not there either', !('planNote' in p));

  // ── PRIVILEGE: the student must not be able to promote themselves ────
  const escalate = await call(student, '/api/profile', {
    method: 'PUT',
    body: JSON.stringify({ role: 'admin', plan: 'premium', planExpiresAt: '2030-01-01', neetRank: 99 }),
  });
  const after = (await call(student, '/api/profile')).body.data.profile;

  check('a student PUTting role=admin does NOT become an admin', after.role === 'student', `role is now ${after.role}`);
  check('a student PUTting plan=premium does NOT get a premium plan', after.plan === 'free', `plan is now ${after.plan}`);
  check('...but their own legitimate field DID update', after.neetRank === 99, `neetRank=${after.neetRank}`);
  check('the escalation attempt did not error out (it was simply ignored)', escalate.status === 200);

  // A student cannot reach another student's profile at all — there is no such route.
  const asStudent = await call(student, `/api/admin/students/${id}`);
  check('a student cannot read the admin student view (which contains the notes)', asStudent.status === 403,
    `got ${asStudent.status}`);

  // ── the admin still sees their own notes ─────────────────────────────
  const adminView = await call(admin, `/api/admin/students/${id}`);
  check(
    'the ADMIN can still see their private notes',
    adminView.body?.data?.student?.adminNotes === NOTES,
    `got: ${adminView.body?.data?.student?.adminNotes}`
  );

  // ── cleanup ──────────────────────────────────────────────────────────
  await call(admin, `/api/admin/users/${id}`, { method: 'DELETE' });
  const gone = await call(admin, '/api/admin/users');
  check('the test student was removed', !gone.body.data.users.some((x: any) => x.email === EMAIL));

  console.log(failures ? `\n${failures} FAILED\n` : '\nall profile checks passed\n');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
