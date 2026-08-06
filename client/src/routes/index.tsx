import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';
import { Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/dashboard-layout';

/**
 * Every page is code-split.
 *
 * The whole app used to ship as one 1.66MB chunk, so the LOGIN page downloaded
 * Recharts and framer-motion before it could render a password field. The audience
 * is students on Indian mobile data; that is the difference between usable and not.
 *
 * Login/signup are lazy too — they are tiny, and keeping them out of the initial
 * chunk means the shell loads before anything else is parsed.
 */

// Auth
const LoginPage = lazy(() => import('@/pages/login'));
const SignupPage = lazy(() => import('@/pages/signup'));
const ForgotPasswordPage = lazy(() => import('@/pages/forgot-password'));
const ResetPasswordPage = lazy(() => import('@/pages/reset-password'));
const LandingPage = lazy(() => import('@/pages/landing'));
const PricingPage = lazy(() => import('@/pages/pricing'));
const NotFoundPage = lazy(() => import('@/pages/not-found'));
const PrivacyPage = lazy(() => import('@/pages/legal').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('@/pages/legal').then((m) => ({ default: m.TermsPage })));

// App
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const ProfilePage = lazy(() => import('@/pages/profile'));
const RankPredictorPage = lazy(() => import('@/pages/rank-predictor'));
const CounsellorLookupPage = lazy(() => import('@/pages/counsellor-lookup'));
const CounsellorDashboardPage = lazy(() => import('@/pages/counsellor-dashboard'));
const RankInsightsPage = lazy(() => import('@/pages/rank-insights'));
const RankInsightDetailPage = lazy(() => import('@/pages/rank-insight-detail'));
const FeeMatrixPage = lazy(() => import('@/pages/fee-matrix'));
const FeeDetailPage = lazy(() => import('@/pages/fee-detail'));
const CollegesPage = lazy(() => import('@/pages/colleges'));
const CollegeDetailPage = lazy(() => import('@/pages/college-detail'));
const DocChecklistPage = lazy(() => import('@/pages/doc-checklist'));
const AiAssistantPage = lazy(() => import('@/pages/ai-assistant'));
const AnnouncementsPage = lazy(() => import('@/pages/announcements'));
const AllotmentStatesPage = lazy(() => import('@/pages/allotment-states'));
const AllotmentDetailPage = lazy(() => import('@/pages/allotment-detail'));
const EligibilityMatcherPage = lazy(() => import('@/pages/eligibility-matcher'));
const CounsellingConditionsPage = lazy(() => import('@/pages/counselling-conditions'));
const ExplorePage = lazy(() => import('@/pages/explore'));
const AbroadUniversitiesPage = lazy(() => import('@/pages/abroad-universities'));

// Admin — a student never downloads any of this.
const AdminDashboardPage = lazy(() => import('@/pages/admin-dashboard'));
const AdminDataPage = lazy(() => import('@/pages/admin-data'));
const AdminVerificationsPage = lazy(() => import('@/pages/admin-verifications'));
const AdminStudentsPage = lazy(() => import('@/pages/admin-students'));

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );
}

/** Where a signed-in user's "home" is, by role. The one place this mapping is defined —
 * PublicRoute, RootGate and StudentDashboardRoute all redirect through it, so the three
 * destinations (student dashboard / admin dashboard / counsellor home) can't drift apart. */
function homeFor(role?: string): string {
  if (role === 'admin') return '/admin';
  if (role === 'counsellor') return '/counsellor';
  return '/dashboard';
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to={homeFor(user?.role)} replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Counsellor-only — mirrors the server's requireCounsellor being restricted to a single role
 * here (admins have their own home at /admin; StaffRoute below is the admin+counsellor gate
 * used by tools like Counsellor Lookup that both roles share). */
function CounsellorRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (user?.role !== 'counsellor') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Admins and counsellors — mirrors the server's requireCounsellor. */
function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (user?.role !== 'admin' && user?.role !== 'counsellor') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Root `/`: the public landing page for visitors, each role's home for signed-in users. */
function RootGate() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <LandingPage />;
  return <Navigate to={homeFor(user?.role)} replace />;
}

/** The student dashboard has no place in the admin or counsellor experience — send them to their own. */
function StudentDashboardRoute() {
  const { user } = useAuth();
  if (user?.role === 'admin' || user?.role === 'counsellor') return <Navigate to={homeFor(user.role)} replace />;
  return <DashboardPage />;
}

/**
 * Student-only pages — today just the document checklist. Staff have no document
 * requirement at all, so a staff account must never be able to open the upload UI,
 * not just have it hidden from their sidebar.
 */
function StudentRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (user?.role === 'admin' || user?.role === 'counsellor') return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Public marketing pages */}
      <Route path="/" element={<RootGate />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* Protected app routes — pathless layout route so `/` above stays public */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="admin/data" element={<AdminRoute><AdminDataPage /></AdminRoute>} />
        <Route path="admin/data/:collection" element={<AdminRoute><AdminDataPage /></AdminRoute>} />
        <Route path="admin/verifications" element={<AdminRoute><AdminVerificationsPage /></AdminRoute>} />
        <Route path="admin/students" element={<AdminRoute><AdminStudentsPage /></AdminRoute>} />
        <Route path="dashboard" element={<StudentDashboardRoute />} />
        <Route path="counsellor" element={<CounsellorRoute><CounsellorDashboardPage /></CounsellorRoute>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="allotment" element={<AllotmentStatesPage />} />
        <Route path="allotment/state/:state" element={<AllotmentDetailPage />} />
        <Route path="allotment/:counselling" element={<AllotmentDetailPage />} />
        <Route path="eligibility-matcher" element={<EligibilityMatcherPage />} />
        <Route path="rank-predictor" element={<RankPredictorPage />} />
        <Route path="counsellor-lookup" element={<StaffRoute><CounsellorLookupPage /></StaffRoute>} />
        <Route path="rank-insights" element={<RankInsightsPage />} />
        <Route path="rank-insights/detail" element={<RankInsightDetailPage />} />
        <Route path="fee-matrix" element={<FeeMatrixPage />} />
        <Route path="fee-matrix/:id" element={<FeeDetailPage />} />
        <Route path="colleges" element={<CollegesPage />} />
        <Route path="colleges/:id" element={<CollegeDetailPage />} />
        <Route path="counselling-conditions" element={<Navigate to="/counselling-conditions/eligibility" replace />} />
        <Route path="counselling-conditions/:section" element={<CounsellingConditionsPage />} />
        <Route path="doc-checklist" element={<StudentRoute><DocChecklistPage /></StudentRoute>} />
        <Route path="explore" element={<Navigate to="/explore/university" replace />} />
        <Route path="explore/:section" element={<ExplorePage />} />
        <Route path="abroad-universities" element={<AbroadUniversitiesPage />} />
        <Route path="ai-assistant" element={<AiAssistantPage />} />
      </Route>

      {/* Fallback — a real 404 (was a silent redirect to `/`, which hid dead links) */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}
