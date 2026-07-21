import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Metric tile: a big value + label, optional icon and trend. Replaces the hand-built
 * `text-2xl font-bold` value + label stat blocks duplicated across dashboard, admin
 * dashboard, rank-insights, fee-matrix, etc.
 */
export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  /** Tailwind text color for the icon (e.g. 'text-info'). Defaults to brand red. */
  iconClassName?: string;
  /** Small helper line under the value. */
  hint?: string;
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
  className?: string;
}

const TREND_COLOR = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-slate-400',
} as const;

export function StatCard({ label, value, icon: Icon, iconClassName, hint, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-5',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        {Icon && (
          <span className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <Icon className={cn('w-[18px] h-[18px]', iconClassName || 'text-red-600 dark:text-red-400')} />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
      {(hint || trend) && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          {trend && <span className={cn('font-semibold', TREND_COLOR[trend.direction])}>{trend.value}</span>}
          {hint && <span className="text-slate-400 dark:text-slate-500">{hint}</span>}
        </div>
      )}
    </div>
  );
}
