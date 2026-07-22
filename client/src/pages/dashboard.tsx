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
  StaggerContainer,
  StaggerItem,
  CountUp,
} from '@/components/ui/motion';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronDown,
  Megaphone,
  PlayCircle,
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
  'Public Notice': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20',
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
      iconBg: 'bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/20',
      iconText: 'text-blue-400',
      hoverTitle: 'group-hover:text-blue-300',
      statColor: 'text-blue-400/80',
      arrowBg: 'bg-blue-500/10 border-blue-500/20',
      glowBg: 'from-blue-500/5 via-transparent to-blue-500/5',
      glowShadow: '0 20px 40px -12px rgba(59,130,246,0.15)',
      stat: `${stats.colleges} colleges`,
    },
    {
      title: 'Closing Ranks',
      description: 'Analyze historical closing ranks, trends & safe rank ranges.',
      icon: BarChart3,
      href: '/rank-insights',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20',
      iconText: 'text-emerald-400',
      hoverTitle: 'group-hover:text-emerald-300',
      statColor: 'text-emerald-400/80',
      arrowBg: 'bg-emerald-500/10 border-emerald-500/20',
      glowBg: 'from-emerald-500/5 via-transparent to-emerald-500/5',
      glowShadow: '0 20px 40px -12px rgba(239,68,68,0.15)',
      stat: `${stats.rankYears} years data`,
    },
    {
      title: 'Counselling Conditions',
      description: 'Eligibility, application, domicile & quota rules explained.',
      icon: BookOpen,
      href: '/counselling-conditions/eligibility',
      iconBg: 'bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500/20',
      iconText: 'text-purple-400',
      hoverTitle: 'group-hover:text-purple-300',
      statColor: 'text-purple-400/80',
      arrowBg: 'bg-purple-500/10 border-purple-500/20',
      glowBg: 'from-purple-500/5 via-transparent to-purple-500/5',
      glowShadow: '0 20px 40px -12px rgba(168,85,247,0.15)',
      stat: '5 sections',
    },
    {
      title: 'Document Checklist',
      description: 'Track every document needed for counselling & reporting.',
      icon: ClipboardCheck,
      href: '/doc-checklist',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20',
      iconText: 'text-emerald-400',
      hoverTitle: 'group-hover:text-emerald-300',
      statColor: 'text-emerald-400/80',
      arrowBg: 'bg-emerald-500/10 border-emerald-500/20',
      glowBg: 'from-emerald-500/5 via-transparent to-emerald-500/5',
      glowShadow: '0 20px 40px -12px rgba(16,185,129,0.15)',
      stat: `${stats.checklistDone}/${stats.checklistTotal} done`,
    },
    {
      title: 'Fee & Seat Matrix',
      description: 'Compare tuition, hostel fees & seat distribution by quota.',
      icon: IndianRupee,
      href: '/fee-matrix',
      iconBg: 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/20',
      iconText: 'text-amber-400',
      hoverTitle: 'group-hover:text-amber-300',
      statColor: 'text-amber-400/80',
      arrowBg: 'bg-amber-500/10 border-amber-500/20',
      glowBg: 'from-amber-500/5 via-transparent to-amber-500/5',
      glowShadow: '0 20px 40px -12px rgba(245,158,11,0.15)',
      stat: `${stats.feeRecords} records`,
    },
    {
      title: 'Announcements',
      description: 'Live counselling notifications, allotments & public notices.',
      icon: Bell,
      href: '/announcements',
      iconBg: 'bg-pink-500/10 border-pink-500/20 group-hover:bg-pink-500/20',
      iconText: 'text-pink-400',
      hoverTitle: 'group-hover:text-pink-300',
      statColor: 'text-pink-400/80',
      arrowBg: 'bg-pink-500/10 border-pink-500/20',
      glowBg: 'from-pink-500/5 via-transparent to-pink-500/5',
      glowShadow: '0 20px 40px -12px rgba(236,72,153,0.15)',
      stat: `${stats.announcements} updates`,
    },
    {
      title: 'Videos',
      description: 'Expert guidance videos on counselling & college selection.',
      icon: PlayCircle,
      href: '/colleges',
      iconBg: 'bg-orange-500/10 border-orange-500/20 group-hover:bg-orange-500/20',
      iconText: 'text-orange-400',
      hoverTitle: 'group-hover:text-orange-300',
      statColor: 'text-orange-400/80',
      arrowBg: 'bg-orange-500/10 border-orange-500/20',
      glowBg: 'from-orange-500/5 via-transparent to-orange-500/5',
      glowShadow: '0 20px 40px -12px rgba(249,115,22,0.15)',
      stat: `${stats.videos} videos`,
    },
    {
      title: 'MedAssist AI',
      description: 'Get instant AI-powered answers to any counselling query.',
      icon: Bot,
      href: '/ai-assistant',
      iconBg: 'bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/20',
      iconText: 'text-cyan-400',
      hoverTitle: 'group-hover:text-cyan-300',
      statColor: 'text-cyan-400/80',
      arrowBg: 'bg-cyan-500/10 border-cyan-500/20',
      glowBg: 'from-cyan-500/5 via-transparent to-cyan-500/5',
      glowShadow: '0 20px 40px -12px rgba(6,182,212,0.15)',
      stat: 'Ask anything',
    },
  ], [stats]);

  const firstName = user?.name?.split(' ')[0] || 'Student';
  const checklistPct = stats.checklistTotal > 0
    ? Math.round((stats.checklistDone / stats.checklistTotal) * 100)
    : 0;

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineOpen, setTimelineOpen] = useState(false);

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

        {/* Floating decorative elements — positioned to avoid the progress card area */}
        <div className="absolute top-6 left-[60%] w-16 h-16 float-slow hidden md:block">
          <div className="w-full h-full rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10 flex items-center justify-center rotate-12">
            <Stethoscope className="w-6 h-6 text-white/20" />
          </div>
        </div>
        <div className="absolute bottom-12 left-[55%] w-12 h-12 float-medium hidden lg:block">
          <div className="w-full h-full rounded-xl bg-white/[0.05] backdrop-blur-sm border border-white/10 flex items-center justify-center -rotate-6">
            <HeartPulse className="w-5 h-5 text-white/15" />
          </div>
        </div>

        {/* Blur orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pulse-glow" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-400/15 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
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

          {/* Bottom row: Summary chips */}
          <div className="mt-6 flex flex-wrap gap-2 hero-enter-cards">
            <Link to="/colleges" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-sm border border-white/10 text-white/80 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 group/chip">
              <Building2 className="w-3.5 h-3.5 text-blue-300 group-hover/chip:scale-110 transition-transform" />
              <span className="font-bold text-white">{stats.colleges}</span> Colleges
            </Link>
            <Link to="/allotment" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-sm border border-white/10 text-white/80 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 group/chip">
              <MapPin className="w-3.5 h-3.5 text-indigo-300 group-hover/chip:scale-110 transition-transform" />
              <span className="font-bold text-white">{stats.states}</span> States
            </Link>
            <Link to="/rank-insights" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-sm border border-white/10 text-white/80 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 group/chip">
              <BarChart3 className="w-3.5 h-3.5 text-green-300 group-hover/chip:scale-110 transition-transform" />
              <span className="font-bold text-white">{stats.rankRecords}</span> Rank Records
            </Link>
            {todaySummary.docsRemaining > 0 && (
              <Link to="/doc-checklist" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 backdrop-blur-sm border border-amber-400/20 text-amber-200 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5">
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span className="font-bold text-amber-100">{todaySummary.docsRemaining}</span> docs remaining
              </Link>
            )}
          </div>
        </div>

        {/* ── Your Progress Card (right-middle, solid white) ── */}
        <div className="absolute right-5 sm:right-8 lg:right-10 top-0 bottom-0 hidden md:flex items-center z-10 hero-enter-cards">
          <Link to="/doc-checklist" className="group/prog block">
            <motion.div
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-black/20 p-5 w-[220px]"
              whileHover={{ y: -4, scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Your Progress</span>
              </div>

              {/* Ring + Info */}
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-100 dark:text-slate-800" />
                    <motion.circle cx="18" cy="18" r="14" fill="none" strokeWidth="2.5" strokeLinecap="round"
                      stroke={checklistPct === 100 ? '#059669' : '#059669'}
                      initial={{ strokeDasharray: '0 88' }}
                      animate={{ strokeDasharray: `${checklistPct * 0.88} 88` }}
                      transition={{ duration: 1.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-none tabular-nums">{checklistPct}%</span>
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Readiness</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{stats.checklistDone}/{stats.checklistTotal} docs</p>
                  <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1.5">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: checklistPct === 100 ? '#059669' : '#059669' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${checklistPct}%` }}
                      transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              </div>

              {/* Milestones */}
              <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {[
                  { label: 'Colleges', val: stats.colleges },
                  { label: 'States', val: stats.states },
                  { label: 'Docs', val: stats.checklistDone },
                ].map((m) => (
                  <div key={m.label} className="text-center py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{m.val}</p>
                    <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-2.5 flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 group-hover/prog:gap-1.5 transition-all">
                {checklistPct === 100 ? 'All prepared' : 'Complete checklist'}
                <ChevronRight className="w-3 h-3 group-hover/prog:translate-x-0.5 transition-transform" />
              </div>
            </motion.div>
          </Link>
        </div>
      </div>

      {/* ═══════════════ LIVE ANNOUNCEMENT TICKER ═══════════════ */}
      <div className="widget-enter overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" role="marquee" aria-label="Live announcements" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center">
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border-r border-slate-200 dark:border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
          </div>
          <div className="flex-1 overflow-hidden py-2.5">
            <div className="ticker-scroll flex gap-8 whitespace-nowrap" style={{ '--ticker-duration': '40s' } as React.CSSProperties}>
              {[...recentAnnouncements, ...recentAnnouncements].map((a, i) => (
                <Link key={`${a.id}-${i}`} to="/announcements" className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
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
                { label: 'Rank Records', value: stats.rankRecords, icon: BarChart3, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', href: '/rank-insights' },
                { label: 'States', value: stats.states, icon: MapPin, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40', href: '/allotment' },
                { label: 'Documents', value: stats.docCategories, icon: ClipboardCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', href: '/doc-checklist' },
                { label: 'Fee Records', value: stats.feeRecords, icon: IndianRupee, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', href: '/fee-matrix' },
                { label: 'Videos', value: stats.videos, icon: PlayCircle, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40', href: '/colleges' },
              ].map((stat) => (
                <Link
                  key={stat.label}
                  to={stat.href}
                  className="group flex items-center justify-center gap-3 px-4 pt-6 pb-4 sm:pt-8 sm:pb-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-200"
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

      {/* ═══════════════ CONTROL PANEL (full width) ═══════════════ */}
      <FadeIn delay={0.1}>
        <SectionHeader
          icon={Shield}
          iconBg="bg-emerald-50 dark:bg-emerald-950/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
          title="Your Control Panel"
          subtitle={`${controlPanelItems.length} modules`}
        />
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-3" delay={0.1}>
          {controlPanelItems.map((item) => (
            <StaggerItem key={item.href + item.title}>
              <Link to={item.href} className="group block h-full">
                <div
                  className="h-full rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 dark:border-slate-700/50 overflow-hidden hover:-translate-y-1 transition-all duration-300 relative"
                  style={{ boxShadow: '0 0 0 0 transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = item.glowShadow; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 0 0 transparent'; }}
                >
                  {/* Hover glow overlay */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.glowBg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                  <div className="p-4 sm:p-5 relative flex flex-col items-center text-center h-full">
                    {/* Icon */}
                    <motion.div
                      className={`w-11 h-11 rounded-xl ${item.iconBg} border flex items-center justify-center shrink-0 transition-all duration-300`}
                      whileHover={{ y: -3, scale: 1.12, rotate: 3 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    >
                      <item.icon className={`w-5 h-5 ${item.iconText}`} />
                    </motion.div>

                    {/* Title */}
                    <h3 className={`text-[13px] font-bold text-white mt-3 leading-tight ${item.hoverTitle} transition-colors duration-200`}>
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2 flex-1">
                      {item.description}
                    </p>

                    {/* Stat + Arrow */}
                    <div className="mt-3 w-full pt-2.5 border-t border-slate-800 flex items-center justify-between">
                      <span className={`text-[10px] font-bold ${item.statColor} tabular-nums`}>
                        {item.stat}
                      </span>
                      <div className={`w-6 h-6 rounded-full ${item.arrowBg} border flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300`}>
                        <ArrowRight className={`w-3 h-3 ${item.iconText}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </FadeIn>

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
          <Link to="/colleges" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
            See all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <TrendingCarousel colleges={MOCK_COLLEGES.slice(0, 10)} />
      </FadeIn>

      {/* ═══════════════ COUNSELLING TIMELINE (Dropdown) ═══════════════ */}
      <FadeIn delay={0.1}>
        <Card className="overflow-hidden border-slate-200/60 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => setTimelineOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Counselling Timeline 2026</h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Key milestones for your journey</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-2.5 py-1 rounded-full">
                1/8 completed
              </span>
              <motion.div
                animate={{ rotate: timelineOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </motion.div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {timelineOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="border-t border-slate-100 dark:border-slate-800">
                  <CardContent className="p-0">
                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute left-[39px] top-0 bottom-0 w-px bg-gradient-to-b from-emerald-300 via-slate-200 to-slate-200 dark:from-emerald-700 dark:via-slate-800 dark:to-slate-800" />
                      {[
                        { month: 'May', event: 'NEET UG 2026 Exam', detail: 'Pen-and-paper exam conducted by NTA across India', done: true, color: 'bg-emerald-500', gradient: 'from-emerald-500 to-green-500' },
                        { month: 'Jul', event: 'Result & Scorecard', detail: 'Download from nta.ac.in. Calculate expected rank', done: false, color: 'bg-emerald-500', gradient: 'from-emerald-500 to-green-500' },
                        { month: 'Aug', event: 'MCC Registration Opens', detail: 'Register on mcc.nic.in for AIQ counselling', done: false, color: 'bg-blue-500', gradient: 'from-blue-500 to-indigo-500' },
                        { month: 'Aug', event: 'State Registration', detail: 'Register separately on your state counselling portal', done: false, color: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-500' },
                        { month: 'Sep', event: 'Round 1 Choice Filling', detail: 'Fill college preferences. Lock before deadline', done: false, color: 'bg-purple-500', gradient: 'from-purple-500 to-violet-500' },
                        { month: 'Sep', event: 'Round 1 Allotment', detail: 'Check result. Report to college if allotted', done: false, color: 'bg-amber-500', gradient: 'from-amber-500 to-orange-500' },
                        { month: 'Oct', event: 'Round 2 & Upgrades', detail: 'Float/upgrade options. New choice filling window', done: false, color: 'bg-indigo-500', gradient: 'from-indigo-500 to-blue-500' },
                        { month: 'Nov', event: 'Mop-up & Stray Round', detail: 'Final rounds for remaining seats', done: false, color: 'bg-pink-500', gradient: 'from-pink-500 to-green-500' },
                      ].map((step, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05, duration: 0.3 }}
                          className="flex items-start gap-4 p-4 pl-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors relative group/step"
                        >
                          {/* Month */}
                          <div className="w-8 text-center shrink-0 pt-0.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{step.month}</span>
                          </div>
                          {/* Dot on timeline */}
                          <div className="relative shrink-0 pt-0.5">
                            <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${step.gradient} ring-[3px] ring-white dark:ring-slate-900 z-10 relative transition-all duration-300 group-hover/step:scale-[1.4] group-hover/step:ring-2 ${step.done ? 'shadow-md shadow-emerald-500/30' : ''}`} />
                            {step.done && (
                              <motion.div
                                className="absolute inset-0 rounded-full bg-emerald-400/30"
                                animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            )}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0 pb-2">
                            <p className={`text-sm font-bold leading-snug ${step.done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                              {step.event}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</p>
                          </div>
                          {step.done ? (
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full shrink-0 mt-0.5 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-500" /> Done
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-full shrink-0 mt-0.5">
                              Upcoming
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </FadeIn>
    </div>
  );
}
