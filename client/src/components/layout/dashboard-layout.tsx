import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';
import { useCollection } from '@/lib/data-api';
import {
  BarChart3,
  Target,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Compass,
  Database,
  FileCheck,
  Globe2,
  GraduationCap,
  Home,
  IndianRupee,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  ListChecks,
  Megaphone,
  Menu,
  Newspaper,
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCircle,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';

interface NavLeaf {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

interface NavGroupType {
  name: string;
  icon: LucideIcon;
  basePath: string;
  children: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroupType;

interface NavSection {
  label: string;
  items: NavEntry[];
}

/** Ids the user has ticked off. Stale ids (from the old static data) are ignored. */
function loadCheckedIds(): string[] {
  try {
    const raw = localStorage.getItem('medcounsel-checklist-state');
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
    }
  } catch { /* ignore malformed/stale state */ }
  return [];
}

/** Badge counts come from the API now — render no badge while loading or on error. */
function buildNavSections(announcementBadge?: string, docsBadge?: string): NavSection[] {
  return [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Announcements', href: '/announcements', icon: Megaphone, badge: announcementBadge },
        { name: 'My Profile', href: '/profile', icon: UserCircle },
      ],
    },
    {
      label: 'Research',
      items: [
        { name: 'Rank Predictor', href: '/rank-predictor', icon: Target },
        { name: 'College Reviews', href: '/colleges', icon: GraduationCap },
        { name: 'Rank Insights', href: '/rank-insights', icon: BarChart3 },
        { name: 'Fee & Seats', href: '/fee-matrix', icon: IndianRupee },
        { name: 'Allotment Mapping', href: '/allotment', icon: MapPin },
        { name: 'Eligibility Matcher', href: '/eligibility-matcher', icon: ListChecks },
      ],
    },
    {
      label: 'Prepare',
      items: [
        {
          name: 'Counselling Conditions',
          icon: ScrollText,
          basePath: '/counselling-conditions',
          children: [
            { name: 'Eligibility', href: '/counselling-conditions/eligibility', icon: ShieldCheck },
            { name: 'Application', href: '/counselling-conditions/application', icon: ClipboardList },
            { name: 'Domicile', href: '/counselling-conditions/domicile', icon: Home },
            { name: 'Counselling', href: '/counselling-conditions/counselling', icon: Users },
            { name: 'Quota & Reservation', href: '/counselling-conditions/quota', icon: Layers },
          ],
        },
        { name: 'Doc Checklist', href: '/doc-checklist', icon: ClipboardCheck, badge: docsBadge },
        {
          name: 'Explore',
          icon: Compass,
          basePath: '/explore',
          children: [
            { name: 'University', href: '/explore/university', icon: Building2 },
            { name: 'Courses', href: '/explore/courses', icon: BookOpen },
            { name: 'Blogs', href: '/explore/blogs', icon: Newspaper },
          ],
        },
        { name: 'Abroad Universities', href: '/abroad-universities', icon: Globe2 },
      ],
    },
  ];
}

// Admin-only entry, shown above everything else for admin users
const ADMIN_NAV: NavLeaf[] = [
  { name: 'Admin Dashboard', href: '/admin', icon: Shield },
  { name: 'Manage Data', href: '/admin/data', icon: Database },
  { name: 'Verify Documents', href: '/admin/verifications', icon: FileCheck },
  { name: 'Students', href: '/admin/students', icon: UsersRound },
];

function NavItem({ item, active, onClick }: { item: NavLeaf; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
        active
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`}
    >
      <Icon className={`w-[18px] h-[18px] ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
      <span className="flex-1 text-left truncate">{item.name}</span>
      {item.badge && (
        <span className="text-[11px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-full px-1.5 py-0.5 shrink-0">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function NavGroup({
  group,
  pathname,
  isActive,
  onNavigate,
}: {
  group: NavGroupType;
  pathname: string;
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  const Icon = group.icon;
  const groupActive = pathname === group.basePath || pathname.startsWith(group.basePath + '/');
  const [open, setOpen] = useState(groupActive);

  useEffect(() => {
    if (groupActive) setOpen(true);
  }, [groupActive]);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
          groupActive
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Icon className={`w-[18px] h-[18px] ${groupActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
        <span className="flex-1 text-left">{group.name}</span>
        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="mt-0.5 ml-4 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
          {group.children.map((child) => {
            const ChildIcon = child.icon;
            const active = isActive(child.href);
            return (
              <Link
                key={child.href}
                to={child.href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-200 ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ChildIcon className={`w-4 h-4 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                {child.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  // Nav badge counts are admin-managed data now.
  const announcements = useCollection<{ id: string }>('announcements');
  const checklistDocs = useCollection<{ id: string }>('checklistDocs');

  const announcementBadge = useMemo(() => {
    if (announcements.loading || announcements.error) return undefined;
    return announcements.data.length > 0 ? String(announcements.data.length) : undefined;
  }, [announcements.loading, announcements.error, announcements.data]);

  const docsBadge = useMemo(() => {
    if (checklistDocs.loading || checklistDocs.error) return undefined;
    const checked = new Set(loadCheckedIds());
    const remaining = checklistDocs.data.filter((d) => !checked.has(d.id)).length;
    return remaining > 0 ? String(remaining) : undefined;
  }, [checklistDocs.loading, checklistDocs.error, checklistDocs.data]);

  const navSections = buildNavSections(announcementBadge, docsBadge);
  // Admins get the admin nav prepended to Overview, and the student-facing "Dashboard"
  // entry removed — their home is the Admin Dashboard.
  const visibleSections: NavSection[] = user?.role === 'admin'
    ? navSections.map((s, i) =>
        i === 0
          ? { ...s, items: [...ADMIN_NAV, ...s.items.filter((it) => !('href' in it && it.href === '/dashboard'))] }
          : s
      )
    : navSections;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';
  // Admins have no student dashboard — their home is the Admin Dashboard.
  const homeHref = user?.role === 'admin' ? '/admin' : '/dashboard';

  return (
    // A proper app shell: the PAGE never scrolls, only <main> does. It used to be
    // min-h-screen (body grows with content) while <main> also had overflow-y-auto —
    // so a tall form (the colleges admin form has 27 fields) scrolled the body past
    // the end of the app and left a large blank region below it.
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 z-30">
        <Link to={homeHref} className="h-14 flex items-center gap-2.5 px-5 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white shadow-sm">
            <Stethoscope className="w-4.5 h-4.5" />
          </div>
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 tracking-tight">MedCounsel AI</span>
        </Link>

        <nav className="flex-1 py-4 px-3 overflow-y-auto" role="navigation" aria-label="Main navigation">
          {visibleSections.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="px-3.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) =>
                  'children' in item ? (
                    <NavGroup key={item.name} group={item} pathname={location.pathname} isActive={isActive} />
                  ) : (
                    <NavItem key={item.name} item={item} active={isActive(item.href)} />
                  )
                )}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <Link
            to="/ai-assistant"
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl gradient-primary text-white text-[13px] font-semibold transition-opacity hover:opacity-90"
          >
            <Sparkles className="w-4 h-4" />
            Ask MedAssist AI
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 mt-1 rounded-lg text-[13px] font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="h-14 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800">
              <Link to={homeHref} className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white shadow-sm">
                  <Stethoscope className="w-4.5 h-4.5" />
                </div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">MedCounsel AI</span>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 overflow-y-auto" role="navigation">
              {visibleSections.map((section) => (
                <div key={section.label} className="mb-5">
                  <p className="px-3.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) =>
                      'children' in item ? (
                        <NavGroup
                          key={item.name}
                          group={item}
                          pathname={location.pathname}
                          isActive={isActive}
                          onNavigate={() => setMobileMenuOpen(false)}
                        />
                      ) : (
                        <NavItem key={item.name} item={item} active={isActive(item.href)} onClick={() => setMobileMenuOpen(false)} />
                      )
                    )}
                  </div>
                </div>
              ))}
            </nav>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800">
              <Link
                to="/ai-assistant"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl gradient-primary text-white text-[13px] font-semibold transition-opacity hover:opacity-90"
              >
                <Sparkles className="w-4 h-4" />
                Ask MedAssist AI
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 mt-1 rounded-lg text-[13px] font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
              >
                <LogOut className="w-[18px] h-[18px]" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-5 z-30 shrink-0 relative">
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 -ml-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to={homeHref} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center text-white">
                <Stethoscope className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">MedCounsel AI</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-sm text-slate-400">Welcome,</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name || 'User'}</span>
          </div>

          {/* Profile */}
          <div className="relative ml-auto" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="User menu"
              aria-expanded={dropdownOpen}
            >
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {userInitial}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-[60] animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); handleLogout(); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
