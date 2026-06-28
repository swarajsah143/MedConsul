import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Stethoscope,
  TrendingUp,
  MapPin,
  Calendar,
  Bell,
  Clock,
  Compass,
  FileText,
  Video,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user } = useAuth();

  // Mock states of interest (can be loaded from user profile later)
  const [selectedStates] = useState(['All India Quota (AIQ)', 'Maharashtra', 'Karnataka']);

  // Mock timeline events
  const timelineEvents = [
    {
      title: 'MCC AIQ Registration Starts',
      date: 'July 15, 2026',
      time: '10:00 AM',
      status: 'upcoming',
      description: 'Registration and fee payment portal opens on mcc.nic.in',
    },
    {
      title: 'Choice Filling & Locking',
      date: 'July 18 - 22, 2026',
      time: 'Starts 11:00 AM',
      status: 'upcoming',
      description: 'Select MBBS/BDS choices in order of preference. AI Counselor recommendation active.',
    },
    {
      title: 'Round 1 Seat Allotment',
      date: 'July 25, 2026',
      time: '5:00 PM',
      status: 'upcoming',
      description: 'Allotment list publication and downloadable seat allotment letter.',
    },
    {
      title: 'Reporting to Allotted College',
      date: 'July 26 - Aug 1, 2026',
      time: 'Physical Reporting',
      status: 'upcoming',
      description: 'Document verification and admission formalities at allotted institute.',
    },
  ];

  // Mock notifications
  const notifications = [
    {
      id: '1',
      title: 'Urgent: Document Upload',
      message: 'Upload your NEET UG Admit Card and Marksheet to verify document checklist.',
      type: 'warning',
      time: '2 hours ago',
    },
    {
      id: '2',
      title: 'Maharashtra Registration Open',
      message: 'Maharashtra state CET cell has published the registration schedule for MBBS admissions.',
      type: 'info',
      time: '1 day ago',
    },
  ];

  // Mock recent updates
  const recentUpdates = [
    {
      title: 'MCC Seat Matrix released for Round 1',
      date: 'June 27, 2026',
      source: 'MCC Official',
      link: '#',
    },
    {
      title: 'KEA Karnataka Domicile Certificate clarification notice',
      date: 'June 25, 2026',
      source: 'KEA Official',
      link: '#',
    },
    {
      title: 'Required documents format checklist PDF',
      date: 'June 24, 2026',
      source: 'MedCounsel AI',
      link: '#',
    },
  ];

  // Mock video tutorials
  const videoTutorials = [
    {
      title: 'Step-by-Step Choice Filling Strategy',
      duration: '12 mins',
      category: 'Choice Filling',
    },
    {
      title: 'Understanding Domicile Rules for Maharashtra/Karnataka',
      duration: '18 mins',
      category: 'State Rules',
    },
  ];

  // Document checklist status
  const documentProgress = {
    verified: 6,
    total: 10,
    percentage: 60,
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Personalized Greeting & Profile Summary */}
      <div className="gradient-primary rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg animate-pulse-glow">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Admission Season 2026
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Hello, {user?.firstName || 'Future Doctor'}!
            </h2>
            <p className="text-teal-100 text-sm md:text-base leading-relaxed max-w-xl">
              Welcome back to your counseling dashboard. Let's analyze your eligibility, prepare your document bundle, and build your college choice list.
            </p>
            {/* Selected States Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs text-teal-200 flex items-center gap-1 self-center">
                <MapPin className="w-3 h-3" /> Selected States:
              </span>
              {selectedStates.map((state) => (
                <span
                  key={state}
                  className="bg-white/15 hover:bg-white/25 transition-colors duration-150 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-md"
                >
                  {state}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Info Grid inside Welcome Banner */}
          <div className="glass border-white/20 p-5 rounded-xl space-y-4 bg-white/10 text-white shadow-inner">
            <h4 className="text-xs uppercase tracking-wider text-teal-200 font-bold">Your NEET Status</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-teal-200">All India Rank (AIR)</p>
                <p className="text-xl font-bold">{user?.neetRank ? `#${user.neetRank.toLocaleString()}` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-teal-200">Score</p>
                <p className="text-xl font-bold">{user?.neetScore ? `${user.neetScore}/720` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-teal-200">Category</p>
                <p className="text-sm font-semibold capitalize">{user?.category || 'General'}</p>
              </div>
              <div>
                <p className="text-[10px] text-teal-200">Home State</p>
                <p className="text-sm font-semibold truncate">{user?.state || 'Not Set'}</p>
              </div>
            </div>
            <Button asChild variant="secondary" className="w-full bg-white text-teal-700 hover:bg-teal-50" size="sm">
              <Link to="/profile">Edit Profile Details</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column for Analytics, Right for Updates/Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Quick Statistics Cards */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              Quick Statistics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="glass shadow-sm">
                <CardContent className="pt-6 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eligible Colleges</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">142</span>
                    <span className="text-xs text-emerald-600 font-medium">+12 from last year</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Based on your score and state domicile</p>
                </CardContent>
              </Card>

              <Card className="glass shadow-sm">
                <CardContent className="pt-6 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Predicted Choices</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">45</span>
                    <span className="text-xs text-slate-400 font-medium">Safe matches</span>
                  </div>
                  <p className="text-[11px] text-slate-400">High probability allotments available</p>
                </CardContent>
              </Card>

              <Card className="glass shadow-sm">
                <CardContent className="pt-6 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Counseling Fees</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">Pending</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Pay deposit when portals open</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Counseling Cards (Portals State Status) */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              Counseling Portal Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* MCC */}
              <Card className="relative overflow-hidden border-l-4 border-l-teal-500 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-teal-950/30 dark:text-teal-400">
                      MCC - AIQ
                    </span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <CardTitle className="text-base mt-2">All India Counseling</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-3">
                  <p className="text-slate-500 leading-relaxed">
                    First round schedule published. Choice entry begins shortly.
                  </p>
                  <Button asChild variant="outline" className="w-full text-[11px] h-8 mt-1">
                    <a href="https://mcc.nic.in" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1">
                      Visit MCC website <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Maharashtra state */}
              <Card className="relative overflow-hidden border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-amber-950/30 dark:text-amber-400">
                      State Quota
                    </span>
                    <span className="text-[10px] text-amber-600 font-semibold">Not Started</span>
                  </div>
                  <CardTitle className="text-base mt-2">Maharashtra (CET)</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-3">
                  <p className="text-slate-500 leading-relaxed">
                    Awaiting official brochure and online registration calendar release.
                  </p>
                  <Button asChild variant="outline" className="w-full text-[11px] h-8 mt-1">
                    <a href="https://cetcell.mahacet.org" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1">
                      Visit CET Cell <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Karnataka state */}
              <Card className="relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-blue-950/30 dark:text-blue-400">
                      State Quota
                    </span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded dark:bg-blue-950/50 dark:text-blue-400">
                      Open Soon
                    </span>
                  </div>
                  <CardTitle className="text-base mt-2">Karnataka (KEA)</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-3">
                  <p className="text-slate-500 leading-relaxed">
                    Draft seat matrix released. Online registration expected this week.
                  </p>
                  <Button asChild variant="outline" className="w-full text-[11px] h-8 mt-1">
                    <a href="https://kea.kar.nic.in" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1">
                      Visit KEA portal <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Timeline of events */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Counseling Timeline & Deadlines
            </h3>
            <Card>
              <CardContent className="pt-6">
                <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-8">
                  {timelineEvents.map((event, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-slate-900 border-2 border-teal-500 z-10">
                        <Clock className="w-2.5 h-2.5 text-teal-500" />
                      </span>
                      <div className="space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{event.title}</h4>
                          <span className="inline-flex text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded dark:bg-slate-800 dark:text-slate-400 self-start sm:self-center">
                            {event.date} • {event.time}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 max-w-xl leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

        </div>

        {/* Right 1 Column */}
        <div className="space-y-8">
          
          {/* Notifications Panel */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Bell className="w-5 h-5 text-teal-600" />
              Action Notifications
            </h3>
            <div className="space-y-3">
              {notifications.map((notif) => {
                const isWarning = notif.type === 'warning';
                return (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-xl border flex gap-3 ${
                      isWarning
                        ? 'bg-amber-50/70 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30'
                        : 'bg-teal-50/70 border-teal-100 dark:bg-teal-950/20 dark:border-teal-900/30'
                    }`}
                  >
                    {isWarning ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-500 shrink-0" />
                    )}
                    <div className="space-y-1">
                      <h4 className={`text-xs font-bold ${isWarning ? 'text-amber-800 dark:text-amber-400' : 'text-teal-800 dark:text-teal-400'}`}>
                        {notif.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-slate-400 block pt-1">{notif.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick Access Tools & Shortcuts */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Counseling Copilots</h3>
            <div className="space-y-4">
              {/* AI Assistant */}
              <Card className="hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-300" />
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-white mb-2 shadow-sm">
                    <Compass className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold flex items-center gap-1">
                    AI Advisor Chatbot
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    Ask questions about cutoff prediction, domicile rules, and seat allocation matching.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full gradient-primary text-white" size="sm">
                    <Link to="/ai-chat">Start Consult session</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Document Checklist progress */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2 shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold">Document Checklist</CardTitle>
                  <CardDescription className="text-xs">
                    Prepare your physical documents to prevent verification rejection during admissions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Custom progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Collected status</span>
                      <span className="text-teal-600">{documentProgress.verified} / {documentProgress.total} Files</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${documentProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                  <Button asChild variant="outline" className="w-full text-xs h-9" size="sm">
                    <Link to="/documents" className="flex items-center justify-center gap-1">
                      Check Documents Checklist <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Video Webinar Library */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2 shadow-sm">
                    <Video className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold">Video Help Webinars</CardTitle>
                  <CardDescription className="text-xs">
                    Video masterclasses explaining round selections and seat locking.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {videoTutorials.map((vid, idx) => (
                      <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{vid.title}</p>
                          <span className="text-[10px] text-slate-400">{vid.category}</span>
                        </div>
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium dark:bg-blue-950/30 dark:text-blue-400 shrink-0">
                          {vid.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Recent Updates notice board */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <Link to="/notifications" className="hover:underline flex items-center gap-1">
                Latest Official Bulletins <ArrowUpRight className="w-4 h-4" />
              </Link>
            </h3>
            <Card>
              <CardContent className="pt-6">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentUpdates.map((update, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 space-y-1 group">
                      <Link to="/notifications" className="block text-xs font-semibold text-slate-800 hover:text-teal-600 dark:text-slate-200 dark:hover:text-teal-400 leading-snug">
                        {update.title}
                      </Link>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{update.date}</span>
                        <span>•</span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium dark:bg-slate-800 dark:text-slate-400">
                          {update.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

        </div>

      </div>
    </div>
  );
}
