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

// Free-tier caps (server-enforced).
export const FREE_ALLOTMENT_ROWS = 25;   // non-pro: sample only, no export
export const FREE_PREDICT_MATCHES = 10;  // non-pro: top-N shortlist only
export const FREE_AI_PER_DAY = 5;        // non-premium: questions/day
