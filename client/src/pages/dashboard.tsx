import { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';
import { CHECKLIST_DOCS } from '@/lib/checklist-data';
import { getRecentAnnouncements } from '@/lib/announcements-data';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/motion';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  BarChart3,
  ClipboardCheck,
  IndianRupee,
  ArrowRight,
  Bell,
  ChevronRight,
  ChevronDown,
  Megaphone,
  Bot,
  Star,
  BookOpen,
  Search,
  Clock,
  FileText,
  TrendingUp,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────

function getChecklistProgress(): { completed: number; total: number } {
  const total = CHECKLIST_DOCS.length;
  try {
    const raw = localStorage.getItem('medcounsel-checklist-state');
    if (raw) {
      const checked = JSON.parse(raw) as string[];
      return { completed: checked.length, total };
    }
  } catch { /* ignore */ }
  return { completed: 0, total };
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  'Allotment': FileText,
  'Counselling': GraduationCap,
  'Public Notice': Megaphone,
  'Seat Matrix': BarChart3,
  'Merit list': TrendingUp,
  'Rank List': TrendingUp,
  'Last rank': TrendingUp,
  'Opening and closing rank': TrendingUp,
};

// One accent color, big icons, one line of text — nothing else.
const FEATURES = [
  { title: 'Colleges', description: 'Browse & compare medical colleges', icon: Star, href: '/colleges', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  { title: 'Closing Ranks', description: 'Check past cutoff ranks', icon: BarChart3, href: '/rank-insights', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40' },
  { title: 'Fees & Seats', description: 'Compare fees and seat counts', icon: IndianRupee, href: '/fee-matrix', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  { title: 'My Documents', description: 'Track documents you need', icon: ClipboardCheck, href: '/doc-checklist', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  { title: 'Counselling Rules', description: 'Eligibility & quota rules explained', icon: BookOpen, href: '/counselling-conditions/eligibility', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
  { title: 'Updates', description: 'Latest counselling notices', icon: Bell, href: '/announcements', color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-950/40' },
  { title: 'Seat Allotment', description: 'State-wise allotment info', icon: GraduationCap, href: '/allotment', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
  { title: 'Ask AI', description: 'Get instant answers to any question', icon: Bot, href: '/ai-assistant', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/40' },
];

const TIMELINE_STEPS = [
  { month: 'May', event: 'NEET UG 2026 Exam', detail: 'Exam conducted by NTA across India', done: true },
  { month: 'Jul', event: 'Result & Scorecard', detail: 'Download from nta.ac.in and check your rank', done: false },
  { month: 'Aug', event: 'MCC Registration Opens', detail: 'Register on mcc.nic.in for AIQ counselling', done: false },
  { month: 'Aug', event: 'State Registration', detail: 'Register on your state counselling portal', done: false },
  { month: 'Sep', event: 'Round 1 Choice Filling', detail: 'Fill college preferences and lock before deadline', done: false },
  { month: 'Sep', event: 'Round 1 Allotment', detail: 'Check result and report to college if allotted', done: false },
  { month: 'Oct', event: 'Round 2 & Upgrades', detail: 'Float/upgrade options, new choice filling window', done: false },
  { month: 'Nov', event: 'Mop-up & Stray Round', detail: 'Final rounds for remaining seats', done: false },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineOpen, setTimelineOpen] = useState(false);

  const recentAnnouncements = useMemo(() => getRecentAnnouncements(4), []);
  const checklist = useMemo(() => getChecklistProgress(), []);
  const checklistPct = checklist.total > 0
    ? Math.round((checklist.completed / checklist.total) * 100)
    : 0;

  const firstName = user?.name?.split(' ')[0] || 'Student';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    const routes: [string[], string][] = [
      [['college', 'review', 'aiims', 'campus'], '/colleges'],
      [['rank', 'cutoff', 'closing', 'score'], '/rank-insights'],
      [['fee', 'cost', 'seat', 'tuition'], '/fee-matrix'],
      [['document', 'checklist', 'certificate'], '/doc-checklist'],
      [['allotment', 'mapping'], '/allotment'],
      [['announce', 'notification', 'update'], '/announcements'],
      [['counsel', 'eligib', 'quota', 'reservation'], '/counselling-conditions/eligibility'],
    ];
    const match = routes.find(([keywords]) => keywords.some((kw) => q.includes(kw)));
    navigate(match ? match[1] : '/ai-assistant');
    setSearchQuery('');
  }, [searchQuery, navigate]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* ═══════════════ HEADER: greeting + search ═══════════════ */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 gradient-primary" />
        <div className="relative z-10 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-white/70 mt-1.5">
            Everything you need for NEET UG 2026 counselling, in one place.
          </p>

          <form onSubmit={handleSearch} className="mt-5 max-w-xl" role="search">
            <div className="flex items-center bg-white rounded-xl shadow-lg overflow-hidden">
              <Search className="w-4.5 h-4.5 text-slate-400 ml-4 shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search colleges, ranks, fees, documents..."
                aria-label="Search MedCounsel AI"
                className="flex-1 bg-transparent text-slate-900 text-sm placeholder:text-slate-400 px-3 py-3.5 outline-none"
              />
              <button
                type="submit"
                className="shrink-0 m-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ═══════════════ DOCUMENT PROGRESS ═══════════════ */}
      <FadeIn delay={0.05}>
        <Link to="/doc-checklist" className="block group">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Your documents: {checklist.completed} of {checklist.total} ready
                  </p>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{checklistPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${checklistPct}%`, backgroundColor: checklistPct === 100 ? '#059669' : '#dc2626' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {checklistPct === 100 ? 'All done! You are ready for counselling.' : 'Tap here to see which documents you still need.'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </FadeIn>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <FadeIn delay={0.1}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          What do you want to do?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map((item) => (
            <Link key={item.href + item.title} to={item.href} className="group block h-full">
              <Card className="h-full hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-4 sm:p-5">
                  <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </FadeIn>

      {/* ═══════════════ LATEST UPDATES ═══════════════ */}
      <FadeIn delay={0.15}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Latest updates</h2>
          <Link to="/announcements" className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
            See all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <Card>
          <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
            {recentAnnouncements.map((a) => {
              const Icon = TYPE_ICONS[a.announcementType] || Bell;
              return (
                <Link
                  key={a.id}
                  to="/announcements"
                  className="flex items-center gap-3 p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.announcementType} · {a.month} {a.day}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </FadeIn>

      {/* ═══════════════ COUNSELLING TIMELINE (collapsible) ═══════════════ */}
      <FadeIn delay={0.2}>
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setTimelineOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
                <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="text-left">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Counselling Timeline 2026</h2>
                <p className="text-xs text-muted-foreground mt-0.5">What happens next, step by step</p>
              </div>
            </div>
            <motion.div animate={{ rotate: timelineOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {timelineOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="border-t border-slate-100 dark:border-slate-800">
                  {TIMELINE_STEPS.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 sm:px-5">
                      <span className="w-9 text-[11px] font-bold text-muted-foreground uppercase pt-0.5 shrink-0">{step.month}</span>
                      <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${step.done ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${step.done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                          {step.event}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        step.done
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                          : 'text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50'
                      }`}>
                        {step.done ? 'Done' : 'Upcoming'}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </FadeIn>
    </div>
  );
}
