import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import MainLayout from './layouts/MainLayout';
import { useAuthStore } from './store/useAuthStore';
import { NotificationManager } from './components/NotificationManager';

import HomePage from './pages/HomePage';

import ScrollToTop from './components/ScrollToTop';
import { PageLoader } from './components/PageLoader';

// Route-based code splitting: every non-entry page loads on demand, shrinking
// the initial bundle and first-paint cost.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ActivateAccountPage = lazy(() => import('./pages/ActivateAccountPage'));
const VendorRegisterPage = lazy(() => import('./pages/VendorRegisterPage'));
const MemberRegisterPage = lazy(() => import('./pages/MemberRegisterPage'));
const GymsPage = lazy(() => import('./pages/GymsPage'));
const MembershipPage = lazy(() => import('./pages/MembershipPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const RefundPage = lazy(() => import('./pages/RefundPage'));
const CookiesPage = lazy(() => import('./pages/CookiesPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const GymAdminDashboard = lazy(() => import('./pages/GymAdminDashboard'));
const MemberDashboard = lazy(() => import('./pages/MemberDashboard'));
const TrainerDashboard = lazy(() => import('./pages/TrainerDashboard'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));

type Role = 'SUPER_ADMIN' | 'GYM_ADMIN' | 'MEMBER' | 'TRAINER' | 'STAFF';

const ProtectedRoute = ({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: Role[];
}) => {
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  if (!bootstrapped) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role as Role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Dynamic Dashboard Wrapper
const DashboardRouter = () => {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'TRAINER') return <TrainerDashboard />;
  if (user?.role === 'STAFF') return <StaffDashboard />;
  return <MemberDashboard />;
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <NotificationManager />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="gyms" element={<GymsPage />} />
            <Route path="membership" element={<MembershipPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="help" element={<HelpCenterPage />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="refund" element={<RefundPage />} />
            <Route path="cookies" element={<CookiesPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="activate" element={<ActivateAccountPage />} />
            <Route path="register" element={<VendorRegisterPage />} />
            <Route path="register/member" element={<MemberRegisterPage />} />

            <Route
              path="admin/super"
              element={
                <ProtectedRoute roles={['SUPER_ADMIN']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/gym"
              element={
                <ProtectedRoute roles={['GYM_ADMIN']}>
                  <GymAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute roles={['MEMBER', 'TRAINER', 'STAFF']}>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
