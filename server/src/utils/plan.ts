/** Subscription tiers — server source of truth for gating. Mirrors client/src/lib/plans.ts. */

export type PlanTier = 'free' | 'pro' | 'premium';
const RANK: Record<PlanTier, number> = { free: 0, pro: 1, premium: 2 };

/** The tier a user effectively has right now — a pro/premium plan past its expiry counts as free. */
export function effectiveTier(plan?: string | null, planExpiresAt?: string | Date | null): PlanTier {
  const p = (plan as PlanTier) || 'free';
  if (p === 'free') return 'free';
  if (planExpiresAt && new Date(planExpiresAt).getTime() <= Date.now()) return 'free';
  return p;
}

export const atLeast = (tier: PlanTier | undefined, min: PlanTier) => RANK[tier || 'free'] >= RANK[min];
export const isPro = (tier?: PlanTier) => atLeast(tier, 'pro');       // pro OR premium → full data
export const isPremium = (tier?: PlanTier) => tier === 'premium';    // unlimited AI

/**
 * Staff (admin AND counsellor) have COMPLETE authority and are never gated by a subscription —
 * there is no plan system for them at all, only for the students they work with. Gating checks
 * take the whole principal (role + plan from the JWT) and ask these instead of `isPro(plan)` /
 * `isPremium(plan)` directly, so staff are unlocked everywhere by role, no matter what plan value
 * their own record happens to carry (which is why admin-students.tsx hides plan controls for
 * staff rows — granting one a "plan" would be a no-op that only invites confusion).
 */
type Principal = { role?: string | null; plan?: PlanTier | string | null } | null | undefined;
export const isAdmin = (role?: string | null) => role === 'admin';
export const isStaff = (role?: string | null) => role === 'admin' || role === 'counsellor';

/** Full data (allotments, college detail, exports, unlimited predictions). Staff OR pro/premium. */
export const hasFullData = (u: Principal) => isStaff(u?.role) || isPro(u?.plan as PlanTier);
/** Unlimited AI questions. Staff OR premium. */
export const hasUnlimitedAi = (u: Principal) => isStaff(u?.role) || isPremium(u?.plan as PlanTier);

// Free-tier caps (server-enforced).
export const FREE_ALLOTMENT_ROWS = 25;   // non-pro: sample only, no export
export const FREE_PREDICT_MATCHES = 10;  // non-pro: top-N shortlist only
export const FREE_AI_PER_DAY = 5;        // non-premium: questions/day
