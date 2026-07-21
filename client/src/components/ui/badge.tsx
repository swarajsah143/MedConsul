import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Status pill. Replaces the `rounded-full px-2 py-0.5 text-xs font-semibold bg-…-50 text-…-700`
 * pattern that was re-inlined across most list/admin pages. Semantic variants map to the
 * design tokens (success/warning/info) instead of raw emerald/amber/blue.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        primary: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
        success: 'bg-success/10 text-success dark:bg-success/15',
        warning: 'bg-warning/10 text-warning dark:bg-warning/15',
        info: 'bg-info/10 text-info dark:bg-info/15',
        destructive: 'bg-destructive/10 text-destructive dark:bg-destructive/15',
        outline: 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[10px]',
        default: 'px-2 py-0.5 text-xs',
        lg: 'px-2.5 py-1 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Optional leading dot, tinted to the variant. */
  dot?: boolean;
}

export function Badge({ className, variant, size, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden />}
      {children}
    </span>
  );
}

export { badgeVariants };
