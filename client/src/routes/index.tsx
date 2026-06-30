import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';
import { Loader2 } from 'lucide-react';

// Auth pages
import LoginPage from '@/pages/login';
import SignupPage from '@/pages/signup';
import ForgotPasswordPage from '@/pages/forgot-password';
import ResetPasswordPage from '@/pages/reset-password';

// App pages
import DashboardPage from '@/pages/dashboard';
import RankInsightsPage from '@/pages/rank-insights';
import RankInsightDetailPage from '@/pages/rank-insight-detail';
import FeeMatrixPage from '@/pages/fee-matrix';
import FeeDetailPage from '@/pages/fee-detail';
import CollegesPage from '@/pages/colleges';
import CollegeDetailPage from '@/pages/college-detail';
import DocChecklistPage from '@/pages/doc-checklist';
import AiAssistantPage from '@/pages/ai-assistant';
import AnnouncementsPage from '@/pages/announcements';
import AllotmentStatesPage from '@/pages/allotment-states';
import AllotmentDetailPage from '@/pages/allotment-detail';
import DashboardLayout from '@/components/layout/dashboard-layout';

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Loader2 className="w-8 h-8 animate-spin text-red-600" />
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
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected app routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="allotment" element={<AllotmentStatesPage />} />
        <Route path="allotment/:counselling" element={<AllotmentDetailPage />} />
        <Route path="rank-insights" element={<RankInsightsPage />} />
        <Route path="rank-insights/detail" element={<RankInsightDetailPage />} />
        <Route path="fee-matrix" element={<FeeMatrixPage />} />
        <Route path="fee-matrix/:id" element={<FeeDetailPage />} />
        <Route path="colleges" element={<CollegesPage />} />
        <Route path="colleges/:id" element={<CollegeDetailPage />} />
        <Route path="doc-checklist" element={<DocChecklistPage />} />
        <Route path="ai-assistant" element={<AiAssistantPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
