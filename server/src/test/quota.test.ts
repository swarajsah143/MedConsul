/**
 * Quota access classifier — pure, no server or DB needed.
 *
 *   npx tsx server/src/test/quota.test.ts
 *
 * Covers every distinct `quota` string live in the fees collection as of Aug 2026, because the
 * classifier's whole job is to be right about THESE strings. The `(P)`/`(Q)`/`(N)` cases are the
 * point of the suite: they must stay UNCLASSIFIED. KEA's own scraper refuses to translate its
 * letter codes, so asserting a domicile rule for them would be inventing eligibility advice.
 */
import { quotaAccess, isOpenTo, restrictionNote } from '../utils/quota';

let pass = 0;
let fail = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`); }
}

console.log('\nquota access classifier\n');

// ── nationally open: no badge, open to everyone ─────────────────────────────
for (const q of ['All India Quota (AIQ)', 'Deemed Quota', 'Management Quota', 'NRI Quota']) {
  check(`${q} -> national`, quotaAccess(q, 'Karnataka').scope, 'national');
  check(`${q} open to a Bihar student`, isOpenTo(quotaAccess(q, 'Karnataka'), 'Bihar'), true);
}

// ── explicit "<State> State Quota": state is in the string ──────────────────
check('Maharashtra State Quota', quotaAccess('Maharashtra State Quota', 'Maharashtra'),
  { scope: 'state', domicileState: 'Maharashtra', label: 'Maharashtra domicile required' });
check('Tamil Nadu State Quota (two words)', quotaAccess('Tamil Nadu State Quota', 'Tamil Nadu').domicileState, 'Tamil Nadu');
check('Uttar Pradesh State Quota', quotaAccess('Uttar Pradesh State Quota', 'Uttar Pradesh').domicileState, 'Uttar Pradesh');

// ── the KEA trap: "Government (G)" is the KARNATAKA state quota ─────────────
check('Government Quota (G) is state-gated, not national',
  quotaAccess('Government Quota (G)', 'Karnataka'),
  { scope: 'state', domicileState: 'Karnataka', label: 'Karnataka domicile required' });
check('Government Quota (G) with no college state -> unknown, not a vague badge',
  quotaAccess('Government Quota (G)', '').scope, 'unknown');

// ── KEA letter codes we must NOT classify ──────────────────────────────────
for (const q of ['Private Quota (P)', 'Other Quota (Q)', 'NRI Quota (N)']) {
  check(`${q} stays unknown`, quotaAccess(q, 'Karnataka').scope, 'unknown');
  check(`${q} renders no badge`, quotaAccess(q, 'Karnataka').label, undefined);
  check(`${q} never reads as closed`, isOpenTo(quotaAccess(q, 'Karnataka'), 'Bihar'), true);
}

// ── the case that started this: Bihar student, Karnataka seat ──────────────
const kea = quotaAccess('Government Quota (G)', 'Karnataka');
check('Bihar student CANNOT take a Karnataka state seat', isOpenTo(kea, 'Bihar'), false);
check('Karnataka student CAN', isOpenTo(kea, 'Karnataka'), true);
check('case/space insensitive', isOpenTo(kea, '  karnataka '), true);
check('no domicile set -> never told it is closed', isOpenTo(kea, ''), true);
check('undefined domicile -> never told it is closed', isOpenTo(kea, undefined), true);
check('restriction note names both states',
  restrictionNote(kea, 'Bihar'),
  'Your profile says Bihar — this seat requires Karnataka domicile.');
check('no note when eligible', restrictionNote(kea, 'Karnataka'), '');

// ── junk input must not throw or invent a rule ─────────────────────────────
check('empty quota', quotaAccess('', 'Karnataka').scope, 'unknown');
check('null quota', quotaAccess(null, null).scope, 'unknown');
check('unrecognised quota', quotaAccess('Some Future Quota', 'Kerala').scope, 'unknown');

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
