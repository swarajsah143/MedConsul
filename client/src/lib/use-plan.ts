import { useAuth } from '@/providers/auth-provider';
import { PLAN_RANK, gates, type PlanTier } from './plans';

/**
 * The signed-in user's EFFECTIVE subscription tier and what it unlocks. A pro/premium plan whose
 * `planExpiresAt` has passed counts as free (an expired plan grants nothing). The server enforces
 * the real limits — these flags are for showing locked states and upgrade prompts in the UI.
 *
 * Admins have COMPLETE authority and no subscription of their own: they are never gated and never
 * shown upgrade prompts, whatever plan value their record carries. The server mirrors this by role
 * (hasFullData/hasUnlimitedAi in server/src/utils/plan.ts), so this is just the matching UI unlock.
 * `isAdmin` is exposed so callers can also hide plan/pricing UI on an admin's own account.
 */
export function usePlan() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const raw = (user?.plan ?? 'free') as PlanTier;
  const expires = user?.planExpiresAt ?? null;
  const active = raw === 'free' || !expires || new Date(expires).getTime() > Date.now();
  const tier: PlanTier = isAdmin ? 'premium' : active ? raw : 'free';

  return {
    isAdmin,
    tier,
    isFree: !isAdmin && tier === 'free',
    isPro: isAdmin || PLAN_RANK[tier] >= PLAN_RANK.pro,   // pro OR premium (admins: always)
    isPremium: isAdmin || tier === 'premium',
    canFullData: isAdmin || gates.fullData(tier),         // allotment export, full predictions, college detail
    canUnlimitedAi: isAdmin || gates.unlimitedAi(tier),   // premium only (admins: always)
  };
}
