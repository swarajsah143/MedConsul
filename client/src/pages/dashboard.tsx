import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';
import { INSIGHTS_DATA, INSIGHT_FILTER_OPTIONS } from '@/lib/insights-data';
import { FEE_MATRIX_DATA } from '@/lib/fee-matrix-data';
import { MOCK_COLLEGES } from '@/lib/college-data';
import { CHECKLIST_DOCS } from '@/lib/checklist-data';
import { getRecentAnnouncements } from '@/lib/announcements-data';
import { VIDEOS_DATA } from '@/lib/videos-data';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';

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

const CONTROL_PANEL_ITEMS = [
  {
    title: 'College Reviews',
    description: 'Honest insights on colleges, faculty, campus & admissions.',
    icon: Star,
    href: '/colleges',
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    stat: '30+ colleges',
  },
  {
    title: 'Closing Ranks',
    description: 'Know last year cut-offs & safe rank ranges instantly.',
    icon: BarChart3,
    href: '/rank-insights',
    gradient: 'from-red-500 to-rose-600',
    bg: 'bg-red-50 dark:bg-red-950/30',
    iconColor: 'text-red-600 dark:text-red-400',
    stat: '3 years data',
  },
  {
    title: 'Allotment Mapping',
    description: 'Find which colleges you can get based on rank or state.',
    icon: MapPin,
    href: '/allotment',
    gradient: 'from-indigo-500 to-purple-600',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    stat: '35 states',
  },
  {
    title: 'Fee & Seat Matrix',
    description: 'Compare tuition fees, hostel charges & seat distribution.',
    icon: IndianRupee,
    href: '/fee-matrix',
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    stat: 'All quotas',
  },
  {
    title: 'Document Checklist',
    description: 'Never miss a document with step-by-step guidance.',
    icon: ClipboardCheck,
    href: '/doc-checklist',
    gradient: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    stat: 'Track progress',
  },
  {
    title: 'Announcements',
    description: 'Real-time updates for rounds, deadlines & changes.',
    icon: Bell,
    href: '/announcements',
    gradient: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    stat: 'Live feed',
  },
  {
    title: 'MedAssist AI',
    description: 'Get instant answers to all your counselling queries.',
    icon: Bot,
    href: '/ai-assistant',
    gradient: 'from-cyan-500 to-teal-600',
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    stat: 'Ask anything',
  },
];

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
      states: INSIGHT_FILTER_OPTIONS.states.length,
      videos: VIDEOS_DATA.length,
      checklistDone: checklist.completed,
      checklistTotal: checklist.total,
    };
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Student';
  const checklistPct = stats.checklistTotal > 0
    ? Math.round((stats.checklistDone / stats.checklistTotal) * 100)
    : 0;

  return (
    <div className="space-y-8 pb-10 page-enter">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="gradient-primary p-6 sm:p-8 lg:p-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-rose-400/10 rounded-full blur-2xl" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
                  <Sparkles className="w-3.5 h-3.5" />
                  NEET UG 2026
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Welcome back, {firstName}!
              </h1>
              <p className="text-red-100/90 text-sm sm:text-base max-w-xl leading-relaxed">
                Your complete NEET counselling companion. Track ranks, compare colleges, prepare documents & get AI-powered guidance.
              </p>
            </div>

            {/* Checklist Progress Ring */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/10 sm:min-w-[240px]">
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
                  <circle
                    cx="18" cy="18" r="14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray={`${checklistPct * 0.88} 88`}
                    className="transition-all duration-700"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{checklistPct}%</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Doc Checklist</p>
                <p className="text-xs text-red-200 mt-0.5">{stats.checklistDone} of {stats.checklistTotal} completed</p>
                <Link to="/doc-checklist" className="inline-flex items-center gap-1 text-xs font-medium text-white/80 hover:text-white mt-1 transition-colors">
                  Continue <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[
          { label: 'Colleges', value: stats.colleges, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Rank Records', value: stats.rankRecords, icon: BarChart3, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
          { label: 'States', value: 35, icon: MapPin, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
          { label: 'Documents', value: stats.docCategories, icon: ClipboardCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Fee Records', value: stats.feeRecords, icon: IndianRupee, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Videos', value: stats.videos, icon: PlayCircle, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
        ].map((stat) => (
          <Card key={stat.label} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} transition-transform duration-300 group-hover:scale-110`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-none">{stat.value}</p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admission Control Panel */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Your Admission Control Panel</h2>
            <p className="text-xs text-muted-foreground">Everything you need for a confident admission</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CONTROL_PANEL_ITEMS.map((item) => (
            <Link key={item.href + item.title} to={item.href} className="group">
              <Card className="h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-transparent hover:border-red-200 dark:hover:border-red-900/40 overflow-hidden relative">
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
                <CardContent className="p-5 relative">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.bg} transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                      <item.icon className={`w-5.5 h-5.5 ${item.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.stat}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom Grid: Announcements + Quick Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Announcements */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4.5 h-4.5 text-red-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Latest Updates</h2>
            </div>
            <Link to="/announcements" className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 transition-colors">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
              {recentAnnouncements.map((a, idx) => {
                const Icon = TYPE_ICONS[a.announcementType] || Bell;
                const color = TYPE_COLORS[a.announcementType] || 'text-slate-600 bg-slate-50 dark:bg-slate-800';
                return (
                  <div key={a.id} className="flex gap-3.5 p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group/item cursor-default">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${color} transition-transform duration-200 group-hover/item:scale-105`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{a.shortDescription}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {a.announcementType}
                        </span>
                        {a.state && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                            {a.state}
                          </span>
                        )}
                        {a.documentUrl && (
                          <a
                            href={a.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-red-600 dark:text-red-400 font-medium flex items-center gap-0.5 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View PDF <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right self-start mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> {a.month} {a.day}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        {/* Quick Tips & Resources */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4.5 h-4.5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Quick Tips</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                tip: 'Start by completing your Document Checklist to ensure you have everything ready.',
                color: 'border-l-emerald-500',
                bg: 'bg-emerald-50/50 dark:bg-emerald-950/10',
                link: '/doc-checklist',
              },
              {
                tip: 'Use Allotment Mapping to find colleges matching your rank across all 35 states.',
                color: 'border-l-indigo-500',
                bg: 'bg-indigo-50/50 dark:bg-indigo-950/10',
                link: '/allotment',
              },
              {
                tip: 'Compare fees in Fee Matrix before counselling to plan your budget smartly.',
                color: 'border-l-amber-500',
                bg: 'bg-amber-50/50 dark:bg-amber-950/10',
                link: '/fee-matrix',
              },
              {
                tip: 'Ask MedAssist AI any doubt — counselling process, college selection, or documents.',
                color: 'border-l-cyan-500',
                bg: 'bg-cyan-50/50 dark:bg-cyan-950/10',
                link: '/ai-assistant',
              },
            ].map((item, idx) => (
              <Link key={idx} to={item.link}>
                <Card className={`border-l-4 ${item.color} ${item.bg} hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group/tip`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex-1">{item.tip}</p>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 group-hover/tip:text-red-500 group-hover/tip:translate-x-0.5 transition-all duration-200" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Platform Stats Mini */}
          <Card className="mt-4 bg-slate-50 dark:bg-slate-800/50">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Platform Coverage</p>
              <div className="space-y-2.5">
                {[
                  { label: 'States & UTs', value: '35' },
                  { label: 'College Reviews', value: String(stats.colleges) },
                  { label: 'Years of Data', value: '3' },
                  { label: 'Video Resources', value: String(stats.videos) },
                  { label: 'AI Knowledge Base', value: '13 articles' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400">{s.label}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
