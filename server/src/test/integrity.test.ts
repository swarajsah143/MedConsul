/**
 * Referential-integrity regression tests.
 *
 * These exist because of a real, verified data-loss bug: bulk import used to do
 * deleteAll() + insertMany(), so an admin re-importing the colleges CSV with
 * "Replace all existing rows" minted fresh ObjectIds and orphaned all 279 closing-rank
 * rows and 65 fee rows. Every college on the site rendered "Unknown college".
 *
 * Run against a live server + Mongo:
 *   npm run dev            (in one shell)
 *   npx tsx src/test/integrity.test.ts
 *
 * Exits non-zero on any failure.
 */

const API = process.env.API_URL || 'http://localhost:5050';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@medcounsel.ai';
const PASSWORD = process.env.ADMIN_PASSWORD || '***REDACTED***';

let token = '';
let failures = 0;

const ok = (name: string) => console.log(`  ✓ ${name}`);
const bad = (name: string, detail: string) => {
  failures++;
  console.error(`  ✗ ${name}\n      ${detail}`);
};

function check(name: string, cond: boolean, detail = '') {
  cond ? ok(name) : bad(name, detail);
}

const api = async (path: string, init: RequestInit = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body } as { status: number; body: any };
};

async function orphanCount() {
  const [c, r, f] = await Promise.all([
    api('/api/data/colleges'),
    api('/api/data/closingRanks'),
    api('/api/data/fees'),
  ]);
  const ids = new Set(c.body.data.items.map((x: any) => x.id));
  return {
    colleges: ids.size,
    ranks: r.body.data.items.length,
    fees: f.body.data.items.length,
    orphanRanks: r.body.data.items.filter((x: any) => !ids.has(x.collegeId)).length,
    orphanFees: f.body.data.items.filter((x: any) => !ids.has(x.collegeId)).length,
  };
}

async function main() {
  console.log(`\nreferential integrity — ${API}\n`);

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (login.status !== 200) throw new Error(`admin login failed: ${login.body?.message}`);
  token = login.body.data.accessToken;

  const before = await orphanCount();
  if (!before.colleges || !before.ranks) throw new Error('no data loaded — run scripts/migrate-to-db.ts first');
  check('baseline has no orphans', before.orphanRanks === 0 && before.orphanFees === 0, JSON.stringify(before));

  // ── 1. the bug that destroyed the data ──────────────────────────────
  // Read EVERY college, not just the first page. The admin list endpoint is hard-capped at
  // 500 rows/page, and this used to fetch a single page and re-post it with replace:true.
  // `replace` deletes every row whose naturalKey is not in the batch — so the moment the
  // table grew past 500 (it is 932 today), this test silently deleted the other 432 colleges
  // and orphaned ~2,800 rank rows. It was reporting that as "the FK-destroying bug is back"
  // when the destruction was its own. The app behaved correctly throughout.
  const rows: any[] = [];
  for (let page = 1; ; page++) {
    const list = await api(`/api/admin/resources/colleges?page=${page}&limit=500`);
    for (const i of list.body.data.items) {
      const { id, createdAt, updatedAt, ...rest } = i;
      rows.push(rest);
    }
    if (page >= list.body.data.pages) break;
  }

  const imp = await api('/api/admin/resources/colleges/bulk', {
    method: 'POST',
    body: JSON.stringify({ rows, replace: true }),
  });
  check('re-import colleges with replace:true succeeds', imp.status === 200, JSON.stringify(imp.body));
  check(
    'replace UPDATES rows in place (does not re-insert with new ids)',
    imp.body?.data?.inserted === 0 && imp.body?.data?.updated === rows.length,
    `expected inserted=0 updated=${rows.length}, got ${JSON.stringify(imp.body?.data)}`
  );

  const after = await orphanCount();
  check(
    'NO ORPHANS after re-importing colleges with replace:true',
    after.orphanRanks === 0 && after.orphanFees === 0,
    `orphaned ${after.orphanRanks} rank rows and ${after.orphanFees} fee rows — the FK-destroying bug is back`
  );
  check('no rows were lost', after.ranks === before.ranks && after.fees === before.fees,
    `ranks ${before.ranks}->${after.ranks}, fees ${before.fees}->${after.fees}`);

  // ── 2. import is idempotent ─────────────────────────────────────────
  const ranks = await api('/api/admin/resources/closingRanks?limit=20');
  const rankRows = ranks.body.data.items.map((i: any) => {
    const { id, createdAt, updatedAt, ...rest } = i;
    return rest;
  });
  const totalBefore = (await orphanCount()).ranks;
  await api('/api/admin/resources/closingRanks/bulk', { method: 'POST', body: JSON.stringify({ rows: rankRows }) });
  await api('/api/admin/resources/closingRanks/bulk', { method: 'POST', body: JSON.stringify({ rows: rankRows }) });
  const totalAfter = (await orphanCount()).ranks;
  check('importing the same rows twice does not duplicate them', totalAfter === totalBefore,
    `${totalBefore} -> ${totalAfter}`);

  // ── 3. dangling foreign keys are rejected ───────────────────────────
  const bogus = await api('/api/admin/resources/closingRanks', {
    method: 'POST',
    body: JSON.stringify({ collegeId: 'deadbeefdeadbeefdeadbeef', year: 2025, round: 1, course: 'MBBS', category: 'General', quota: 'AIQ', closingRank: 1 }),
  });
  check('a collegeId that does not exist is rejected', bogus.status === 400, `got ${bogus.status}`);

  const malformed = await api('/api/admin/resources/closingRanks', {
    method: 'POST',
    body: JSON.stringify({ collegeId: 'not-an-id', year: 2025, round: 1, course: 'MBBS', category: 'General', quota: 'AIQ', closingRank: 1 }),
  });
  check('a malformed collegeId is rejected', malformed.status === 400, `got ${malformed.status}`);

  // ── 4. deleting a referenced college is blocked ─────────────────────
  // Pick a college that IS actually referenced. Picking one at random is not a test:
  // a college with no rank rows is legitimately deletable, and the guard would look
  // broken when it is not.
  const allRanks = await api('/api/data/closingRanks');
  const referencedId: string | undefined = allRanks.body.data.items[0]?.collegeId;
  check('found a referenced college to test the delete guard with', !!referencedId, 'no rank rows exist');

  if (referencedId) {
    const del = await api(`/api/admin/resources/colleges/${referencedId}`, { method: 'DELETE' });
    check('deleting a college that rank/fee rows reference is blocked with 409', del.status === 409,
      `got ${del.status}: ${del.body?.message}`);

    const stillThere = await orphanCount();
    check('the blocked delete changed nothing', stillThere.colleges === after.colleges,
      `college count ${after.colleges} -> ${stillThere.colleges}`);
    check('still no orphans after the blocked delete', stillThere.orphanRanks === 0, 'orphans appeared');
  }

  // ── 5. public endpoints do not 500 on hostile query params ──────────
  for (const [name, path] of [
    ['repeated ?q', '/api/data/colleges?q=a&q=b'],
    ['non-numeric number filter', '/api/data/closingRanks?year=notanumber'],
    ['junk boolean filter', '/api/data/colleges?isActive=maybe'],
    ['unknown filter param', '/api/data/colleges?bogusField=1'],
  ] as [string, string][]) {
    const r = await api(path);
    check(`public endpoint survives ${name}`, r.status === 200, `got ${r.status}`);
  }

  // ── 6. knowledgeBase must never be public ───────────────────────────
  const kb = await api('/api/data/knowledgeBase');
  check('knowledgeBase is not exposed publicly', kb.status === 404, `got ${kb.status}`);


  // ── 7. concurrent logins must not collide ───────────────────────────
  // The refresh-token payload is {userId,email,role} + `iat`, and iat has ONE-SECOND
  // resolution — so two logins by the same user inside the same second used to produce
  // a byte-identical JWT, which hit the unique index on refreshTokens.token and 500'd.
  // A double-clicked "Sign In" was enough to trigger it.
  const burst = await Promise.all(
    Array.from({ length: 5 }, () =>
      api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'demo@medcounsel.ai', password: '***REDACTED***' }),
      })
    )
  );
  check(
    'five simultaneous logins all succeed (no duplicate-refresh-token 500)',
    burst.every((r) => r.status === 200),
    `statuses: ${burst.map((r) => r.status).join(', ')}`
  );
  // NOTE: the ACCESS tokens may legitimately be identical — same user, same claims, same
  // second, and nothing indexes them. It is the REFRESH token that must be unique, because
  // refreshTokens.token has a unique index. That is what the jti fixes, so that is what we assert.
  const refreshCookies = await Promise.all(
    Array.from({ length: 5 }, async () => {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@medcounsel.ai', password: '***REDACTED***' }),
      });
      return res.headers.get('set-cookie') ?? '';
    })
  );
  const distinctRefresh = new Set(refreshCookies.filter(Boolean));
  check(
    'each concurrent login issues a DISTINCT refresh token (the one with the unique index)',
    distinctRefresh.size === refreshCookies.length,
    `${distinctRefresh.size} distinct of ${refreshCookies.length}`
  );

  // ── 8. derived fields are recomputed on write ───────────────────────
  const feeRow = (await api('/api/admin/resources/fees?limit=1')).body.data.items[0];
  const patched = await api(`/api/admin/resources/fees/${feeRow.id}`, {
    method: 'PUT',
    body: JSON.stringify({ tuitionFee: 123456 }),
  });
  const f = patched.body?.data?.item;
  const sum = (f?.tuitionFee ?? 0) + (f?.hostelFee ?? 0) + (f?.miscCharges ?? 0) + (f?.securityDeposit ?? 0);
  check(
    'editing only the tuition fee recomputes totalFirstYear',
    f?.totalFirstYear === sum,
    `totalFirstYear=${f?.totalFirstYear} but components sum to ${sum}`
  );
  // put it back
  await api(`/api/admin/resources/fees/${feeRow.id}`, {
    method: 'PUT',
    body: JSON.stringify({ tuitionFee: feeRow.tuitionFee }),
  });

  console.log(failures ? `\n${failures} FAILED\n` : '\nall integrity checks passed\n');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error('\nERROR:', e.message);
  process.exit(1);
});
