import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import MainLayout from './layouts/MainLayout';
import { useAuthStore } from './store/useAuthStore';
import { NotificationManager } from './components/NotificationManager';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ActivateAccountPage from './pages/ActivateAccountPage';
import VendorRegisterPage from './pages/VendorRegisterPage';
import MemberRegisterPage from './pages/MemberRegisterPage';
import GymsPage from './pages/GymsPage';
import MembershipPage from './pages/MembershipPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import TermsPage from './pages/TermsPage';
import ContactPage from './pages/ContactPage';
import HelpCenterPage from './pages/HelpCenterPage';
import PrivacyPage from './pages/PrivacyPage';
import RefundPage from './pages/RefundPage';
import NotFoundPage from './pages/NotFoundPage';

import ScrollToTop from './components/ScrollToTop';
import { FloatingActions } from './components/FloatingActions';

// Code splitting for authenticated heavy dashboards
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
      <FloatingActions />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--color-base)] dark:bg-[#0a0a0a]"><div className="animate-pulse text-[var(--color-primary)] font-bold text-lg">Loading...</div></div>}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="gyms" element={<GymsPage />} />
            <Route path="membership" element={<MembershipPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="help" element={<HelpCenterPage />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="refund" element={<RefundPage />} />
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
