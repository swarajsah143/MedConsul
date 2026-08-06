/**
 * Who can actually take a seat, derived from its quota label.
 *
 * MIRRORED from `server/src/utils/quota.ts` — change both together (same convention as
 * `plan.ts` <-> `plans.ts`).
 *
 * WHY THIS EXISTS
 * A fee belongs to a SEAT, not to a student, and most state seats are domicile-gated. In Karnataka
 * a domiciled student takes a PRIVATE college seat at the KEA "Government (G)" rate of ~1.4L, while
 * a student from Bihar pays the Private (P) rate of ~12L for the same seat at the same college —
 * 8x, purely on domicile. The Fee & Seats page, the counsellor lookup and the chatbot all printed
 * both numbers with nothing marking which was out of reach, so a student could plan around a figure
 * they could never be offered and only discover it at counselling.
 *
 * IT IS DERIVED, NOT STORED
 * From (quota, collegeState) — no schema field and no migration, so it stays correct as rows are
 * imported. The cost is that an unrecognised quota string must be handled honestly rather than
 * guessed: see `unknown` below.
 */

export type QuotaScope = 'national' | 'state' | 'unknown';

export interface QuotaAccess {
  scope: QuotaScope;
  /** The state whose domicile the seat requires. Only set when scope === 'state'. */
  domicileState?: string;
  /** Short badge text. Absent for `national` (nothing to warn about) and for `unknown`. */
  label?: string;
}

/** Quotas open to every candidate nationally, whatever their home state. */
const NATIONAL = new Set([
  'all india quota (aiq)',
  'deemed quota',
  'management quota',
  'nri quota',
]);

/**
 * KEA (Karnataka) publishes letter-coded categories. Only "Government (G)" is safe to classify:
 * it is the KARNATAKA STATE quota, despite reading like a national "government" seat — the single
 * most misread label in this dataset.
 *
 * (P), (Q) and (N) are deliberately NOT here. `data/fetch_kea_fees.py` states outright that KEA's
 * letters must not be translated — "OTHER (Q) is not the same thing as a COMEDK seat and Private
 * (P) is not the same thing as a management seat". Classifying them would invent an eligibility
 * claim the source refuses to make, so they fall through to `unknown` and render nothing.
 */
const KEA_STATE_QUOTA = 'government quota (g)';

/** `"Maharashtra State Quota"` -> `"Maharashtra"`. */
const STATE_QUOTA_RE = /^(.+?)\s+State\s+Quota$/i;

export function quotaAccess(quota?: string | null, collegeState?: string | null): QuotaAccess {
  const q = (quota || '').trim();
  if (!q) return { scope: 'unknown' };

  const lower = q.toLowerCase();
  if (NATIONAL.has(lower)) return { scope: 'national' };

  const named = q.match(STATE_QUOTA_RE);
  if (named) {
    const state = named[1].trim();
    return { scope: 'state', domicileState: state, label: `${state} domicile required` };
  }

  // KEA's letter codes carry no state in the string — it has to come from the college.
  if (lower === KEA_STATE_QUOTA) {
    const state = (collegeState || '').trim();
    // Without the college's state we cannot name the requirement, and an unnamed "domicile
    // required" badge is not actionable. Say nothing rather than something vague.
    if (!state) return { scope: 'unknown' };
    return { scope: 'state', domicileState: state, label: `${state} domicile required` };
  }

  return { scope: 'unknown' };
}

/**
 * Can a student from `domicileState` take this seat?
 *
 * `true` for anything not positively known to be gated — an `unknown` quota must never be
 * presented as closed, and a student who has not set a domicile is not told anything is shut to
 * them. Only an explicit state mismatch returns false.
 */
export function isOpenTo(access: QuotaAccess, studentDomicile?: string | null): boolean {
  if (access.scope !== 'state' || !access.domicileState) return true;
  const mine = (studentDomicile || '').trim().toLowerCase();
  if (!mine) return true;
  return mine === access.domicileState.trim().toLowerCase();
}

/** One-line explanation for a student who cannot take this seat. Empty when they can. */
export function restrictionNote(access: QuotaAccess, studentDomicile?: string | null): string {
  if (isOpenTo(access, studentDomicile)) return '';
  return `Your profile says ${String(studentDomicile).trim()} — this seat requires ${access.domicileState} domicile.`;
}
