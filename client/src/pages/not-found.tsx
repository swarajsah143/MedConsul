import { Link } from 'react-router-dom';
import { Stethoscope, ArrowLeft, Compass } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

/**
 * Real 404 page. Previously any unknown URL silently redirected to `/`, which hid dead
 * links and broken deep-links instead of telling the user what happened.
 */
export default function NotFoundPage() {
  const { isAuthenticated } = useAuth();
  const homeHref = isAuthenticated ? '/dashboard' : '/';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 text-center px-6">
      <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-red-500/25">
        <Stethoscope className="w-7 h-7 text-white" />
      </div>

      <p className="mt-8 text-6xl sm:text-7xl font-extrabold gradient-text tracking-tight">404</p>
      <h1 className="mt-3 text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
        This page couldn't be found
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        The link may be broken, or the page may have moved. Let's get you back to where you need to be.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Link
          to={homeHref}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-semibold shadow-lg shadow-red-500/25 hover:-translate-y-0.5 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          {isAuthenticated ? 'Back to dashboard' : 'Back to home'}
        </Link>
        {isAuthenticated && (
          <Link
            to="/colleges"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:border-red-300 hover:text-red-600 transition-all"
          >
            <Compass className="w-4 h-4" />
            Explore colleges
          </Link>
        )}
      </div>
    </div>
  );
}
