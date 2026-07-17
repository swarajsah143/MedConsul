/**
 * Security + workflow tests for student document uploads.
 *
 * These are identity documents — Aadhaar, marksheets, photographs. The access-control
 * assertions below are the point of this file; the happy path is almost incidental.
 *
 *   npm run dev                       (in one shell, with Mongo up)
 *   npx tsx src/test/documents.test.ts
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

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
  const b = await r.json();
  if (!r.ok) throw new Error(`login failed for ${email}: ${b?.message}`);
  return b.data.accessToken;
}

const call = async (token: string | null, path: string, init: RequestInit = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = {};
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: res.status, body, text };
};

async function uploadFile(token: string, docId: string, filePath: string, mime: string) {
  const form = new FormData();
  const buf = fs.readFileSync(filePath);
  form.append('file', new Blob([buf], { type: mime }), path.basename(filePath));
  const res = await fetch(`${API}/api/documents/${docId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function main() {
  console.log(`\ndocument uploads — ${API}\n`);

  const student = await login('swaraj@medcounsel.ai', '***REDACTED***');
  const other = await login('demo@medcounsel.ai', '***REDACTED***');
  const admin = await login('admin@medcounsel.ai', '***REDACTED***');

  const docs = await call(null, '/api/data/checklistDocs');
  const docId = docs.body.data.items[0].id;
  const docId2 = docs.body.data.items[1].id;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'medc-'));
  const pdf = path.join(tmp, 'marksheet.pdf');
  fs.writeFileSync(pdf, '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
  const svg = path.join(tmp, 'evil.svg');
  fs.writeFileSync(svg, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

  // ── upload ──────────────────────────────────────────────────────────
  const up = await uploadFile(student, docId, pdf, 'application/pdf');
  check('a student can upload a PDF', up.status === 201, JSON.stringify(up.body));
  const subId: string = up.body?.data?.submission?.id;
  check('the upload starts as pending', up.body?.data?.submission?.status === 'pending');

  // ── ACCESS CONTROL — the reason this file exists ─────────────────────
  const byOwner = await call(student, `/api/documents/${subId}/file`);
  check('the OWNER can download their own document', byOwner.status === 200, `got ${byOwner.status}`);

  const byAdmin = await call(admin, `/api/documents/${subId}/file`);
  check('an ADMIN can download it (they must review it)', byAdmin.status === 200, `got ${byAdmin.status}`);

  const byOther = await call(other, `/api/documents/${subId}/file`);
  check(
    "ANOTHER STUDENT cannot download someone else's identity document",
    byOther.status === 404,
    `got ${byOther.status} — a student can read another student's Aadhaar`
  );

  const anon = await call(null, `/api/documents/${subId}/file`);
  check('an ANONYMOUS request cannot download it', anon.status === 401, `got ${anon.status}`);

  const otherDelete = await call(other, `/api/documents/${subId}`, { method: 'DELETE' });
  check("another student cannot DELETE someone else's document", otherDelete.status === 404, `got ${otherDelete.status}`);

  const studentQueue = await call(student, '/api/documents/admin/queue');
  check('a student cannot read the admin review queue', studentQueue.status === 403, `got ${studentQueue.status}`);

  const studentReview = await call(student, `/api/documents/admin/${subId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'verified' }),
  });
  check('a student cannot verify their OWN document', studentReview.status === 403, `got ${studentReview.status}`);

  // ── download hardening ──────────────────────────────────────────────
  const headers = await fetch(`${API}/api/documents/${subId}/file`, {
    headers: { Authorization: `Bearer ${admin}` },
  });
  check(
    'the file is served as an attachment (never rendered inline in our origin)',
    (headers.headers.get('content-disposition') || '').startsWith('attachment'),
    headers.headers.get('content-disposition') || '(none)'
  );
  check(
    'nosniff is set (an upload must never be interpreted as HTML/JS)',
    headers.headers.get('x-content-type-options') === 'nosniff'
  );

  // ── dangerous input ─────────────────────────────────────────────────
  const evil = await uploadFile(student, docId2, svg, 'image/svg+xml');
  check('an SVG (can carry script) is rejected', evil.status === 400, `got ${evil.status}`);

  const big = path.join(tmp, 'big.pdf');
  fs.writeFileSync(big, Buffer.alloc(11 * 1024 * 1024));
  const tooBig = await uploadFile(student, docId2, big, 'application/pdf');
  check('an oversized file is rejected', tooBig.status === 400, `got ${tooBig.status}`);

  const badDoc = await uploadFile(student, 'deadbeefdeadbeefdeadbeef', pdf, 'application/pdf');
  check('an upload against an unknown checklist document is rejected', badDoc.status === 404, `got ${badDoc.status}`);

  // ── review workflow ─────────────────────────────────────────────────
  const noReason = await call(admin, `/api/documents/admin/${subId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'rejected' }),
  });
  check(
    'a rejection with no reason is refused (the student could not fix it)',
    noReason.status === 400,
    `got ${noReason.status}`
  );

  const rejected = await call(admin, `/api/documents/admin/${subId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'rejected', remarks: 'Blurry scan.' }),
  });
  check('an admin can reject with a reason', rejected.body?.data?.submission?.status === 'rejected');

  const mine = await call(student, '/api/documents/mine');
  const row = mine.body.data.items.find((i: any) => i.id === subId);
  check('the student sees the rejection AND the reason', row?.status === 'rejected' && row?.remarks === 'Blurry scan.');

  const reup = await uploadFile(student, docId, pdf, 'application/pdf');
  check(
    're-uploading a fix returns it to pending and clears the stale review',
    reup.body?.data?.submission?.status === 'pending' && reup.body?.data?.submission?.remarks === '',
    JSON.stringify(reup.body?.data?.submission)
  );

  const newId = reup.body.data.submission.id;
  const verified = await call(admin, `/api/documents/admin/${newId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'verified' }),
  });
  check('an admin can verify a document', verified.body?.data?.submission?.status === 'verified');

  // ── cleanup ─────────────────────────────────────────────────────────
  await call(student, `/api/documents/${newId}`, { method: 'DELETE' });
  const gone = await call(student, '/api/documents/mine');
  check('the student can withdraw their own document', !gone.body.data.items.some((i: any) => i.id === newId));

  fs.rmSync(tmp, { recursive: true, force: true });

  console.log(failures ? `\n${failures} FAILED\n` : '\nall document security checks passed\n');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
