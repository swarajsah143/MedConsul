import { Lock } from 'lucide-react';
import { quotaAccess, isOpenTo } from '@/lib/quota';

/**
 * Marks a fee/seat row that requires a particular state's domicile.
 *
 * Two levels, deliberately:
 *   1. the seat's own condition ("Karnataka domicile required") — always correct, shown to
 *      everyone including signed-out visitors
 *   2. if the viewer's profile domicile differs, a second line saying so
 *
 * It never hides or disables the row. A profile can be stale or blank, and a student must not lose
 * sight of an option because we guessed wrong about them. An unclassifiable quota (KEA's P/Q/N)
 * renders nothing at all — see the note in lib/quota.ts on why those stay unlabelled.
 */
export function DomicileBadge({
  quota,
  collegeState,
  myDomicile,
  compact = false,
}: {
  quota?: string | null;
  collegeState?: string | null;
  myDomicile?: string;
  compact?: boolean;
}) {
  const access = quotaAccess(quota, collegeState);
  if (access.scope !== 'state' || !access.label) return null;

  const blocked = !isOpenTo(access, myDomicile);

  if (compact) {
    return (
      <span
        title={blocked ? `Requires ${access.domicileState} domicile — your profile says ${myDomicile}` : access.label}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
          blocked
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
        }`}
      >
        <Lock className="w-2.5 h-2.5" />
        {blocked ? 'Not for you' : access.domicileState}
      </span>
    );
  }

  return (
    <div className="mt-1 space-y-0.5">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
          blocked
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
        }`}
      >
        <Lock className="w-3 h-3" />
        {access.label}
      </span>
      {blocked && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 leading-snug">
          Your profile says <strong>{myDomicile}</strong> — you would not be eligible for this seat,
          so this fee would not apply to you.
        </p>
      )}
    </div>
  );
}
