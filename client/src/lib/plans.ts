/**
 * Subscription tiers — the single source of truth for the pricing page and (soon) feature gating.
 *
 * Maps onto the existing user.plan enum: free | pro | premium.
 *   Free     — a usable taste of everything, with caps.
 *   Pro      — ₹3,999 — full data features (allotments+export, unlimited predictions, college detail).
 *   Premium  — ₹4,999 — everything in Pro PLUS unlimited AI assistant.
 *
 * Payment (Razorpay) is not wired yet — plans are granted by an admin for now, so the paid CTAs
 * point at "request upgrade" until checkout exists.
 */

export type PlanTier = 'free' | 'pro' | 'premium';

/** Higher rank = more access. Used by the (upcoming) gating helpers. */
export const PLAN_RANK: Record<PlanTier, number> = { free: 0, pro: 1, premium: 2 };

export interface Plan {
  id: PlanTier;
  name: string;
  price: number;            // ₹, one-time for the counselling season
  tagline: string;
  highlighted?: boolean;    // "Most popular"
  cta: string;
}

export const PLANS: Plan[] = [
  { id: 'free', name: 'Free', price: 0, tagline: 'Start planning at no cost', cta: 'Get started' },
  { id: 'pro', name: 'Pro', price: 3999, tagline: 'Everything you need to build your shortlist', highlighted: true, cta: 'Upgrade to Pro' },
  { id: 'premium', name: 'Premium', price: 4999, tagline: 'Pro + unlimited AI counsellor', cta: 'Upgrade to Premium' },
];

/** One row per capability; the value per tier is what the pricing table shows. `true` = ✓ included. */
export interface FeatureRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  premium: string | boolean;
}

export const FEATURE_MATRIX: FeatureRow[] = [
  { label: 'Closing rank insights (900+ colleges)', free: true, pro: true, premium: true },
  { label: 'Fee & seat matrix', free: true, pro: true, premium: true },
  { label: 'Document checklist & uploads', free: true, pro: true, premium: true },
  { label: 'Rank predictor', free: '3 / day · top 10', pro: 'Unlimited · full list · export', premium: 'Unlimited · full list · export' },
  { label: 'Seat allotments', free: 'First 25 · no export', pro: 'Full history · CSV export', premium: 'Full history · CSV export' },
  { label: 'College reviews & profiles', free: 'Basics only', pro: 'Full detail', premium: 'Full detail' },
  { label: 'MedAssist AI counsellor', free: '5 questions / day', pro: '5 questions / day', premium: 'Unlimited' },
];

/** Feature-gate predicates keyed on the user's tier. Server enforces the real limits; these mirror them. */
export const gates = {
  /** Full data (allotment export, unlimited predictions, full college detail) — Pro or Premium. */
  fullData: (tier: PlanTier) => PLAN_RANK[tier] >= PLAN_RANK.pro,
  /** Unlimited AI — Premium only. */
  unlimitedAi: (tier: PlanTier) => tier === 'premium',
};

export const formatPrice = (n: number) => (n === 0 ? 'Free' : `₹${n.toLocaleString('en-IN')}`);
