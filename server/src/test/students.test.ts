/**
 * Admin students overview: real progress + admin-set plans.
 *
 * Two things this file exists to protect:
 *
 *  1. Progress must be derived from ADMIN-VERIFIED documents, never from an upload.
 *     A student uploading a blank page is not progress. If this ever counts uploads,
 *     the number becomes a lie a student can inflate at will.
 *
 *  2. Plans are admin-granted, not purchased — there is no payment gateway. The old
 *     dashboard invented a plan from `hash(email) % 3` and showed it as billing data.
 *
 *   npx tsx src/test/students.test.ts
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
  if (!r.ok) throw new Error(`login failed for ${email}`);
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

/** Upload a small PDF for a checklist document. */
async function upload(token: string, docId: string): Promise<string> {
  const form = new FormData();
  const pdf = new Blob([new TextEncoder().encode('%PDF-1.4\ntrailer<</Root 1 0 R>>\n%%EOF\n')], {
    type: 'application/pdf',
  });
  form.append('file', pdf, 'test.pdf');
  const res = await fetch(`${API}/api/documents/${docId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const b: any = await res.json();
  if (!res.ok) throw new Error(`upload failed: ${b?.message}`);
  return b.data.submission.id;
}

async function main() {
  console.log(`\nadmin students overview — ${API}\n`);

  const admin = await login('admin@medcounsel.ai', '***REDACTED***');
  const student = await login('demo@medcounsel.ai', '***REDACTED***');

  // ── authorization ────────────────────────────────────────────────────
  for (const [name, path] of [
    ['the students list', '/api/admin/students'],
    ['a student detail', '/api/admin/students/anything'],
  ] as [string, string][]) {
    const r = await call(student, path);
    check(`a student cannot read ${name}`, r.status === 403, `got ${r.status}`);
  }

  const users = (await call(admin, '/api/admin/users')).body.data.users;
  const demo = users.find((u: any) => u.email === 'demo@medcounsel.ai');

  const setPlanAsStudent = await call(student, `/api/admin/students/${demo.id}/plan`, {
    method: 'PUT',
    body: JSON.stringify({ plan: 'premium' }),
  });
  check('a student cannot grant themselves a plan', setPlanAsStudent.status === 403, `got ${setPlanAsStudent.status}`);

  // ── progress is VERIFIED-only ────────────────────────────────────────
  const docs = (await call(null, '/api/data/checklistDocs')).body.data.items;

  const before = (await call(admin, '/api/admin/students')).body.data.students
    .find((s: any) => s.id === demo.id);

  // Upload a document but do NOT verify it.
  const subId = await upload(student, docs[10].id);

  const afterUpload = (await call(admin, '/api/admin/students')).body.data.students
    .find((s: any) => s.id === demo.id);

  check(
    'an UPLOADED but unverified document does NOT count as progress',
    afterUpload.docsVerified === before.docsVerified,
    `verified went ${before.docsVerified} -> ${afterUpload.docsVerified} on a mere upload — a student could inflate their own progress`
  );
  check(
    'it does show up as pending',
    afterUpload.docsPending === before.docsPending + 1,
    `pending ${before.docsPending} -> ${afterUpload.docsPending}`
  );

  // Now the admin verifies it.
  await call(admin, `/api/documents/admin/${subId}`, {
    method: 'POST',
    body: JSON.stringify({ status: 'verified' }),
  });

  const afterVerify = (await call(admin, '/api/admin/students')).body.data.students
    .find((s: any) => s.id === demo.id);

  check(
    'once an ADMIN verifies it, progress increases',
    afterVerify.docsVerified === before.docsVerified + 1,
    `verified ${before.docsVerified} -> ${afterVerify.docsVerified}`
  );
  check(
    'progressPct is verified / total',
    afterVerify.progressPct === Math.round((afterVerify.docsVerified / afterVerify.docsTotal) * 100),
    `pct=${afterVerify.progressPct} verified=${afterVerify.docsVerified}/${afterVerify.docsTotal}`
  );

  // ── detail shows the GAPS, not just what was uploaded ────────────────
  const detail = (await call(admin, `/api/admin/students/${demo.id}`)).body.data;
  check(
    'the detail view lists EVERY checklist document, including ones never uploaded',
    detail.documents.length === docs.length,
    `${detail.documents.length} returned of ${docs.length} checklist documents`
  );
  check(
    'documents that were never uploaded are marked not_uploaded',
    detail.documents.some((d: any) => d.status === 'not_uploaded')
  );

  // ── plans ────────────────────────────────────────────────────────────
  const bad = await call(admin, `/api/admin/students/${demo.id}/plan`, {
    method: 'PUT',
    body: JSON.stringify({ plan: 'platinum' }),
  });
  check('an unknown plan is rejected', bad.status === 400, `got ${bad.status}`);

  const past = await call(admin, `/api/admin/students/${demo.id}/plan`, {
    method: 'PUT',
    body: JSON.stringify({ plan: 'pro', planExpiresAt: '2020-01-01' }),
  });
  check(
    'a paid plan expiring in the PAST is rejected (a data-entry slip, not an intent)',
    past.status === 400,
    `got ${past.status}`
  );

  // A slipped keystroke in a date input turns 2027 into 12027. It is in the future, so a
  // "not in the past" check waves it through — and grants an effectively permanent plan.
  const absurd = await call(admin, `/api/admin/students/${demo.id}/plan`, {
    method: 'PUT',
    body: JSON.stringify({ plan: 'pro', planExpiresAt: '12020-03-31' }),
  });
  check(
    'an absurd expiry year (12020) is rejected, not silently granted forever',
    absurd.status === 400,
    `got ${absurd.status} — a typo'd year grants a permanent plan`
  );

  const granted = await call(admin, `/api/admin/students/${demo.id}/plan`, {
    method: 'PUT',
    body: JSON.stringify({ plan: 'premium', planExpiresAt: '2030-06-30', planNote: 'test grant' }),
  });
  check('an admin can grant a plan with an expiry', granted.status === 200, JSON.stringify(granted.body));

  const withPlan = (await call(admin, '/api/admin/students')).body.data.students
    .find((s: any) => s.id === demo.id);
  check('the plan shows on the overview', withPlan.plan === 'premium');
  check('a future expiry counts as ACTIVE', withPlan.planActive === true);

  // Filter by plan.
  const filtered = (await call(admin, '/api/admin/students?plan=premium')).body.data.students;
  check('the list can be filtered by plan', filtered.every((s: any) => s.plan === 'premium') && filtered.length > 0);

  // ── cleanup ──────────────────────────────────────────────────────────
  await call(admin, `/api/documents/${subId}`, { method: 'DELETE' });
  await call(admin, `/api/admin/students/${demo.id}/plan`, {
    method: 'PUT',
    body: JSON.stringify({ plan: 'free', planExpiresAt: null, planNote: '' }),
  });

  console.log(failures ? `\n${failures} FAILED\n` : '\nall student-overview checks passed\n');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
