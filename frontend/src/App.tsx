import React, { Component, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import { useAuthStore, type Role } from './store/useAuthStore';
import { NotificationManager } from './components/NotificationManager';
import CookieConsent from './components/CookieConsent';
import ScrollToTop from './components/ScrollToTop';
import { PageLoader } from './components/PageLoader';
import { Button } from './components/ui';

import HomePage from './pages/HomePage';

// Route-based code splitting: every non-entry page loads on demand.
const AboutPage = lazy(() => import('./pages/AboutPage'));
const GymsPage = lazy(() => import('./pages/GymsPage'));
const GymDetailPage = lazy(() => import('./pages/GymDetailPage'));
const ToolsPage = lazy(() => import('./pages/tools/ToolsPage'));
const BmiPage = lazy(() => import('./pages/tools/BmiPage'));
const CaloriePage = lazy(() => import('./pages/tools/CaloriePage'));
const OneRepMaxPage = lazy(() => import('./pages/tools/OneRepMaxPage'));
const ProteinPage = lazy(() => import('./pages/tools/ProteinPage'));
const MembershipPage = lazy(() => import('./pages/MembershipPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const RefundPage = lazy(() => import('./pages/RefundPage'));
const CookiesPage = lazy(() => import('./pages/CookiesPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterChooserPage = lazy(() => import('./pages/auth/RegisterChooserPage'));
const MemberRegisterPage = lazy(() => import('./pages/auth/MemberRegisterPage'));
const TrainerRegisterPage = lazy(() => import('./pages/auth/TrainerRegisterPage'));
const PartnerRegisterPage = lazy(() => import('./pages/auth/PartnerRegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const ActivateAccountPage = lazy(() => import('./pages/auth/ActivateAccountPage'));

const GymAdminArea = lazy(() => import('./pages/gymadmin/index'));
const SuperAdminArea = lazy(() => import('./pages/superadmin/index'));
const DashboardArea = lazy(() => import('./pages/dashboard/index'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'GYM_ADMIN', 'MEMBER', 'TRAINER', 'STAFF'];

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles: Role[] }) => {
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const location = useLocation();
  if (!bootstrapped) return <PageLoader />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Mostly catches a stale lazy chunk after a deploy; a reload fetches the new one.
class ErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
        <p className="text-ink-muted">Reload the page to try again.</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    );
  }
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <NotificationManager />
      <CookieConsent />
      <Analytics />
      <SpeedInsights />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="gyms" element={<GymsPage />} />
              <Route path="gyms/:gymId" element={<GymDetailPage />} />
              <Route path="tools" element={<ToolsPage />} />
              <Route path="tools/bmi-calculator" element={<BmiPage />} />
              <Route path="tools/calorie-calculator" element={<CaloriePage />} />
              <Route path="tools/one-rep-max-calculator" element={<OneRepMaxPage />} />
              <Route path="tools/protein-calculator" element={<ProteinPage />} />
              <Route path="membership" element={<MembershipPage />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="help" element={<HelpCenterPage />} />
              <Route path="faq" element={<FAQPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="refund" element={<RefundPage />} />
              <Route path="cookies" element={<CookiesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterChooserPage />} />
              <Route path="register/member" element={<MemberRegisterPage />} />
              <Route path="register/trainer" element={<TrainerRegisterPage />} />
              <Route path="register/partner" element={<PartnerRegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="activate" element={<ActivateAccountPage />} />
            </Route>

            <Route path="admin/gym/*" element={<ProtectedRoute roles={['GYM_ADMIN']}><GymAdminArea /></ProtectedRoute>} />
            <Route path="admin/super/*" element={<ProtectedRoute roles={['SUPER_ADMIN']}><SuperAdminArea /></ProtectedRoute>} />
            <Route path="dashboard/*" element={<ProtectedRoute roles={['MEMBER', 'TRAINER', 'STAFF']}><DashboardArea /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute roles={ALL_ROLES}><ProfilePage /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
