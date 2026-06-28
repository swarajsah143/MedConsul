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

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
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
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 shrink-0">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white">
            <Stethoscope className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200">MedCounsel AI</span>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1.5">
          {navigation.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 shadow-xl z-50 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200">MedCounsel AI</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
              {navigation.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 dark:text-slate-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center text-white">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">MedCounsel AI</span>
            </div>
          </div>

          <div className="hidden md:block">
            <h1 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Welcome, <span className="text-slate-900 dark:text-slate-100">{user?.name || 'User'}</span>
            </h1>
          </div>

          {/* Profile dropdown */}
          <div className="relative ml-auto" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">
                {userInitial}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-100 dark:border-slate-800 py-1 z-50">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
