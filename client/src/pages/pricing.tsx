import { Link } from 'react-router-dom';
import { Stethoscope, Check, X, ArrowRight, Sparkles } from 'lucide-react';
import { PLANS, FEATURE_MATRIX, formatPrice, type PlanTier } from '@/lib/plans';

/**
 * Public pricing page (₹0 / ₹3,999 / ₹4,999 per counselling season). Razorpay isn't wired yet, so
 * paid CTAs open an email "request upgrade" — an admin grants the plan for now.
 */

const UPGRADE_MAILTO = (plan: string) =>
  `mailto:services@earthlingaidtech.com?subject=${encodeURIComponent(`Upgrade to ${plan} — MedCounsel AI`)}&body=${encodeURIComponent(`Hi, I'd like to upgrade to the ${plan} plan. My account email is: `)}`;

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-600 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />;
  return <span className="text-xs text-slate-600 dark:text-slate-400">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm"><Stethoscope className="w-5 h-5 text-white" /></div>
            <span className="text-lg font-extrabold tracking-tight">MedCounsel AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600">Sign in</Link>
            <Link to="/signup" className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold shadow-sm">Get started</Link>
          </div>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold border border-red-100 dark:border-red-900/40">
            <Sparkles className="w-3.5 h-3.5" /> Simple pricing for one counselling season
          </span>
          <h1 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight">Pick the plan that fits your admission</h1>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Start free. Upgrade any time — one payment covers the whole NEET-UG counselling season, not a recurring bill.</p>
        </div>

        {/* Tier cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((p) => (
            <div key={p.id} className={`relative rounded-2xl border p-6 flex flex-col ${p.highlighted ? 'border-red-300 dark:border-red-800 shadow-xl shadow-red-500/10 ring-1 ring-red-200 dark:ring-red-900/40' : 'border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-900`}>
              {p.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-white text-[11px] font-bold shadow">Most popular</span>
              )}
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="text-sm text-slate-500 mt-1 min-h-[40px]">{p.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold gradient-text">{formatPrice(p.price)}</span>
                {p.price > 0 && <span className="text-sm text-slate-500">/ season</span>}
              </div>
              {p.id === 'free' ? (
                <Link to="/signup" className="mt-6 w-full text-center px-5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-semibold hover:border-red-300 hover:text-red-600 transition-all">{p.cta}</Link>
              ) : (
                <a href={UPGRADE_MAILTO(p.name)} className={`mt-6 w-full text-center px-5 py-3 rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2 ${p.highlighted ? 'gradient-primary text-white shadow-lg shadow-red-500/25 hover:-translate-y-0.5' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'}`}>
                  {p.cta} <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">🔒 Secure online payments (Razorpay) coming soon — for now, request an upgrade and we'll activate your plan.</p>

        {/* Comparison table */}
        <div className="mt-16 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="text-left py-4 pr-4 text-sm font-bold">Compare features</th>
                {PLANS.map((p) => (
                  <th key={p.id} className="py-4 px-3 text-center">
                    <div className="text-sm font-bold">{p.name}</div>
                    <div className="text-xs text-slate-500">{formatPrice(p.price)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {FEATURE_MATRIX.map((row) => (
                <tr key={row.label}>
                  <td className="py-3.5 pr-4 text-sm font-medium text-slate-700 dark:text-slate-300">{row.label}</td>
                  {(['free', 'pro', 'premium'] as PlanTier[]).map((t) => (
                    <td key={t} className="py-3.5 px-3 text-center align-middle">
                      <Cell value={row[t]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div className="mt-14 text-center">
          <p className="text-sm text-slate-500">Questions? <a href="mailto:services@earthlingaidtech.com" className="text-red-600 font-semibold hover:underline">services@earthlingaidtech.com</a></p>
          <Link to="/" className="mt-4 inline-block text-sm text-slate-400 hover:text-red-600">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
