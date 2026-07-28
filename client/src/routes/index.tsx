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
const PrivacyPage = lazy(() => import('@/pages/legal').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('@/pages/legal').then((m) => ({ default: m.TermsPage })));

// App
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const ProfilePage = lazy(() => import('@/pages/profile'));
const RankPredictorPage = lazy(() => import('@/pages/rank-predictor'));
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Root `/`: the public landing page for visitors, the app dashboard for signed-in users (admin dashboard for admins). */
function RootGate() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <LandingPage />;
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

/** The student dashboard has no place in the admin experience — send admins to their own. */
function StudentDashboardRoute() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <DashboardPage />;
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
        <Route path="profile" element={<ProfilePage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="allotment" element={<AllotmentStatesPage />} />
        <Route path="allotment/state/:state" element={<AllotmentDetailPage />} />
        <Route path="allotment/:counselling" element={<AllotmentDetailPage />} />
        <Route path="eligibility-matcher" element={<EligibilityMatcherPage />} />
        <Route path="rank-predictor" element={<RankPredictorPage />} />
        <Route path="rank-insights" element={<RankInsightsPage />} />
        <Route path="rank-insights/detail" element={<RankInsightDetailPage />} />
        <Route path="fee-matrix" element={<FeeMatrixPage />} />
        <Route path="fee-matrix/:id" element={<FeeDetailPage />} />
        <Route path="colleges" element={<CollegesPage />} />
        <Route path="colleges/:id" element={<CollegeDetailPage />} />
        <Route path="counselling-conditions" element={<Navigate to="/counselling-conditions/eligibility" replace />} />
        <Route path="counselling-conditions/:section" element={<CounsellingConditionsPage />} />
        <Route path="doc-checklist" element={<DocChecklistPage />} />
        <Route path="explore" element={<Navigate to="/explore/university" replace />} />
        <Route path="explore/:section" element={<ExplorePage />} />
        <Route path="abroad-universities" element={<AbroadUniversitiesPage />} />
        <Route path="ai-assistant" element={<AiAssistantPage />} />
      </Route>

      {/* Fallback — unknown paths go to the landing (which forwards authed users to /dashboard) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
