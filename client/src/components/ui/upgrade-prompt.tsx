import { Link } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

/** A locked-feature card with an upgrade CTA to /pricing. Used where a premium feature is gated. */
export function UpgradePrompt({
  title,
  description,
  tier = 'Pro',
  className = '',
}: {
  title: string;
  description?: string;
  tier?: 'Pro' | 'Premium';
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-6 text-center ${className}`}>
      <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center mx-auto text-white shadow">
        <Lock className="w-5 h-5" />
      </div>
      <h3 className="mt-3 font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">{description}</p>}
      <Link
        to="/pricing"
        className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all"
      >
        <Sparkles className="w-4 h-4" /> Upgrade to {tier} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

/** A small inline "PRO" / "PREMIUM" lock chip for buttons and labels. */
export function ProChip({ tier = 'Pro' }: { tier?: 'Pro' | 'Premium' }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wide">
      <Lock className="w-2.5 h-2.5" /> {tier}
    </span>
  );
}
