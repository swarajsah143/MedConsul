import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  label?: string;
  fullPage?: boolean;
}

export function Spinner({ className, label, fullPage }: SpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={cn('w-8 h-8 animate-spin text-teal-600', className)} />
      {label && <p className="text-xs text-slate-400">{label}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        {spinner}
      </div>
    );
  }

  return spinner;
}
