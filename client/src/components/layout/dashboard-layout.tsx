import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';
import {
  Stethoscope,
  GraduationCap,
  BarChart3,
  IndianRupee,
  ClipboardCheck,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const navigation = [
  { name: 'Rank Insights', href: '/rank-insights', icon: BarChart3 },
  { name: 'Fee & Seats', href: '/fee-matrix', icon: IndianRupee },
  { name: 'College Reviews', href: '/colleges', icon: GraduationCap },
  { name: 'Doc Checklist', href: '/doc-checklist', icon: ClipboardCheck },
];

function NavItem({ item, active, onClick }: { item: typeof navigation[0]; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
        active
          ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`}
    >
      <Icon className={`w-[18px] h-[18px] ${active ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`} />
      {item.name}
    </Link>
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

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0">
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white shadow-sm">
            <Stethoscope className="w-4.5 h-4.5" />
          </div>
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 tracking-tight">MedCounsel AI</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5" role="navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} active={isActive(item.href)} />
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
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
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white shadow-sm">
                  <Stethoscope className="w-4.5 h-4.5" />
                </div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">MedCounsel AI</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto" role="navigation">
              {navigation.map((item) => (
                <NavItem key={item.name} item={item} active={isActive(item.href)} />
              ))}
            </nav>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <LogOut className="w-[18px] h-[18px]" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-5 z-10 shrink-0">
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 -ml-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center text-white">
                <Stethoscope className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">MedCounsel AI</span>
            </div>
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
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); handleLogout(); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
