import { useEffect, useState } from 'react';
import { HeroBanner } from '@/components/ui/hero-banner';
import { Link } from 'react-router-dom';
import {
  Stethoscope, ArrowRight, Target, BarChart3, IndianRupee, GraduationCap,
  ClipboardCheck, MapPin, Bot, ShieldCheck, Sparkles, Menu, X, Check,
} from 'lucide-react';

/**
 * Public marketing home page (the app used to open straight at /login). Self-contained and
 * mobile-first — it must be fast on Indian mobile data. All numbers are read from the live API,
 * never invented (see the stats strip). CTAs route to signup/login.
 */

const FEATURES = [
  { icon: Target, title: 'Rank Predictor', body: 'Enter your NEET score or rank and see the colleges you can realistically target — matched against real closing ranks.', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { icon: BarChart3, title: 'Closing Rank Insights', body: 'Year-over-year cutoffs across 900+ colleges, by category, quota and round. Find your safe range.', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { icon: IndianRupee, title: 'Fee & Seat Matrix', body: 'Compare tuition, hostel and total first-year fees with seat counts across government, management and NRI quotas.', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { icon: GraduationCap, title: 'College Reviews', body: 'Detailed profiles — faculty, infrastructure, hospital exposure, hostel and student life — to build a real shortlist.', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { icon: MapPin, title: 'Seat Allotments', body: 'Search real MCC & state counselling allotments by rank to see where students like you actually got seats.', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  { icon: ClipboardCheck, title: 'Document Checklist', body: 'Track every counselling document with upload, verification status and progress — nothing missed on reporting day.', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
];

const STEPS = [
  { n: '1', title: 'Create your free account', body: 'Sign up in seconds — no payment needed to start.' },
  { n: '2', title: 'Add your NEET rank & category', body: 'Tell us your score/rank, category and domicile state.' },
  { n: '3', title: 'Get a realistic shortlist', body: 'See safe/reach colleges, fees, cutoffs and allotment history in one place.' },
];

/** Live figures from the API — an honest blank beats an invented number on the page a student trusts with their Aadhaar. */
function useLiveStats() {
  const [stats, setStats] = useState<{ label: string; value: string }[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const count = async (c: string) => {
      try { const r = await fetch(`/api/data/${c}`); const b = await r.json(); return b?.success ? (b.data.total as number) : null; }
      catch { return null; }
    };
    Promise.all([count('colleges'), count('closingRanks'), count('universities')]).then(([colleges, ranks, unis]) => {
      if (cancelled) return;
      const fmt = (n: number) => n.toLocaleString('en-IN');
      const rows: { label: string; value: string }[] = [];
      if (colleges) rows.push({ label: 'Medical colleges', value: `${fmt(colleges)}` });
      if (ranks) rows.push({ label: 'Cutoff records', value: `${fmt(ranks)}` });
      if (unis) rows.push({ label: 'Universities', value: `${fmt(unis)}` });
      rows.push({ label: 'Cost to start', value: '₹0' });
      setStats(rows);
    });
    return () => { cancelled = true; };
  }, []);
  return stats;
}

export default function LandingPage() {
  const stats = useLiveStats();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">MedCounsel AI</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link to="/pricing" className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors">Pricing</Link>
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors">Sign in</Link>
            <Link to="/signup" className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all">Get started</Link>
          </div>
          <button className="sm:hidden p-2" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>
        {menuOpen && (
          <div className="sm:hidden border-t border-slate-100 dark:border-slate-800 px-4 py-3 flex flex-col gap-2">
            <Link to="/pricing" className="py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Pricing</Link>
            <Link to="/login" className="py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Sign in</Link>
            <Link to="/signup" className="py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold text-center">Get started</Link>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute top-40 -left-24 w-96 h-96 bg-green-400/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-14 sm:pt-24 sm:pb-20 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-100 dark:border-emerald-900/40">
            <Sparkles className="w-3.5 h-3.5" /> NEET UG 2026 Counselling
          </span>
          <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Plan your NEET-UG counselling with
            <span className="gradient-text"> real cutoff data</span>, not guesswork.
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Predict your rank, compare fees, explore college reviews, and track your documents — everything you need for AIQ &amp; state counselling, in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup" className="w-full sm:w-auto px-7 py-3.5 rounded-xl gradient-primary text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all inline-flex items-center justify-center gap-2">
              Create free account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="w-full sm:w-auto px-7 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-semibold hover:border-emerald-300 hover:text-emerald-600 transition-all">
              Sign in
            </Link>
          </div>

          {/* Live stats strip */}
          {stats && (
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <p className="text-2xl font-extrabold gradient-text">{s.value}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Everything for your counselling, in one app</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">Built on real, sourced data from NMC, MCC and state counselling portals.</p>
        </div>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-slate-100 dark:border-slate-800 p-6 hover:shadow-lg hover:-translate-y-1 transition-all bg-white dark:bg-slate-900">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${f.bg} transition-transform group-hover:scale-110`}>
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="mt-4 font-bold text-lg">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center">How it works</h2>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 rounded-2xl gradient-primary text-white font-extrabold text-lg flex items-center justify-center mx-auto shadow-md shadow-emerald-500/25">{s.n}</div>
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/signup" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl gradient-primary text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Coverage / trust ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Built for every NEET aspirant</h2>
          <ul className="mt-6 space-y-3">
            {['All India Quota (MCC) + state counselling', 'MBBS, BDS & AYUSH streams', 'Government, deemed, private & NRI seats', 'General, OBC, SC, ST & EWS categories'].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5 text-emerald-600" /></span>
                <span className="text-slate-700 dark:text-slate-300">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-emerald-600" /></div>
            <div>
              <h3 className="font-bold">Your data stays private</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Documents you upload are visible only to you and your counsellor.</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 p-4">
            <Bot className="w-6 h-6 text-cyan-600 shrink-0" />
            <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold">Ask MedAssist</span> — get instant answers on eligibility, quotas and documents.</p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <HeroBanner contentClassName="p-10 sm:p-14 text-center text-white">
          <h2 className="relative text-2xl sm:text-3xl font-extrabold tracking-tight">Ready to plan your admission?</h2>
          <p className="relative mt-3 text-emerald-100/90 max-w-xl mx-auto">Join free and turn your NEET rank into a confident college shortlist.</p>
          <Link to="/signup" className="relative mt-7 inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-emerald-600 font-bold shadow-lg hover:-translate-y-0.5 transition-all">
            Create free account <ArrowRight className="w-4 h-4" />
          </Link>
        </HeroBanner>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center"><Stethoscope className="w-4 h-4 text-white" /></div>
            <span className="font-bold">MedCounsel AI</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <Link to="/pricing" className="hover:text-emerald-600">Pricing</Link>
            <Link to="/privacy" className="hover:text-emerald-600">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-emerald-600">Terms</Link>
            <a href="mailto:services@earthlingaidtech.com" className="hover:text-emerald-600">Contact</a>
            <Link to="/login" className="hover:text-emerald-600">Sign in</Link>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 pb-8 px-4">
          © 2026 MedCounsel AI · Run by Earthling Aid Tech · Estimates based on previous years' data — confirm against official counselling portals.
        </p>
      </footer>
    </div>
  );
}
