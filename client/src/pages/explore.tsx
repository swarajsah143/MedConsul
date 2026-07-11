import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  INDIAN_STATES,
  MEDICAL_COURSES,
  MEDICAL_BRANCHES,
  BLOG_CATEGORIES,
  searchUniversities,
  searchByCourse,
  searchBlogs,
  type University,
  type Blog,
} from '@/lib/explore-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Compass,
  Building2,
  BookOpen,
  Newspaper,
  Search,
  MapPin,
  ChevronDown,
  GraduationCap,
  ExternalLink,
  CalendarDays,
  Clock,
  User,
  Sparkles,
  Layers,
} from 'lucide-react';

type SectionKey = 'university' | 'courses' | 'blogs';

const SECTIONS: { key: SectionKey; label: string; icon: typeof Compass }[] = [
  { key: 'university', label: 'University', icon: Building2 },
  { key: 'courses', label: 'Courses', icon: BookOpen },
  { key: 'blogs', label: 'Blogs', icon: Newspaper },
];

const NEON_TYPE: Record<string, { border: string; text: string; bg: string; icon: string; glow: string; hoverText: string }> = {
  Government: { border: 'border-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: 'text-emerald-400', glow: 'hover:shadow-emerald-500/10', hoverText: 'group-hover:text-emerald-300' },
  Private: { border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10', icon: 'text-amber-400', glow: 'hover:shadow-amber-500/10', hoverText: 'group-hover:text-amber-300' },
  Deemed: { border: 'border-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-500/10', icon: 'text-blue-400', glow: 'hover:shadow-blue-500/10', hoverText: 'group-hover:text-blue-300' },
  AIIMS: { border: 'border-red-500/20', text: 'text-red-400', bg: 'bg-red-500/10', icon: 'text-red-400', glow: 'hover:shadow-red-500/10', hoverText: 'group-hover:text-red-300' },
  Central: { border: 'border-purple-500/20', text: 'text-purple-400', bg: 'bg-purple-500/10', icon: 'text-purple-400', glow: 'hover:shadow-purple-500/10', hoverText: 'group-hover:text-purple-300' },
};
const DEFAULT_NEON = { border: 'border-slate-500/20', text: 'text-slate-400', bg: 'bg-slate-500/10', icon: 'text-slate-400', glow: 'hover:shadow-slate-500/10', hoverText: 'group-hover:text-slate-300' };

function selectClass() {
  return 'h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-4 pr-10 text-sm font-medium text-slate-700 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer';
}

function UniversityCard({ u }: { u: University }) {
  const neon = NEON_TYPE[u.type] || DEFAULT_NEON;

  return (
    <div className={`group h-full rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 dark:border-slate-700/50 overflow-hidden hover:shadow-2xl ${neon.glow} hover:-translate-y-1 transition-all duration-300 relative`}>
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Photo banner */}
      <div className="relative h-32 overflow-hidden">
        <img
          src={u.image}
          alt={u.name}
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        <span className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${neon.bg} ${neon.text} ${neon.border}`}>
          {u.type}
        </span>
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-1.5 text-white/80">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="text-[11px] font-semibold truncate">{u.city}, {u.state}</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 relative">
        {/* Icon + Name */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${neon.bg} border ${neon.border} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
            <GraduationCap className={`w-5 h-5 ${neon.icon}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`text-sm font-bold text-white leading-snug ${neon.hoverText} transition-colors line-clamp-2`}>
              {u.name}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-500" /> {u.city}, {u.state}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${neon.bg} ${neon.text} ${neon.border}`}>
            {u.type}
          </span>
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/50 text-slate-400">
            Est. {u.established}
          </span>
        </div>

        {/* Courses */}
        <div className="border-t border-slate-800 pt-3 mb-3">
          <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mb-2">Courses Offered</p>
          <div className="flex flex-wrap gap-1">
            {u.courses.slice(0, 6).map((c) => (
              <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
                {c}
              </span>
            ))}
            {u.courses.length > 6 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/50 text-slate-500">
                +{u.courses.length - 6}
              </span>
            )}
          </div>
        </div>

        {/* Website link */}
        <a
          href={u.website}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${neon.text} hover:gap-2.5 transition-all duration-300`}
        >
          Visit Website <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </a>
      </div>
    </div>
  );
}

function EmptyResults({ message, hint }: { message: string; hint: string }) {
  return (
    <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed">
      <CardContent className="p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────── University ───────────────────────
function UniversitySection() {
  const [name, setName] = useState('');
  const [state, setState] = useState('All States');

  const results = useMemo(() => searchUniversities(name, state), [name, state]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-400" />
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Enter university or city name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-12 h-11 text-base rounded-xl"
              />
            </div>
            <div className="relative sm:w-72">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
              <select value={state} onChange={(e) => setState(e.target.value)} className={selectClass() + ' pl-11'}>
                <option value="All States">All States</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-slate-800 dark:text-slate-200">{results.length}</span>{' '}
          medical universit{results.length !== 1 ? 'ies' : 'y'} found
          {state !== 'All States' && <> in <span className="font-semibold text-red-600 dark:text-red-400">{state}</span></>}
        </p>
      </div>

      {results.length === 0 ? (
        <EmptyResults message="No universities match your search" hint="Try a different name or select another state." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((u) => (
            <UniversityCard key={u.id} u={u} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────── Courses ───────────────────────
function CoursesSection() {
  const [course, setCourse] = useState('All Courses');
  const [branch, setBranch] = useState('All Branches');
  const [results, setResults] = useState<University[] | null>(null);

  const handleSearch = () => setResults(searchByCourse(course, branch));

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-400" />
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Course
              </label>
              <div className="relative">
                <select value={course} onChange={(e) => setCourse(e.target.value)} className={selectClass()}>
                  <option value="All Courses">All Courses</option>
                  {MEDICAL_COURSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Branch / Specialization
              </label>
              <div className="relative">
                <select value={branch} onChange={(e) => setBranch(e.target.value)} className={selectClass()}>
                  <option value="All Branches">All Branches</option>
                  {MEDICAL_BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <Button onClick={handleSearch} className="w-full sm:w-auto gradient-primary text-white h-11 px-8">
            <Search className="w-4 h-4" /> Search Universities
          </Button>
        </CardContent>
      </Card>

      {results === null ? (
        <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Select a course and branch, then hit search</p>
            <p className="text-xs text-muted-foreground mt-1">We'll list every university offering that course & specialization.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground px-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">{results.length}</span> universit{results.length !== 1 ? 'ies' : 'y'} offer
            {results.length === 1 ? 's' : ''}{' '}
            <span className="font-semibold text-red-600 dark:text-red-400">{course === 'All Courses' ? 'any course' : course}</span>
            {branch !== 'All Branches' && <> in <span className="font-semibold text-red-600 dark:text-red-400">{branch}</span></>}
          </p>
          {results.length === 0 ? (
            <EmptyResults message="No universities found for this combination" hint="Try 'All Branches' or a broader course selection." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((u) => (
                <UniversityCard key={u.id} u={u} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────── Blogs ───────────────────────

const BLOG_CAT_NEON: Record<string, { bg: string; text: string; border: string; icon: string; glow: string; hoverText: string }> = {
  University: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: 'text-blue-400', glow: 'hover:shadow-blue-500/10', hoverText: 'group-hover:text-blue-300' },
  Research: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: 'text-emerald-400', glow: 'hover:shadow-emerald-500/10', hoverText: 'group-hover:text-emerald-300' },
  Discovery: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', icon: 'text-purple-400', glow: 'hover:shadow-purple-500/10', hoverText: 'group-hover:text-purple-300' },
  Admissions: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: 'text-amber-400', glow: 'hover:shadow-amber-500/10', hoverText: 'group-hover:text-amber-300' },
  Career: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', icon: 'text-cyan-400', glow: 'hover:shadow-cyan-500/10', hoverText: 'group-hover:text-cyan-300' },
};
const DEFAULT_BLOG_NEON = { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: 'text-red-400', glow: 'hover:shadow-red-500/10', hoverText: 'group-hover:text-red-300' };

function BlogCard({ b }: { b: Blog }) {
  const dateStr = new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const neon = BLOG_CAT_NEON[b.category] || DEFAULT_BLOG_NEON;

  return (
    <a href={b.url} target="_blank" rel="noopener noreferrer" className="group block h-full">
      <div className="h-full rounded-2xl bg-gradient-to-br from-red-50/80 via-orange-50/60 to-amber-50/40 dark:from-red-950/25 dark:via-orange-950/15 dark:to-amber-950/10 border border-red-200/60 dark:border-red-900/30 overflow-hidden hover:shadow-2xl hover:shadow-red-500/10 hover:-translate-y-1 transition-all duration-300 relative">
        {/* Hover glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="p-4 sm:p-5 relative flex flex-col h-full">
          {/* Category badge + Read time */}
          <div className="flex items-center justify-between mb-3">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${neon.bg} ${neon.text} ${neon.border}`}>
              <Newspaper className={`w-3 h-3 ${neon.icon}`} />
              {b.category}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3" /> {b.readTime}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2">
            {b.title}
          </h3>

          {/* Excerpt */}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed line-clamp-3 flex-1">{b.excerpt}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-3">
            {b.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/60 dark:bg-slate-800/60 border border-red-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-400">
                #{t}
              </span>
            ))}
          </div>

          {/* Footer: Author + Date */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-red-100/80 dark:border-red-900/20 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 flex items-center justify-center">
                <User className="w-2.5 h-2.5 text-red-500 dark:text-red-400" />
              </div>
              {b.author}
            </span>
            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {dateStr}</span>
            <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 text-red-500 dark:text-red-400 transition-opacity duration-300" />
          </div>
        </div>
      </div>
    </a>
  );
}

function BlogsSection() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const results = useMemo(() => searchBlogs(query, category), [query, category]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-400" />
        <CardContent className="p-5 sm:p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search blogs by university, research, discovery, or topic..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 h-11 text-base rounded-xl"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {['All', ...BLOG_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                  category === cat
                    ? 'gradient-primary text-white border-transparent shadow-md'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:border-red-300 hover:text-red-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground px-1">
        <span className="font-bold text-slate-800 dark:text-slate-200">{results.length}</span> blog{results.length !== 1 ? 's' : ''} found
      </p>

      {results.length === 0 ? (
        <EmptyResults message="No blogs match your search" hint="Try a different keyword or category." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((b) => (
            <BlogCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const active = (SECTIONS.find((s) => s.key === section)?.key ?? 'university') as SectionKey;

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="gradient-primary p-6 sm:p-8 lg:p-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
              <Sparkles className="w-3.5 h-3.5" /> Explore
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Compass className="w-7 h-7 sm:w-8 sm:h-8" /> Explore
            </h1>
            <p className="text-red-100/90 text-sm sm:text-base max-w-xl leading-relaxed">
              Discover medical universities, browse courses & specializations, and read the latest blogs on institutions and research.
            </p>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isOn = s.key === active;
          return (
            <button
              key={s.key}
              onClick={() => navigate(`/explore/${s.key}`)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                isOn
                  ? 'gradient-primary text-white border-transparent shadow-md shadow-red-500/25'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:border-red-300 hover:text-red-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {active === 'university' && <UniversitySection />}
      {active === 'courses' && <CoursesSection />}
      {active === 'blogs' && <BlogsSection />}
    </div>
  );
}
