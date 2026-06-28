import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';
import { INSIGHTS_DATA, INSIGHT_FILTER_OPTIONS } from '@/lib/insights-data';
import { FEE_MATRIX_DATA } from '@/lib/fee-matrix-data';
import { MOCK_COLLEGES } from '@/lib/college-data';
import { CHECKLIST_DOCS } from '@/lib/checklist-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';

// Read checklist progress from localStorage
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

const QUICK_ACTIONS = [
  {
    title: 'College Reviews',
    description: 'Explore detailed reviews of top medical colleges across India',
    icon: GraduationCap,
    href: '/colleges',
    color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400',
    border: 'hover:border-blue-200 dark:hover:border-blue-800',
  },
  {
    title: 'Closing Rank Insights',
    description: 'Analyze historical closing ranks, scores, and admission trends',
    icon: BarChart3,
    href: '/rank-insights',
    color: 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400',
    border: 'hover:border-red-200 dark:hover:border-red-800',
  },
  {
    title: 'Document Checklist',
    description: 'Track and prepare all required documents for counselling',
    icon: ClipboardCheck,
    href: '/doc-checklist',
    color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
    border: 'hover:border-emerald-200 dark:hover:border-emerald-800',
  },
  {
    title: 'Fee & Seat Matrix',
    description: 'Compare tuition fees, hostel charges, and seat distribution',
    icon: IndianRupee,
    href: '/fee-matrix',
    color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
    border: 'hover:border-amber-200 dark:hover:border-amber-800',
  },
];

const RECENT_UPDATES = [
  {
    icon: Building2,
    title: 'New college profiles added',
    description: 'AFMC Pune and St. John\'s Bengaluru reviews are now available',
    time: '2 hours ago',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20',
  },
  {
    icon: TrendingUp,
    title: 'Closing ranks updated for 2025',
    description: 'Round 2 data now available for AIIMS, JIPMER, and BMCRI',
    time: '5 hours ago',
    color: 'text-red-600 bg-red-50 dark:bg-red-950/20',
  },
  {
    icon: IndianRupee,
    title: 'Fee structures published',
    description: 'KMC Manipal and CMC Vellore year-wise fee breakdowns added',
    time: '1 day ago',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20',
  },
  {
    icon: FileText,
    title: 'Checklist updated for 2026',
    description: 'Physical reporting documents updated with latest MCC requirements',
    time: '2 days ago',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = useMemo(() => {
    const checklist = getChecklistProgress();
    return {
      colleges: MOCK_COLLEGES.length,
      rankRecords: INSIGHTS_DATA.length,
      docCategories: CHECKLIST_DOCS.length,
      feeRecords: FEE_MATRIX_DATA.length,
      states: INSIGHT_FILTER_OPTIONS.states.length,
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
      {/* Hero Section */}
      <div className="gradient-primary rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-red-200" />
            <span className="text-xs font-semibold text-red-200 uppercase tracking-wider">NEET UG 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-red-100/90 mt-1.5 text-sm sm:text-base max-w-lg">
            Your NEET counselling workspace. Track closing ranks, compare colleges, prepare documents, and plan your admission.
          </p>

          {/* Checklist mini-progress inside hero */}
          <div className="mt-5 flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 max-w-sm border border-white/10">
            <div className="relative w-10 h-10 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="14" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${checklistPct * 0.88} 88`}
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">{checklistPct}%</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold">Document Checklist</p>
              <p className="text-[11px] text-red-200">{stats.checklistDone} of {stats.checklistTotal} completed</p>
            </div>
            <Link to="/doc-checklist" className="ml-auto shrink-0">
              <ChevronRight className="w-4 h-4 text-red-200 hover:text-white transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} to={action.href} className="group">
              <Card className={`h-full hover:shadow-lg transition-all duration-300 ${action.border}`}>
                <CardContent className="p-5 space-y-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${action.color} transition-transform duration-300 group-hover:scale-110`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Explore <ArrowRight className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Statistics */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Platform Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Colleges', value: `${stats.colleges}`, sub: `${stats.states} states covered`, icon: Building2, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20' },
            { label: 'Rank Records', value: `${stats.rankRecords}`, sub: '3 years of data', icon: BarChart3, color: 'text-red-600 bg-red-50 dark:bg-red-950/20' },
            { label: 'Documents', value: `${stats.docCategories}`, sub: `${checklistPct}% completed`, icon: ClipboardCheck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
            { label: 'Fee Records', value: `${stats.feeRecords}`, sub: 'across all quotas', icon: IndianRupee, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' },
          ].map((stat) => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Bottom Grid: Recent Updates + Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Updates */}
        <section className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent Updates</h2>
          </div>
          <Card>
            <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
              {RECENT_UPDATES.map((update, idx) => (
                <div key={idx} className="flex gap-3.5 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${update.color}`}>
                    <update.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{update.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{update.description}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1 self-start mt-1">
                    <Clock className="w-3 h-3" /> {update.time}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Quick Access */}
        <section className="lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Quick Access</h2>
          <Card>
            <CardContent className="p-4 space-y-2.5">
              {[
                { label: 'Explore Colleges', href: '/colleges', icon: GraduationCap, color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600' },
                { label: 'Analyze Closing Ranks', href: '/rank-insights', icon: BarChart3, color: 'bg-red-50 dark:bg-red-950/20 text-red-600' },
                { label: 'View Documents', href: '/doc-checklist', icon: ClipboardCheck, color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' },
                { label: 'Compare Fees', href: '/fee-matrix', icon: IndianRupee, color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' },
              ].map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 px-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Link to={item.href} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
