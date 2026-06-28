import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';
import { Spinner } from '@/components/ui/spinner';

// Pages
import LoginPage from '@/pages/login';
import VerifyOtpPage from '@/pages/verify-otp';
import DashboardPage from '@/pages/dashboard';
import NotificationsPage from '@/pages/notifications';
import NotificationDetailsPage from '@/pages/notification-details';
import AdminNotificationPage from '@/pages/admin-notification';
import CutoffAnalysisPage from '@/pages/cutoff-analysis';
import RankInsightsPage from '@/pages/rank-insights';
import RankInsightDetailPage from '@/pages/rank-insight-detail';
import FeeMatrixPage from '@/pages/fee-matrix';
import FeeDetailPage from '@/pages/fee-detail';
import DocumentsPage from '@/pages/documents';
import CollegesPage from '@/pages/colleges';
import CollegeDetailPage from '@/pages/college-detail';
import RulesPage from '@/pages/rules';
import AiChatPage from '@/pages/ai-chat';
import ProfilePage from '@/pages/profile';
import DashboardLayout from '@/components/layout/dashboard-layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner fullPage />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner fullPage />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/verify-otp"
        element={
          <PublicRoute>
            <VerifyOtpPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
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
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="notifications/:id" element={<NotificationDetailsPage />} />
        <Route path="notifications/new" element={<AdminNotificationPage />} />
        <Route path="notifications/edit/:id" element={<AdminNotificationPage />} />
        <Route path="cutoffs" element={<CutoffAnalysisPage />} />
        <Route path="rank-insights" element={<RankInsightsPage />} />
        <Route path="rank-insights/detail" element={<RankInsightDetailPage />} />
        <Route path="fee-matrix" element={<FeeMatrixPage />} />
        <Route path="fee-matrix/:id" element={<FeeDetailPage />} />
        <Route path="colleges" element={<CollegesPage />} />
        <Route path="colleges/:id" element={<CollegeDetailPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="ai-chat" element={<AiChatPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
