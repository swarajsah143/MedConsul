import { useAuth } from '@/providers/auth-provider';
import { PLAN_RANK, gates, isStaff, type PlanTier } from './plans';

/**
 * The signed-in user's EFFECTIVE subscription tier and what it unlocks. A pro/premium plan whose
 * `planExpiresAt` has passed counts as free (an expired plan grants nothing). The server enforces
 * the real limits — these flags are for showing locked states and upgrade prompts in the UI.
 *
 * Admins/counsellors bypass the tier checks entirely (see isStaff) — they need the full data to
 * do their job, not a subscription, so canFullData/canUnlimitedAi are true for them regardless
 * of `tier`, and no upgrade prompt should ever be shown to them.
 */
export function usePlan() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const raw = (user?.plan ?? 'free') as PlanTier;
  const expires = user?.planExpiresAt ?? null;
  const active = raw === 'free' || !expires || new Date(expires).getTime() > Date.now();
  const tier: PlanTier = active ? raw : 'free';

  return {
    isAdmin,
    tier,
    isFree: tier === 'free',
    isPro: PLAN_RANK[tier] >= PLAN_RANK.pro,       // pro OR premium
    isPremium: tier === 'premium',
    canFullData: gates.fullData(tier),             // allotment export, full predictions, college detail
    canUnlimitedAi: gates.unlimitedAi(tier),       // premium only
  };
}
