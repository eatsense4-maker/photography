import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

// Layouts
import { PublicLayout, DashboardLayout } from '@/components/layout';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import AuthProvider from '@/components/shared/AuthProvider';

// Lazy-loaded pages
const HomePage = lazy(() => import('@/pages/public/HomePage'));
const AboutPage = lazy(() => import('@/pages/public/AboutPage'));
const ApplyPage = lazy(() => import('@/pages/public/ApplyPage'));
const CategoryDetailPage = lazy(() => import('@/pages/public/CategoryDetailPage'));
const EditionsPage = lazy(() => import('@/pages/public/EditionsPage'));
const WinnersPage = lazy(() => import('@/pages/public/WinnersPage'));
const GalleryPage = lazy(() => import('@/pages/public/GalleryPage'));
const EditionGalleryPage = lazy(() => import('@/pages/public/EditionGalleryPage'));
const ContactPage = lazy(() => import('@/pages/public/ContactPage'));
const CuratorsPage = lazy(() => import('@/pages/public/CuratorsPage'));
const CuratorDetailPage = lazy(() => import('@/pages/public/CuratorDetailPage'));

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const AuthCallback = lazy(() => import('@/pages/auth/AuthCallback'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));

const UserDashboard = lazy(() => import('@/pages/user/UserDashboard'));
const UserSubmissions = lazy(() => import('@/pages/user/UserSubmissions'));
const NewSubmission = lazy(() => import('@/pages/user/NewSubmission'));

const SubmissionDetail = lazy(() => import('@/pages/user/SubmissionDetail'));
const ProfilePage = lazy(() => import('@/pages/user/ProfilePage'));
const CertificatesPage = lazy(() => import('@/pages/user/CertificatesPage'));
const NotificationsPage = lazy(() => import('@/pages/user/NotificationsPage'));

const JuryDashboard = lazy(() => import('@/pages/jury/JuryDashboard'));
const JuryReview = lazy(() => import('@/pages/jury/JuryReview'));
const JuryRanking = lazy(() => import('@/pages/jury/JuryRanking'));

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminEditions = lazy(() => import('@/pages/admin/AdminEditions'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'));
const AdminSubmissions = lazy(() => import('@/pages/admin/AdminSubmissions'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminJury = lazy(() => import('@/pages/admin/AdminJury'));
const AdminPayments = lazy(() => import('@/pages/admin/AdminPayments'));
const AdminResults = lazy(() => import('@/pages/admin/AdminResults'));
const AdminLiveScoring = lazy(() => import('@/pages/admin/AdminLiveScoring'));
const AdminContent = lazy(() => import('@/pages/admin/AdminContent'));
const AdminPartners = lazy(() => import('@/pages/admin/AdminPartners'));
const AdminPosts = lazy(() => import('@/pages/admin/AdminPosts'));
const AdminPricingTiers = lazy(() => import('@/pages/admin/AdminPricingTiers'));
const PostDetailPage = lazy(() => import('@/pages/public/PostDetailPage'));
const NewsArchivePage = lazy(() => import('@/pages/public/NewsArchivePage'));
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          }>
          <ErrorBoundary>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/apply" element={<ApplyPage />} />
              <Route path="/apply/:categorySlug" element={<CategoryDetailPage />} />
              <Route path="/theme" element={<Navigate to="/apply" replace />} />
              <Route path="/editions" element={<EditionsPage />} />
              <Route path="/winners" element={<WinnersPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/gallery/:year" element={<EditionGalleryPage />} />
              <Route path="/news" element={<NewsArchivePage />} />
              <Route path="/news/:slug" element={<PostDetailPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/curators" element={<CuratorsPage />} />
              <Route path="/curators/:curatorSlug" element={<CuratorDetailPage />} />
            </Route>

            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

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
              <Route path="/dashboard/checkout" element={<Navigate to="/dashboard/submissions/new" replace />} />
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
              <Route path="/admin/live-scoring" element={<AdminLiveScoring />} />
              <Route path="/admin/content" element={<AdminContent />} />
              <Route path="/admin/partners" element={<AdminPartners />} />
              <Route path="/admin/posts" element={<AdminPosts />} />
              <Route path="/admin/pricing" element={<AdminPricingTiers />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </ErrorBoundary>
          </Suspense>
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
    </QueryClientProvider>
  );
}
