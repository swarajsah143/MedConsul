/**
 * Move the Counselling Conditions content out of the client bundle and into the DB.
 *
 *   npx tsx scripts/migrate-counselling.ts [--replace]
 *
 * The page was ~600 lines of hardcoded TypeScript: 13 quota rules and 4 sections of
 * eligibility/application/domicile copy. NEET rules change annually — none of it was
 * editable without a redeploy. This lifts it into `counsellingQuotas` and
 * `counsellingSections`, which the admin can then edit like any other collection.
 *
 * The content itself is imported from the page's own constants, so nothing is retyped
 * and nothing is lost.
 */

import { QUOTA_LIST, CONTENT, SECTION_META } from '../client/src/lib/counselling-content';

const API = process.env.API_URL || 'http://localhost:5050';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@medcounsel.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '***REDACTED***';
const REPLACE = process.argv.includes('--replace');

let token = '';

async function login() {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!r.ok) throw new Error(`admin login failed (${r.status})`);
  token = (await r.json()).data.accessToken;
}

async function bulk(collection: string, rows: any[]) {
  const r = await fetch(`${API}/api/admin/resources/${collection}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ rows, replace: REPLACE }),
  });
  const body: any = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error(`\n  FAILED ${collection}: ${body.message}`);
    (body.errors || []).slice(0, 6).forEach((e: any) =>
      console.error(`    row ${e.row} · ${e.field}: ${e.message}`));
    throw new Error(`bulk failed for ${collection}`);
  }
  const d = body.data;
  return `${d.inserted} added, ${d.updated} updated${d.deleted ? `, ${d.deleted} deleted` : ''}`;
}

/** The page's Block type is looser than the schema; normalise it. */
const toBlocks = (blocks: any[] = []) =>
  blocks.map((b) => ({
    heading: b.heading ?? '',
    intro: b.intro ?? '',
    items: b.items ?? [],
    note: b.note ?? '',
    ordered: b.ordered ?? false,
  }));

async function main() {
  console.log(`\nCounselling content -> MongoDB (${API})${REPLACE ? '  [REPLACE]' : ''}\n`);
  await login();

  const quotas = (QUOTA_LIST as any[]).map((q, i) => ({
    label: q.label,
    group: q.group,
    authority: q.authority,
    order: i,
    blocks: toBlocks(q.blocks),
  }));
  console.log(`counsellingQuotas    ${await bulk('counsellingQuotas', quotas)}`);

  // SECTIONS carries the tab label/blurb; CONTENT carries the body. They are two
  // halves of one record and are merged here. The 'quota' tab has no CONTENT entry —
  // it renders the quota collection instead — so it is skipped.
  const sections = (SECTION_META as any[])
    .filter((s) => s.key !== 'quota')
    .map((s, i) => {
      const body = (CONTENT as any)[s.key];
      return {
        key: s.key,
        label: s.label,
        blurb: s.blurb ?? '',
        authority: body?.authority ?? '',
        order: i,
        blocks: toBlocks(body?.blocks),
      };
    });
  console.log(`counsellingSections  ${await bulk('counsellingSections', sections)}`);

  console.log(`
The Counselling Conditions page is now admin-editable at:
  /admin/data/counsellingSections   (Eligibility, Application, Domicile, Counselling)
  /admin/data/counsellingQuotas     (${quotas.length} quota types)

Done.
`);
}

main().catch((e) => { console.error('\nMIGRATION FAILED:', e.message); process.exit(1); });
