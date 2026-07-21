import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { ToastProvider } from '@/providers/toast-provider';
import AppRoutes from '@/routes';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
