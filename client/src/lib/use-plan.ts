import { useAuth } from '@/providers/auth-provider';
import { PLAN_RANK, gates, isStaff, type PlanTier } from './plans';

/**
 * The signed-in user's EFFECTIVE subscription tier and what it unlocks. A pro/premium plan whose
 * `planExpiresAt` has passed counts as free (an expired plan grants nothing). The server enforces
 * the real limits — these flags are for showing locked states and upgrade prompts in the UI.
 *
 * Staff (admin OR counsellor) have COMPLETE authority and no subscription of their own — there is
 * no plan system for them at all, whatever plan value their record happens to carry. They are
 * never gated and never shown upgrade prompts. The server mirrors this by role exactly
 * (hasFullData/hasUnlimitedAi in server/src/utils/plan.ts, both `isStaff`-based now), so this is
 * just the matching UI unlock — no client/server mismatch. `isAdmin` and `isStaff` are both
 * exposed so callers can distinguish "hide plan/pricing UI" (any staff) from "admin-only" cases.
 */
export function usePlan() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const staff = isStaff(user?.role);
  const raw = (user?.plan ?? 'free') as PlanTier;
  const expires = user?.planExpiresAt ?? null;
  const active = raw === 'free' || !expires || new Date(expires).getTime() > Date.now();
  const tier: PlanTier = staff ? 'premium' : active ? raw : 'free';

  return {
    isAdmin,
    isStaff: staff,
    tier,
    isFree: !staff && tier === 'free',
    isPro: staff || PLAN_RANK[tier] >= PLAN_RANK.pro,   // pro OR premium (staff: always)
    isPremium: staff || tier === 'premium',
    canFullData: staff || gates.fullData(tier),         // allotment export, full predictions, college detail
    canUnlimitedAi: staff || gates.unlimitedAi(tier),   // premium only (staff: always)
  };
}
