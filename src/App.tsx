import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

// Layouts
import { PublicLayout, DashboardLayout } from '@/components/layout';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import AuthProvider from '@/components/shared/AuthProvider';

// Public Pages
import HomePage from '@/pages/public/HomePage';
import AboutPage from '@/pages/public/AboutPage';
import ThemePage from '@/pages/public/ThemePage';
import EditionsPage from '@/pages/public/EditionsPage';
import WinnersPage from '@/pages/public/WinnersPage';
import ContactPage from '@/pages/public/ContactPage';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';

// User Pages
import UserDashboard from '@/pages/user/UserDashboard';
import UserSubmissions from '@/pages/user/UserSubmissions';
import NewSubmission from '@/pages/user/NewSubmission';
import SubmissionDetail from '@/pages/user/SubmissionDetail';
import ProfilePage from '@/pages/user/ProfilePage';
import CertificatesPage from '@/pages/user/CertificatesPage';
import NotificationsPage from '@/pages/user/NotificationsPage';

// Jury Pages
import JuryDashboard from '@/pages/jury/JuryDashboard';
import JuryReview from '@/pages/jury/JuryReview';
import JuryRanking from '@/pages/jury/JuryRanking';

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminEditions from '@/pages/admin/AdminEditions';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminSubmissions from '@/pages/admin/AdminSubmissions';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminJury from '@/pages/admin/AdminJury';
import AdminPayments from '@/pages/admin/AdminPayments';
import AdminResults from '@/pages/admin/AdminResults';
import AdminContent from '@/pages/admin/AdminContent';
import AdminPartners from '@/pages/admin/AdminPartners';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const paypalOptions = {
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test',
  currency: 'EUR',
  intent: 'capture' as const,
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PayPalScriptProvider options={paypalOptions}>
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/theme" element={<ThemePage />} />
              <Route path="/editions" element={<EditionsPage />} />
              <Route path="/winners" element={<WinnersPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Route>

            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* User Dashboard Routes */}
            <Route
              element={
                <ProtectedRoute roles={['user', 'admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/dashboard/submissions" element={<UserSubmissions />} />
              <Route path="/dashboard/submissions/new" element={<NewSubmission />} />
              <Route path="/dashboard/submissions/:id" element={<SubmissionDetail />} />
              <Route path="/dashboard/profile" element={<ProfilePage />} />
              <Route path="/dashboard/certificates" element={<CertificatesPage />} />
              <Route path="/dashboard/notifications" element={<NotificationsPage />} />
            </Route>

            {/* Jury Routes */}
            <Route
              element={
                <ProtectedRoute roles={['jury', 'admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/jury" element={<JuryDashboard />} />
              <Route path="/jury/review" element={<JuryReview />} />
              <Route path="/jury/ranking" element={<JuryRanking />} />
            </Route>

            {/* Admin Routes */}
            <Route
              element={
                <ProtectedRoute roles={['admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/editions" element={<AdminEditions />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/submissions" element={<AdminSubmissions />} />
              <Route path="/admin/submissions/:id" element={<SubmissionDetail />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/jury" element={<AdminJury />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/results" element={<AdminResults />} />
              <Route path="/admin/content" element={<AdminContent />} />
              <Route path="/admin/partners" element={<AdminPartners />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1a2e',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
            },
            success: {
              iconTheme: { primary: '#e63946', secondary: '#fff' },
            },
          }}
        />
        </AuthProvider>
      </PayPalScriptProvider>
    </QueryClientProvider>
  );
}
