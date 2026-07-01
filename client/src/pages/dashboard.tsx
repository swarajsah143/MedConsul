import { useMemo, useState, useCallback, memo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';
import { INSIGHTS_DATA } from '@/lib/insights-data';
import { FEE_MATRIX_DATA } from '@/lib/fee-matrix-data';
import { MOCK_COLLEGES } from '@/lib/college-data';
import { CHECKLIST_DOCS } from '@/lib/checklist-data';
import { getRecentAnnouncements, ANNOUNCEMENTS_DATA } from '@/lib/announcements-data';
import { VIDEOS_DATA } from '@/lib/videos-data';
import { ALL_STATES } from '@/lib/allotment-data';
import { Card, CardContent } from '@/components/ui/card';
import {
  FadeIn,
  SlideIn,
  StaggerContainer,
  StaggerItem,
  CountUp,
  AnimatedProgress,
  CardElevation,
} from '@/components/ui/motion';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  BarChart3,
  ClipboardCheck,
  IndianRupee,
  ArrowRight,
  TrendingUp,
  Building2,
  FileText,
  Sparkles,
  Clock,
  Bell,
  ChevronRight,
  Megaphone,
  PlayCircle,
  ExternalLink,
  Bot,
  Star,
  Shield,
  BookOpen,
  MapPin,
  Search,
  Stethoscope,
  Activity,
  Zap,
  HeartPulse,
  type LucideIcon,
} from 'lucide-react';

// ── Extracted sub-components (prevent re-renders) ─────────

const TickerIcon = memo(function TickerIcon({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] || Bell;
  return (
    <span className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
      <Icon className="w-2.5 h-2.5" />
    </span>
  );
});

function SectionHeader({ icon: Icon, iconBg, iconColor, title, subtitle, action }: {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Trending Carousel (auto-scroll + manual scroll) ───────

const SCROLL_SPEED = 0.6; // px per frame
const RESUME_DELAY = 3000; // ms after user stops scrolling

const TrendingCarousel = memo(function TrendingCarousel({ colleges }: { colleges: typeof MOCK_COLLEGES }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paused = useRef(false);

  const tick = useCallback(() => {
    const el = scrollRef.current;
    if (el && !paused.current) {
      el.scrollLeft += SCROLL_SPEED;
      const half = el.scrollWidth / 2;
      if (el.scrollLeft >= half) el.scrollLeft -= half;
    }
    autoScrollRef.current = requestAnimationFrame(tick);
  }, []);

  // Pause auto-scroll + schedule resume after delay
  const pause = useCallback(() => {
    paused.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => { paused.current = false; }, RESUME_DELAY);
  }, []);

  // Instant resume (mouse left the area)
  const resume = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    paused.current = false;
  }, []);

  useEffect(() => {
    autoScrollRef.current = requestAnimationFrame(tick);
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('wheel', pause, { passive: true });
      el.addEventListener('touchstart', pause, { passive: true });
    }
    return () => {
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (el) {
        el.removeEventListener('wheel', pause);
        el.removeEventListener('touchstart', pause);
      }
    };
  }, [tick, pause]);

  // Duplicate for seamless loop
  const items = useMemo(() => [...colleges, ...colleges], [colleges]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-4 overflow-x-auto scrollbar-hide"
      role="region"
      aria-label="Trending colleges"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={resume}
      onTouchEnd={pause}
    >
      {items.map((college, idx) => (
        <Link key={`${college.id}-${idx}`} to={`/colleges/${college.id}`} className="group w-[260px] sm:w-[280px] shrink-0">
          <Card className="h-full overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-transparent hover:border-blue-200 dark:hover:border-blue-900/40">
            <div className="relative h-36 overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img src={college.thumbnail} alt={college.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute top-2.5 left-2.5">
                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${
                  college.type === 'Government' ? 'bg-emerald-500/20 text-emerald-200' :
                  college.type === 'Deemed' ? 'bg-blue-500/20 text-blue-200' : 'bg-amber-500/20 text-amber-200'
                }`}>{college.type}</span>
              </div>
              <div className="absolute top-2.5 right-2.5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white/90">#{(idx % colleges.length) + 1}</span>
              </div>
              <div className="absolute bottom-2.5 left-2.5 right-2.5">
                <h3 className="text-xs font-bold text-white leading-snug line-clamp-2 drop-shadow">{college.name}</h3>
              </div>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{college.city}</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{college.totalSeats} seats</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
});

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

// Control panel items are built dynamically inside the component (see controlPanelItems memo)

const TYPE_COLORS: Record<string, string> = {
  'Allotment': 'text-blue-600 bg-blue-50 dark:bg-blue-950/20',
  'Counselling': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20',
  'Public Notice': 'text-red-600 bg-red-50 dark:bg-red-950/20',
  'Seat Matrix': 'text-amber-600 bg-amber-50 dark:bg-amber-950/20',
  'Merit list': 'text-purple-600 bg-purple-50 dark:bg-purple-950/20',
  'Rank List': 'text-purple-600 bg-purple-50 dark:bg-purple-950/20',
  'Last rank': 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20',
  'Opening and closing rank': 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20',
};

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

export default function DashboardPage() {
  const { user } = useAuth();

  const recentAnnouncements = useMemo(() => getRecentAnnouncements(5), []);

  const stats = useMemo(() => {
    const checklist = getChecklistProgress();
    return {
      colleges: MOCK_COLLEGES.length,
      rankRecords: INSIGHTS_DATA.length,
      docCategories: CHECKLIST_DOCS.length,
      feeRecords: FEE_MATRIX_DATA.length,
      states: ALL_STATES.length,
      announcements: ANNOUNCEMENTS_DATA.length,
      videos: VIDEOS_DATA.length,
      checklistDone: checklist.completed,
      checklistTotal: checklist.total,
      rankYears: [...new Set(INSIGHTS_DATA.map((e) => e.year))].length,
    };
  }, []);

  const controlPanelItems = useMemo(() => [
    {
      title: 'College Reviews',
      description: 'Explore detailed reviews of top medical colleges across India.',
      icon: Star,
      href: '/colleges',
      gradient: 'from-blue-500 to-blue-600',
      glow: 'rgba(59,130,246,0.12)',
      accent: 'rgba(59,130,246,0.4)',
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      stat: `${stats.colleges} colleges`,
    },
    {
      title: 'Closing Ranks',
      description: 'Analyze historical closing ranks, trends & safe rank ranges.',
      icon: BarChart3,
      href: '/rank-insights',
      gradient: 'from-red-500 to-rose-600',
      glow: 'rgba(220,38,38,0.12)',
      accent: 'rgba(220,38,38,0.4)',
      bg: 'bg-gradient-to-br from-red-50 to-rose-100/50 dark:from-red-950/40 dark:to-rose-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      stat: `${stats.rankYears} years data`,
    },
    {
      title: 'Counselling Conditions',
      description: 'Eligibility, application, domicile & quota rules explained.',
      icon: BookOpen,
      href: '/counselling-conditions/eligibility',
      gradient: 'from-violet-500 to-purple-600',
      glow: 'rgba(139,92,246,0.12)',
      accent: 'rgba(139,92,246,0.4)',
      bg: 'bg-gradient-to-br from-violet-50 to-purple-100/50 dark:from-violet-950/40 dark:to-purple-900/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
      stat: '5 sections',
    },
    {
      title: 'Document Checklist',
      description: 'Track every document needed for counselling & reporting.',
      icon: ClipboardCheck,
      href: '/doc-checklist',
      gradient: 'from-emerald-500 to-green-600',
      glow: 'rgba(16,185,129,0.12)',
      accent: 'rgba(16,185,129,0.4)',
      bg: 'bg-gradient-to-br from-emerald-50 to-green-100/50 dark:from-emerald-950/40 dark:to-green-900/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      stat: `${stats.checklistDone}/${stats.checklistTotal} done`,
    },
    {
      title: 'Fee & Seat Matrix',
      description: 'Compare tuition, hostel fees & seat distribution by quota.',
      icon: IndianRupee,
      href: '/fee-matrix',
      gradient: 'from-amber-500 to-orange-600',
      glow: 'rgba(245,158,11,0.12)',
      accent: 'rgba(245,158,11,0.4)',
      bg: 'bg-gradient-to-br from-amber-50 to-orange-100/50 dark:from-amber-950/40 dark:to-orange-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      stat: `${stats.feeRecords} records`,
    },
    {
      title: 'Announcements',
      description: 'Live counselling notifications, allotments & public notices.',
      icon: Bell,
      href: '/announcements',
      gradient: 'from-pink-500 to-rose-600',
      glow: 'rgba(236,72,153,0.12)',
      accent: 'rgba(236,72,153,0.4)',
      bg: 'bg-gradient-to-br from-pink-50 to-rose-100/50 dark:from-pink-950/40 dark:to-rose-900/20',
      iconColor: 'text-pink-600 dark:text-pink-400',
      stat: `${stats.announcements} updates`,
    },
    {
      title: 'Videos',
      description: 'Expert guidance videos on counselling & college selection.',
      icon: PlayCircle,
      href: '/colleges',
      gradient: 'from-orange-500 to-red-600',
      glow: 'rgba(249,115,22,0.12)',
      accent: 'rgba(249,115,22,0.4)',
      bg: 'bg-gradient-to-br from-orange-50 to-red-100/50 dark:from-orange-950/40 dark:to-red-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      stat: `${stats.videos} videos`,
    },
    {
      title: 'MedAssist AI',
      description: 'Get instant AI-powered answers to any counselling query.',
      icon: Bot,
      href: '/ai-assistant',
      gradient: 'from-cyan-500 to-teal-600',
      glow: 'rgba(6,182,212,0.12)',
      accent: 'rgba(6,182,212,0.4)',
      bg: 'bg-gradient-to-br from-cyan-50 to-teal-100/50 dark:from-cyan-950/40 dark:to-teal-900/20',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      stat: 'Ask anything',
    },
  ], [stats]);

  const firstName = user?.name?.split(' ')[0] || 'Student';
  const checklistPct = stats.checklistTotal > 0
    ? Math.round((stats.checklistDone / stats.checklistTotal) * 100)
    : 0;

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // AI-style welcome message
  const aiMessage = useMemo(() => {
    if (checklistPct === 100) return "All documents ready! You're fully prepared for counselling.";
    if (checklistPct > 50) return `Great progress on your checklist (${checklistPct}%). Keep going!`;
    if (stats.announcements > 90) return `${stats.announcements} counselling updates tracked. Stay ahead of deadlines.`;
    return `${stats.colleges} colleges, ${stats.states} states, and AI guidance — all in one place.`;
  }, [checklistPct, stats]);

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

  // Today's summary stats
  const todaySummary = useMemo(() => {
    const recentCount = ANNOUNCEMENTS_DATA.filter((a) => a.month === 'JUN' || a.month === 'MAY').length;
    return {
      recentUpdates: recentCount,
      docsRemaining: stats.checklistTotal - stats.checklistDone,
      totalSeats: MOCK_COLLEGES.reduce((s, c) => s + c.totalSeats, 0),
    };
  }, [stats]);

  return (
    <div className="space-y-6 pb-12">
      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 gradient-primary" />
        <div className="absolute inset-0 gradient-mesh opacity-50" />

        {/* Floating decorative elements */}
        <div className="absolute top-6 right-8 w-20 h-20 float-slow hidden sm:block">
          <div className="w-full h-full rounded-2xl bg-white/[0.07] backdrop-blur-sm border border-white/10 flex items-center justify-center rotate-12">
            <Stethoscope className="w-8 h-8 text-white/30" />
          </div>
        </div>
        <div className="absolute bottom-8 right-24 w-14 h-14 float-medium hidden lg:block">
          <div className="w-full h-full rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/10 flex items-center justify-center -rotate-6">
            <HeartPulse className="w-6 h-6 text-white/25" />
          </div>
        </div>
        <div className="absolute top-1/2 right-[15%] w-10 h-10 float-fast hidden lg:block">
          <div className="w-full h-full rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center rotate-6">
            <Activity className="w-4 h-4 text-white/20" />
          </div>
        </div>

        {/* Blur orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pulse-glow" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-400/15 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-1/3 left-1/3 w-40 h-40 bg-white/5 rounded-full blur-[60px]" />

        {/* Content */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-10">
          {/* Top row: Badge + AI Quick Action */}
          <div className="flex items-center justify-between mb-6 hero-enter-badge">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/15 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                NEET UG 2026
              </span>
              {todaySummary.recentUpdates > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-medium text-white/70 border border-white/10">
                  <Bell className="w-3 h-3" />
                  {todaySummary.recentUpdates} recent updates
                </span>
              )}
            </div>
            <Link
              to="/ai-assistant"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-semibold border border-white/15 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:shadow-white/5 active:scale-[0.97] group/ai"
            >
              <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
              Ask MedAssist
              <ArrowRight className="w-3 h-3 text-white/50 group-hover/ai:text-white group-hover/ai:translate-x-0.5 transition-all duration-200" />
            </Link>
          </div>

          {/* Greeting */}
          <div className="max-w-2xl space-y-4 hero-enter-title">
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-white tracking-tight leading-[1.1]">
              {greeting}, {firstName}
            </h1>
          </div>

          <div className="max-w-xl hero-enter-desc mt-3">
            <p className="text-sm sm:text-[15px] text-white/70 leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-300/80 shrink-0 mt-0.5" />
              {aiMessage}
            </p>
          </div>

          {/* Search Everything Bar */}
          <form onSubmit={handleSearch} className="mt-6 hero-enter-search" role="search">
            <div className="relative max-w-2xl group/search">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 via-white/10 to-white/20 rounded-2xl opacity-0 group-focus-within/search:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="relative flex items-center bg-white/[0.09] backdrop-blur-xl rounded-xl border border-white/15 hover:border-white/25 focus-within:border-white/30 focus-within:bg-white/[0.12] transition-all duration-300">
                <Search className="w-4.5 h-4.5 text-white/40 ml-4 shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search colleges, ranks, fees, documents, allotments..."
                  aria-label="Search MedCounsel AI"
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 px-3 py-3.5 outline-none"
                />
                <div className="hidden sm:flex items-center gap-1.5 pr-3">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/40 font-mono border border-white/10">
                    Enter
                  </kbd>
                </div>
              </div>
            </div>
          </form>

          {/* Bottom row: Summary chips + Checklist progress */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hero-enter-cards">
            {/* Summary chips */}
            <div className="flex flex-wrap gap-2">
              <Link to="/colleges" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-sm border border-white/10 text-white/80 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 group/chip">
                <Building2 className="w-3.5 h-3.5 text-blue-300 group-hover/chip:scale-110 transition-transform" />
                <span className="font-bold text-white">{stats.colleges}</span> Colleges
              </Link>
              <Link to="/allotment" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-sm border border-white/10 text-white/80 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 group/chip">
                <MapPin className="w-3.5 h-3.5 text-indigo-300 group-hover/chip:scale-110 transition-transform" />
                <span className="font-bold text-white">{stats.states}</span> States
              </Link>
              <Link to="/rank-insights" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-sm border border-white/10 text-white/80 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 group/chip">
                <BarChart3 className="w-3.5 h-3.5 text-rose-300 group-hover/chip:scale-110 transition-transform" />
                <span className="font-bold text-white">{stats.rankRecords}</span> Rank Records
              </Link>
              {todaySummary.docsRemaining > 0 && (
                <Link to="/doc-checklist" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 backdrop-blur-sm border border-amber-400/20 text-amber-200 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5">
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span className="font-bold text-amber-100">{todaySummary.docsRemaining}</span> docs remaining
                </Link>
              )}
            </div>

            {/* Mini progress ring */}
            <Link to="/doc-checklist" className="flex items-center gap-3 bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10 transition-all duration-300 hover:-translate-y-0.5 group/prog shrink-0">
              <div className="relative w-10 h-10 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                  <circle
                    cx="18" cy="18" r="14" fill="none"
                    stroke={checklistPct === 100 ? '#34d399' : 'white'}
                    strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray={`${checklistPct * 0.88} 88`}
                    className="transition-all duration-700"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{checklistPct}%</span>
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className="text-[11px] font-semibold text-white/90">Readiness</p>
                <p className="text-[10px] text-white/50">{stats.checklistDone}/{stats.checklistTotal} docs</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover/prog:text-white/60 group-hover/prog:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════════ LIVE ANNOUNCEMENT TICKER ═══════════════ */}
      <div className="widget-enter overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" role="marquee" aria-label="Live announcements" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center">
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border-r border-slate-200 dark:border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Live</span>
          </div>
          <div className="flex-1 overflow-hidden py-2.5">
            <div className="ticker-scroll flex gap-8 whitespace-nowrap" style={{ '--ticker-duration': '40s' } as React.CSSProperties}>
              {[...recentAnnouncements, ...recentAnnouncements].map((a, i) => (
                <Link key={`${a.id}-${i}`} to="/announcements" className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  <TickerIcon type={a.announcementType} />
                  <span className="font-medium">{a.title}</span>
                  <span className="text-slate-400 dark:text-slate-600">·</span>
                  <span className="text-slate-400 dark:text-slate-500 text-[10px]">{a.month} {a.day}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ ANIMATED STATISTICS ═══════════════ */}
      <FadeIn delay={0.05}>
        <Card className="overflow-hidden border-slate-200/60 dark:border-slate-800/60">
          <CardContent className="p-0">
            <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-slate-100 dark:divide-slate-800">
              {[
                { label: 'Colleges', value: stats.colleges, icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', href: '/colleges' },
                { label: 'Rank Records', value: stats.rankRecords, icon: BarChart3, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40', href: '/rank-insights' },
                { label: 'States', value: stats.states, icon: MapPin, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40', href: '/allotment' },
                { label: 'Documents', value: stats.docCategories, icon: ClipboardCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', href: '/doc-checklist' },
                { label: 'Fee Records', value: stats.feeRecords, icon: IndianRupee, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', href: '/fee-matrix' },
                { label: 'Videos', value: stats.videos, icon: PlayCircle, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40', href: '/colleges' },
              ].map((stat) => (
                <Link
                  key={stat.label}
                  to={stat.href}
                  className="group flex items-center gap-3 px-4 py-4 sm:py-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-200"
                >
                  <motion.div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}
                    whileHover={{ scale: 1.12, rotate: 3 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <stat.icon className={`w-[18px] h-[18px] ${stat.color}`} />
                  </motion.div>
                  <div className="min-w-0">
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-none tabular-nums">
                      <CountUp to={stat.value} duration={1} />
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">{stat.label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* ═══════════════ MAIN WIDGET GRID ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT COLUMN (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Control Panel ── */}
          <FadeIn delay={0.1}>
            <SectionHeader
              icon={Shield}
              iconBg="bg-red-50 dark:bg-red-950/30"
              iconColor="text-red-600 dark:text-red-400"
              title="Your Control Panel"
              subtitle={`${controlPanelItems.length} modules`}
            />
            <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-3" delay={0.1}>
              {controlPanelItems.map((item) => (
                <StaggerItem key={item.href + item.title}>
                  <Link to={item.href} className="group block h-full">
                    <CardElevation lift={-5} className="h-full">
                      <Card
                        className="h-full rounded-xl overflow-hidden relative border-slate-200/60 dark:border-slate-800/60 hover:border-transparent hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-900"
                        style={{ '--card-glow': item.glow, '--card-accent': item.accent } as React.CSSProperties}
                      >
                        {/* Top gradient line */}
                        <div className={`h-[3px] bg-gradient-to-r ${item.gradient}`} />

                        <CardContent className="p-4 relative flex flex-col items-center text-center">
                          {/* Icon */}
                          <motion.div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.bg} shadow-sm mt-1`}
                            whileHover={{ y: -2, scale: 1.1 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                          >
                            <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                          </motion.div>

                          {/* Title */}
                          <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 mt-3 leading-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            {item.title}
                          </h3>

                          {/* Description */}
                          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>

                          {/* Stat badge */}
                          <div className="mt-3 w-full pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${item.iconColor}`}>
                              {item.stat}
                            </span>
                          </div>

                          {/* Hover arrow */}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300">
                            <ArrowRight className={`w-3.5 h-3.5 ${item.iconColor}`} />
                          </div>
                        </CardContent>
                      </Card>
                    </CardElevation>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </FadeIn>

          {/* Live Announcements Feed */}
          <FadeIn delay={0.2}>
            <SectionHeader icon={Megaphone} iconBg="bg-purple-50 dark:bg-purple-950/30" iconColor="text-purple-600 dark:text-purple-400" title="Latest Updates"
              action={<Link to="/announcements" className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 transition-colors">View All <ArrowRight className="w-3 h-3" /></Link>}
            />
            <Card className="overflow-hidden">
              <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
                {recentAnnouncements.map((a) => {
                  const Icon = TYPE_ICONS[a.announcementType] || Bell;
                  const color = TYPE_COLORS[a.announcementType] || 'text-slate-600 bg-slate-50 dark:bg-slate-800';
                  return (
                    <Link key={a.id} to="/announcements" className="flex gap-3.5 p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group/item">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${color} transition-transform duration-200 group-hover/item:scale-110`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug group-hover/item:text-red-600 dark:group-hover/item:text-red-400 transition-colors">{a.title}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{a.announcementType}</span>
                          {a.state && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">{a.state}</span>
                          )}
                          {a.documentUrl && (
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-medium flex items-center gap-0.5">
                              PDF <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-full self-start mt-0.5 shrink-0">
                        <Clock className="w-3 h-3" /> {a.month} {a.day}
                      </span>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* ── RIGHT COLUMN (1/3) ── */}
        <div className="space-y-6">

          {/* Counselling Progress Widget */}
          <FadeIn delay={0.15}>
            <SectionHeader icon={Activity} iconBg="bg-emerald-50 dark:bg-emerald-950/30" iconColor="text-emerald-600 dark:text-emerald-400" title="Your Progress" />
            <Card className="overflow-hidden">
              <CardContent className="p-5 space-y-5">
                <div className="flex items-center gap-5">
                  <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-100 dark:text-slate-800" />
                      <motion.circle cx="18" cy="18" r="15" fill="none" strokeWidth="2" strokeLinecap="round"
                        stroke={checklistPct === 100 ? '#059669' : checklistPct > 50 ? '#2563eb' : '#dc2626'}
                        initial={{ strokeDasharray: '0 94.2' }}
                        animate={{ strokeDasharray: `${checklistPct * 0.942} 94.2` }}
                        transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-none">
                        <CountUp to={checklistPct} duration={1} suffix="%" />
                      </span>
                      <span className="text-[8px] text-muted-foreground font-semibold uppercase mt-0.5">Ready</span>
                    </span>
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Documents</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{stats.checklistDone}/{stats.checklistTotal}</span>
                    </div>
                    <AnimatedProgress value={checklistPct} color={checklistPct === 100 ? 'bg-emerald-500' : 'bg-red-500'} />
                    <Link to="/doc-checklist" className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 mt-1">
                      {checklistPct === 100 ? 'All done!' : 'Complete checklist'} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {[
                    { label: 'Colleges\nExplored', value: stats.colleges },
                    { label: 'States\nCovered', value: stats.states },
                    { label: 'Docs\nReady', value: stats.checklistDone },
                  ].map((m) => (
                    <div key={m.label} className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                        <CountUp to={typeof m.value === 'number' ? m.value : 0} duration={0.8} />
                      </p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5 whitespace-pre-line leading-tight">{m.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* AI Recommendations Widget */}
          <FadeIn delay={0.25}>
            <SectionHeader icon={Bot} iconBg="bg-cyan-50 dark:bg-cyan-950/30" iconColor="text-cyan-600 dark:text-cyan-400" title="AI Suggests" />
            <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50">
              <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { text: checklistPct < 100 ? 'Complete your document checklist before counselling begins' : 'Review closing rank trends for your target colleges', icon: checklistPct < 100 ? ClipboardCheck : TrendingUp, href: checklistPct < 100 ? '/doc-checklist' : '/rank-insights', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                  { text: 'Compare fees across government and private colleges', icon: IndianRupee, href: '/fee-matrix', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                  { text: `Search allotments across ${stats.states} states by your rank`, icon: MapPin, href: '/allotment', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
                  { text: 'Ask MedAssist about counselling process and strategy', icon: Sparkles, href: '/ai-assistant', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
                ].map((rec, idx) => (
                  <Link key={idx} to={rec.href} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group/rec">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${rec.bg} transition-transform duration-200 group-hover/rec:scale-110`}>
                      <rec.icon className={`w-4 h-4 ${rec.color}`} />
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex-1 group-hover/rec:text-slate-900 dark:group-hover/rec:text-slate-100 transition-colors">{rec.text}</p>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 group-hover/rec:text-red-500 group-hover/rec:translate-x-0.5 transition-all duration-200" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </FadeIn>

          {/* Upcoming Events Widget */}
          <FadeIn delay={0.3}>
            <SectionHeader icon={Clock} iconBg="bg-amber-50 dark:bg-amber-950/30" iconColor="text-amber-600 dark:text-amber-400" title="Upcoming" />
            <Card>
              <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { date: 'Jul 2026', event: 'NEET UG 2026 Result Expected', status: 'upcoming', color: 'bg-red-500' },
                  { date: 'Aug 2026', event: 'MCC AIQ Registration Opens', status: 'upcoming', color: 'bg-blue-500' },
                  { date: 'Aug 2026', event: 'State Counselling Registration', status: 'upcoming', color: 'bg-emerald-500' },
                  { date: 'Sep 2026', event: 'AIQ Round 1 Choice Filling', status: 'upcoming', color: 'bg-purple-500' },
                  { date: 'Oct 2026', event: 'Round 1 Seat Allotment', status: 'upcoming', color: 'bg-amber-500' },
                ].map((evt, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3.5 group/evt hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="text-center shrink-0 w-12">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{evt.date.split(' ')[0]}</p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{evt.date.split(' ')[1]}</p>
                    </div>
                    <div className={`w-1 h-8 rounded-full ${evt.color} shrink-0`} />
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium flex-1 leading-snug">{evt.event}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </FadeIn>

        </div>
      </div>

      {/* ═══════════════ TRENDING COLLEGES CAROUSEL ═══════════════ */}
      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Trending Colleges</h2>
              <p className="text-[10px] text-muted-foreground">Most searched this week</p>
            </div>
          </div>
          <Link to="/colleges" className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
            See all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <TrendingCarousel colleges={MOCK_COLLEGES.slice(0, 10)} />
      </FadeIn>

      {/* ═══════════════ COUNSELLING TIMELINE ═══════════════ */}
      <FadeIn delay={0.1}>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
            <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Counselling Timeline 2026</h2>
            <p className="text-[10px] text-muted-foreground">Key milestones for your journey</p>
          </div>
        </div>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[39px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
              {[
                { month: 'May', event: 'NEET UG 2026 Exam', detail: 'Pen-and-paper exam conducted by NTA across India', done: true, color: 'bg-emerald-500' },
                { month: 'Jul', event: 'Result & Scorecard', detail: 'Download from nta.ac.in. Calculate expected rank', done: false, color: 'bg-red-500' },
                { month: 'Aug', event: 'MCC Registration Opens', detail: 'Register on mcc.nic.in for AIQ counselling', done: false, color: 'bg-blue-500' },
                { month: 'Aug', event: 'State Registration', detail: 'Register separately on your state counselling portal', done: false, color: 'bg-emerald-500' },
                { month: 'Sep', event: 'Round 1 Choice Filling', detail: 'Fill college preferences. Lock before deadline', done: false, color: 'bg-purple-500' },
                { month: 'Sep', event: 'Round 1 Allotment', detail: 'Check result. Report to college if allotted', done: false, color: 'bg-amber-500' },
                { month: 'Oct', event: 'Round 2 & Upgrades', detail: 'Float/upgrade options. New choice filling window', done: false, color: 'bg-indigo-500' },
                { month: 'Nov', event: 'Mop-up & Stray Round', detail: 'Final rounds for remaining seats', done: false, color: 'bg-pink-500' },
              ].map((step, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 pl-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors relative group/step">
                  {/* Month */}
                  <div className="w-8 text-center shrink-0 pt-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{step.month}</span>
                  </div>
                  {/* Dot on timeline */}
                  <div className="relative shrink-0 pt-1">
                    <div className={`w-3 h-3 rounded-full ${step.done ? step.color : 'bg-slate-300 dark:bg-slate-600'} ring-2 ring-white dark:ring-slate-900 z-10 relative transition-transform duration-300 group-hover/step:scale-125`} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-2">
                    <p className={`text-sm font-bold leading-snug ${step.done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                      {step.event}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</p>
                  </div>
                  {step.done && (
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full shrink-0 mt-1">Done</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
