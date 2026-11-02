import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import MainLayout from './layouts/MainLayout';
import { useAuthStore } from './store/useAuthStore';
import { NotificationManager } from './components/NotificationManager';

import HomePage from './pages/HomePage';

import ScrollToTop from './components/ScrollToTop';
import { PageLoader } from './components/PageLoader';
import { dashboardFor, loginPageFor } from './utils/routes';

// Route-based code splitting: every non-entry page loads on demand, shrinking
// the initial bundle and first-paint cost.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ActivateAccountPage = lazy(() => import('./pages/ActivateAccountPage'));
const VendorRegisterPage = lazy(() => import('./pages/VendorRegisterPage'));
const PartnerLoginPage = lazy(() => import('./pages/auth/PartnerLoginPage'));
const TrainerLoginPage = lazy(() => import('./pages/auth/TrainerLoginPage'));
const TrainerRegisterPage = lazy(() => import('./pages/auth/TrainerRegisterPage'));
const AdminLoginPage = lazy(() => import('./pages/auth/AdminLoginPage'));
const RegisterChooserPage = lazy(() => import('./pages/auth/RegisterChooserPage'));
const MemberRegisterPage = lazy(() => import('./pages/MemberRegisterPage'));
const GymsPage = lazy(() => import('./pages/GymsPage'));
const PublicGymSitePage = lazy(() => import('./pages/PublicGymSitePage'));
const GymOverviewPage = lazy(() => import('./pages/gym-site/GymOverviewPage'));
const GymPlansPage = lazy(() => import('./pages/gym-site/GymPlansPage'));
const GymTrainersPage = lazy(() => import('./pages/gym-site/GymTrainersPage'));
const GymGalleryPage = lazy(() => import('./pages/gym-site/GymGalleryPage'));
const GymContactPage = lazy(() => import('./pages/gym-site/GymContactPage'));
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
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const OwnerLayout = lazy(() => import('./layouts/OwnerLayout'));
const MemberLayout = lazy(() => import('./layouts/MemberLayout'));
const TrainerLayout = lazy(() => import('./layouts/TrainerLayout'));

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
  const location = useLocation();
  if (!bootstrapped) return <PageLoader />;
  if (!user) {
    const back = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${loginPageFor(roles[0])}?redirect=${back}`} replace />;
  }
  // Signed in with another role (old links, shared bookmarks): send them to their own console.
  if (!roles.includes(user.role as Role)) return <Navigate to={dashboardFor(user.role)} replace />;
  return <>{children}</>;
};

// Old /admin-login links can carry ?redirect=, so keep the query string.
const AdminLoginRedirect = () => {
  const { search } = useLocation();
  return <Navigate to={`/admin/login${search}`} replace />;
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <NotificationManager />
      {import.meta.env.PROD && typeof window !== 'undefined' && !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname) && <>
        <Analytics />
        <SpeedInsights />
      </>}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="gyms" element={<GymsPage />} />
            <Route path="gyms/:gymId" element={<PublicGymSitePage />}>
              <Route index element={<GymOverviewPage />} />
              <Route path="plans" element={<GymPlansPage />} />
              <Route path="trainers" element={<GymTrainersPage />} />
              <Route path="gallery" element={<GymGalleryPage />} />
              <Route path="contact" element={<GymContactPage />} />
            </Route>
            <Route path="g/:slug" element={<PublicGymSitePage />}>
              <Route index element={<GymOverviewPage />} />
              <Route path="plans" element={<GymPlansPage />} />
              <Route path="trainers" element={<GymTrainersPage />} />
              <Route path="gallery" element={<GymGalleryPage />} />
              <Route path="contact" element={<GymContactPage />} />
            </Route>
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
            <Route path="accept-invite" element={<AcceptInvitePage />} />
            <Route path="activate" element={<ActivateAccountPage />} />
            <Route path="register/member" element={<MemberRegisterPage />} />
            <Route path="partner/login" element={<PartnerLoginPage />} />
            <Route path="partner/register" element={<VendorRegisterPage />} />
            <Route path="trainer/login" element={<TrainerLoginPage />} />
            <Route path="trainer/register" element={<TrainerRegisterPage />} />
            <Route path="admin/login" element={<AdminLoginPage />} />
            <Route path="admin-login" element={<AdminLoginRedirect />} />
            <Route path="register" element={<RegisterChooserPage />} />
            <Route path="register/vendor" element={<Navigate to="/partner/register" replace />} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Consoles: every page is its own URL. The layout maps the URL to the section the page body shows. */}
          <Route path="admin" element={<ProtectedRoute roles={['SUPER_ADMIN']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<SuperAdminDashboard />} />
            <Route path=":section" element={<SuperAdminDashboard />} />
          </Route>
          <Route path="owner" element={<ProtectedRoute roles={['GYM_ADMIN']}><OwnerLayout /></ProtectedRoute>}>
            <Route index element={<GymAdminDashboard />} />
            <Route path=":section" element={<GymAdminDashboard />} />
          </Route>
          <Route path="trainer" element={<ProtectedRoute roles={['TRAINER']}><TrainerLayout /></ProtectedRoute>}>
            <Route index element={<TrainerDashboard />} />
            <Route path=":section" element={<TrainerDashboard />} />
          </Route>
          <Route element={<ProtectedRoute roles={['MEMBER']}><MemberLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<MemberDashboard />} />
            <Route path="dashboard/:section" element={<MemberDashboard />} />
            <Route path="bookings" element={<MemberDashboard />} />
            <Route path="profile" element={<MemberDashboard />} />
            <Route path="notifications" element={<MemberDashboard />} />
          </Route>
          <Route path="staff" element={<ProtectedRoute roles={['STAFF']}><StaffDashboard /></ProtectedRoute>} />

          {/* Old console URLs, still used by notification links. */}
          <Route path="admin/super" element={<Navigate to="/admin" replace />} />
          <Route path="admin/gym" element={<Navigate to="/owner" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
