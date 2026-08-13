import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyProfile, getMyWorkouts, getMyFees } from '../api/member.api';
import { getMyMemberships, getMyAttendance } from '../api/membership.api';
import { listTrainers, createBooking, getMyBookings, updateBookingStatus } from '../api/booking.api';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notification.api';
import { getMyGymNotices } from '../api/notice.api';
import { getPaymentConfig, createCheckout, verifyPayment, loadRazorpayScript } from '../api/payment.api';
import { changePassword } from '../api/auth.api';
import { getMyProgress, createProgressLog } from '../api/progress.api';
import { getMyNutritionPlans, createNutritionPlan, deleteNutritionPlan, parseNutritionMeals } from '../api/nutrition.api';
import { getClasses, bookClass } from '../api/class.api';
import { ExercisePlanView } from '../components/ExercisePlan';
import { CreditCard, Dumbbell, Calendar, Activity, ChevronRight, MapPin, Building2, BadgeCheck, Download, Users, XCircle, Clock, Bell, CalendarDays, KeyRound, UserCircle, Megaphone, ExternalLink, Loader2, TrendingUp, Salad, Trash2, Dumbbell as DumbbellIcon } from 'lucide-react';
import { Link } from 'react-router';
import { formatPrice } from '../utils/format';
import { downloadFile } from '../services/api';

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  EXPIRING_SOON: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  EXPIRED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  SUSPENDED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  CANCELLED: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};

// Lightweight inline SVG chart (no chart library installed). Renders bars with
// a trend line overlay + value dots, scaled to the tallest value in `data`.
const ActivityChart = ({ data, color }: { data: { label: string; value: number }[]; color?: string }) => {
  const W = 640, H = 180, PAD_L = 28, PAD_B = 22, TOP = 18;
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (W - PAD_L) / data.length;
  const chartColor = color || 'var(--color-primary)';
  const baseY = H - PAD_B;
  const scaleY = (v: number) => baseY - (v / max) * (H - PAD_B - TOP);
  const linePoints = data.map((d, i) => `${PAD_L + i * bw + bw / 2},${scaleY(d.value)}`).join(' ');
  const areaPoints = `${PAD_L},${baseY} ${linePoints} ${PAD_L + (data.length - 1) * bw + bw / 2},${baseY}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={PAD_L} x2={W - 8} y1={baseY - f * (H - PAD_B - TOP)} y2={baseY - f * (H - PAD_B - TOP)} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
      ))}
      <polygon points={areaPoints} fill={chartColor} opacity="0.08" />
      <polyline points={linePoints} fill="none" stroke={chartColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = PAD_L + i * bw + bw / 2;
        return d.value > 0 ? <circle key={i} cx={x} cy={scaleY(d.value)} r="3.5" fill={chartColor} /> : null;
      })}
      {data.map((d, i) => (
        <text key={i} x={PAD_L + i * bw + bw / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6">{d.label}</text>
      ))}
      <text x={W - 8} y={TOP} textAnchor="end" fontSize="12" fontWeight="bold" fill={chartColor}>{max}</text>
    </svg>
  );
};

const MemberDashboard = () => {
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
    refetchInterval: 30000
  });

  const { data: memberships } = useQuery({
    queryKey: ['myMemberships'],
    queryFn: getMyMemberships,
    enabled: activeTab === 'overview' || activeTab === 'membership',
    refetchInterval: 30000
  });

  const { data: workouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ['myWorkouts', profile?.id],
    queryFn: () => getMyWorkouts(profile?.id),
    enabled: !!profile?.id,
    refetchInterval: 60000
  });

  const { data: fees, isLoading: feesLoading } = useQuery({
    queryKey: ['myFees', profile?.id],
    queryFn: () => getMyFees(profile?.id),
    enabled: !!profile?.id,
    refetchInterval: 30000
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['myAttendance'],
    queryFn: getMyAttendance,
    enabled: activeTab === 'overview' || activeTab === 'attendance',
    refetchInterval: 30000
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['myNotifications', 'page'],
    queryFn: () => getMyNotifications({ limit: 50 }),
    enabled: activeTab === 'notifications',
    refetchInterval: 30000
  });

  const { data: notices, isLoading: noticesLoading } = useQuery({
    queryKey: ['myGymNotices'],
    queryFn: getMyGymNotices,
    enabled: activeTab === 'overview',
    refetchInterval: 60000
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['myBookings'],
    queryFn: getMyBookings,
    enabled: activeTab === 'pt',
    refetchInterval: 30000
  });

  const { data: trainers } = useQuery({
    queryKey: ['trainers', profile?.gymId],
    queryFn: () => listTrainers(profile?.gymId),
    enabled: activeTab === 'pt' && !!profile?.gymId,
    refetchInterval: 60000
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => updateBookingStatus(id, 'CANCELLED'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myBookings'] })
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myNotifications'] })
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myNotifications'] })
  });

  const { data: payConfig, isLoading: payConfigLoading } = useQuery({
    queryKey: ['paymentConfig'],
    queryFn: getPaymentConfig,
    enabled: activeTab === 'fees',
    refetchInterval: 60000
  });

  const [payingFeeId, setPayingFeeId] = useState<string | null>(null);

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['myProgress'],
    queryFn: getMyProgress,
    enabled: activeTab === 'progress',
    refetchInterval: 30000
  });

  const { data: nutritionPlans, isLoading: nutritionLoading } = useQuery({
    queryKey: ['myNutritionPlans'],
    queryFn: getMyNutritionPlans,
    enabled: activeTab === 'nutrition',
    refetchInterval: 60000
  });

  // ---------- Group Classes ----------
  const { data: gymClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['memberClasses', profile?.gymId],
    queryFn: () => getClasses(profile?.gymId),
    enabled: !!profile?.gymId && activeTab === 'classes',
    refetchInterval: 60000
  });

  const bookClassMutation = useMutation({
    mutationFn: (classId: string) => bookClass(classId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memberClasses'] })
  });

  const addProgressMutation = useMutation({
    mutationFn: createProgressLog,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myProgress'] })
  });

  const deleteNutritionMutation = useMutation({
    mutationFn: deleteNutritionPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myNutritionPlans'] })
  });

  const payNow = async (fee: any) => {
    if (payingFeeId) return;
    setPayingFeeId(fee.id);
    try {
      const checkout = await createCheckout(fee.id);
      await loadRazorpayScript();
      if (!window.Razorpay) throw new Error('Payment gateway unavailable');
      const rzp = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'Vajra Fitness',
        description: `Fee payment · ${formatPrice(fee.amount)}`,
        order_id: checkout.orderId,
        handler: async (response) => {
          try {
            await verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            queryClient.invalidateQueries({ queryKey: ['myFees', profile?.id] });
            queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
            queryClient.invalidateQueries({ queryKey: ['myNotifications'] });
          } catch {
            // Errors are surfaced by the global API interceptor.
          }
        },
      });
      rzp.open();
    } catch {
      // Errors (e.g. ONLINE_PAYMENTS_DISABLED) are surfaced by the interceptor.
    } finally {
      setPayingFeeId(null);
    }
  };

  if (profileLoading) return (
    <div className="min-h-screen pt-32 pb-12 flex items-center justify-center bg-[var(--color-base)] dark:bg-[var(--color-base)]">
      <div className="animate-pulse text-gray-500">Loading your profile...</div>
    </div>
  );

  const currentMembership = memberships?.[0];
  const thisMonthAttendance = attendance?.records?.filter((r: any) => {
    const d = new Date(r.checkIn);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  }).length ?? 0;

  // Nearest upcoming/unpaid fee (fees arrive ordered dueDate desc, so scan all).
  const nextFee = fees?.filter((f: any) => f.status !== 'PAID' && new Date(f.dueDate) >= new Date())
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  // Daily check-in series for the last N days (for the activity chart).
  const dailyAttendance = (days: number) => {
    const buckets: { label: string; value: number }[] = [];
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
    const localKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const recs = (attendance?.records ?? []) as { checkIn: string }[];
    const counts = new Map<string, number>();
    for (const r of recs) counts.set(localKey(new Date(r.checkIn)), (counts.get(localKey(new Date(r.checkIn))) || 0) + 1);
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      buckets.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: counts.get(localKey(d)) || 0 });
    }
    return buckets;
  };

  // Workout slips assigned per month, last 6 months (for the workout chart).
  const monthlyWorkouts = () => {
    const months: { label: string; value: number }[] = [];
    const now = new Date();
    const recs = (workouts ?? []) as { assignedDate: string }[];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const count = recs.filter((w) => {
        const ad = new Date(w.assignedDate);
        return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
      }).length;
      months.push({ label: d.toLocaleDateString('en-IN', { month: 'short' }), value: count });
    }
    return months;
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'membership', label: 'My Membership', icon: Building2 },
    { key: 'attendance', label: 'Attendance', icon: CalendarDays },
    { key: 'workouts', label: 'My Workouts', icon: Dumbbell },
    { key: 'progress', label: 'My Progress', icon: TrendingUp },
    { key: 'nutrition', label: 'Nutrition', icon: Salad },
    { key: 'fees', label: 'Payments', icon: CreditCard },
    { key: 'pt', label: 'Book a PT', icon: Users },
    { key: 'classes', label: 'Group Classes', icon: DumbbellIcon },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'settings', label: 'Settings', icon: UserCircle },
  ];

  return (
    <div className="min-h-screen pt-20 bg-[var(--color-base)] dark:bg-[var(--color-base)] flex flex-col md:flex-row">
      <div className="md:hidden sticky top-20 z-20 border-y border-[var(--color-border)] bg-[var(--color-base)]/95 px-4 py-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-[var(--color-deepgray)] dark:text-white">{user?.username}</p>
            <p className="text-xs font-semibold text-[var(--color-primary)]">{profile?.gym?.name || 'Member dashboard'}</p>
          </div>
          <span className="text-xs font-bold text-[var(--color-muted)]">Menu</span>
        </div>
        <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Member dashboard sections">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${activeTab === key ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-charcoal)] dark:text-white border border-[var(--color-border)]'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </div>
      {/* Sidebar */}
      <aside className="hidden w-full md:block md:w-64 bg-[var(--color-surface)]/50 backdrop-blur-xl border-r border-[var(--color-border)] md:h-[calc(100vh-5rem)] sticky top-20 flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white font-bold text-xl">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-[var(--color-deepgray)] dark:text-white truncate">{user?.username}</p>
              <p className="text-xs text-[var(--color-primary)] font-semibold">{profile?.status}</p>
            </div>
          </div>

          <nav className="space-y-2">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === key ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                <Icon className="w-5 h-5" /> {label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="max-w-5xl">
            <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 border-b border-[var(--color-border)] pb-6 gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-2">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Home Gym: <span className="font-bold text-[var(--color-primary)]">{profile?.gym?.name}</span>
                </p>
              </div>
              {currentMembership && (
                <span className={`inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${statusStyles[currentMembership.lifecycleStatus]}`}>
                  <span className="w-2 h-2 rounded-full bg-current" /> {currentMembership.lifecycleStatus}
                </span>
              )}
            </div>

            {/* Membership summary */}
            <div className="card-hover p-8 mb-10 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-52 h-52 bg-[var(--color-primary)]/10 rounded-full blur-2xl" />
              <div className="flex flex-col md:flex-row md:items-center gap-6 relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white flex items-center justify-center shrink-0 shadow-lg shadow-[var(--color-primary)]/25">
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-1">My Gym Membership</p>
                  <h2 className="text-2xl font-extrabold text-[var(--color-deepgray)] dark:text-white">{profile?.gym?.name}</h2>
                  <p className="flex items-center gap-1.5 text-sm text-[var(--color-muted)] mt-1">
                    <MapPin className="w-4 h-4" /> {profile?.gym?.location || `${profile?.gym?.city}, ${profile?.gym?.state}`}
                    <span className="text-[var(--color-border-strong)] mx-1">·</span>
                    <BadgeCheck className="w-4 h-4 text-green-500" /> {currentMembership?.plan?.name || profile?.membershipPlan?.name || 'No plan selected'}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 md:text-right">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Plan Fee</p>
                    <p className="font-extrabold text-[var(--color-primary)]">
                      {currentMembership ? formatPrice(currentMembership.finalAmount) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Valid Till</p>
                    <p className="font-extrabold text-[var(--color-deepgray)] dark:text-white">
                      {currentMembership ? new Date(currentMembership.endDate).toLocaleDateString('en-IN') : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Joined</p>
                    <p className="font-extrabold text-[var(--color-deepgray)] dark:text-white">
                      {new Date(profile.joiningDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-6 relative">
                <button onClick={() => setActiveTab('membership')} className="text-sm font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1.5">
                  View membership details <ChevronRight className="w-4 h-4" />
                </button>
                <Link to="/membership" className="text-sm font-semibold text-[var(--color-muted)] hover:underline inline-flex items-center gap-1.5">
                  Browse other gyms <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
              <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[var(--color-primary)]/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <Activity className="w-8 h-8 text-[var(--color-primary)] mb-4" />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Current Plan</h3>
                <p className="text-2xl font-extrabold dark:text-white truncate">
                  {currentMembership?.plan?.name || 'No Active Plan'}
                </p>
              </div>

              <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <CreditCard className="w-8 h-8 text-amber-500 mb-4" />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Next Payment</h3>
                <p className="text-2xl font-extrabold dark:text-white">
                  {nextFee ? new Date(nextFee.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                </p>
              </div>

              <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <CalendarDays className="w-8 h-8 text-emerald-500 mb-4" />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">This Month</h3>
                <p className="text-2xl font-extrabold dark:text-white">
                  {attendance ? `${thisMonthAttendance} visits` : '—'}
                </p>
              </div>

              <div className="bg-[var(--color-primary)] p-6 rounded-2xl border border-[var(--color-primary)] shadow-sm relative overflow-hidden group text-white flex flex-col justify-center cursor-pointer hover:bg-[var(--color-accent)] transition-colors" onClick={() => setActiveTab('pt')}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Book a PT</h3>
                  <ChevronRight className="w-6 h-6 opacity-70 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-white/70 text-sm mt-2">Get personalized training sessions</p>
              </div>
            </div>

            {/* Activity chart */}
            <div className="mt-8 bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold dark:text-white">Gym Visits — Last 14 Days</h2>
                    <p className="text-xs text-gray-500">Check-ins per day at your gym</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('attendance')} className="text-sm font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1.5">
                  View full history <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {attendanceLoading ? (
                <div className="h-40 flex items-center justify-center text-[var(--color-muted)]">Loading activity…</div>
              ) : (attendance?.records?.length ?? 0) === 0 ? (
                <div className="h-40 flex items-center justify-center text-[var(--color-muted)]">No check-ins yet — head to your gym and check in!</div>
              ) : (
                <div className="text-gray-800 dark:text-gray-200">
                  <ActivityChart data={dailyAttendance(14)} color="var(--color-primary)" />
                </div>
              )}
            </div>

            {/* Announcements */}
            <div className="mt-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold dark:text-white">Announcements</h2>
              </div>
              {noticesLoading ? (
                <div className="p-8 text-center text-[var(--color-muted)] bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">Loading announcements...</div>
              ) : notices && notices.length > 0 ? (
                <div className="space-y-3">
                  {notices.map((n: any) => (
                    <div key={n.id} className="bg-[var(--color-surface)] p-5 rounded-2xl border border-[var(--color-border)]">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold dark:text-white">{n.title}</h3>
                        <span className="text-xs text-gray-400 shrink-0">{new Date(n.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 whitespace-pre-wrap">{n.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-muted)]">
                  No announcements from your gym right now.
                </div>
              )}
            </div>
          </div>
        )}

        {/* MEMBERSHIP TAB */}
        {activeTab === 'membership' && (
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold dark:text-white">My Memberships</h2>
            </div>

            <div className="space-y-4">
              {memberships?.map((m: any) => (
                <div key={m.id} className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg dark:text-white">{m.plan?.name || 'Membership'}</h3>
                        {m.isRenewal && <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-md">RENEWAL</span>}
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${statusStyles[m.lifecycleStatus]}`}>
                          {m.lifecycleStatus}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        {new Date(m.startDate).toLocaleDateString('en-IN')} → {new Date(m.endDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-extrabold text-[var(--color-primary)]">{formatPrice(m.finalAmount)}</p>
                      {m.discount > 0 && <p className="text-xs text-gray-500">Original: {formatPrice(m.originalAmount)} · Discount: {formatPrice(m.discount)}</p>}
                      <p className="text-xs font-semibold text-gray-400 mt-1 uppercase">{m.paymentStatus}</p>
                    </div>
                  </div>
                  {(m.paymentMethod || m.transactionId) && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-sm text-gray-600 dark:text-gray-300">
                      {m.paymentMethod && <span className="mr-4">Method: <b>{m.paymentMethod}</b></span>}
                      {m.transactionId && <span>Transaction: <b className="font-mono">{m.transactionId}</b></span>}
                    </div>
                  )}
                </div>
              ))}
              {(!memberships || memberships.length === 0) && (
                <div className="p-8 text-center bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-muted)]">
                  No membership records yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold dark:text-white">My Attendance</h2>
              <span className="ml-auto text-sm font-semibold text-gray-500">Total visits: {attendance?.total ?? 0}</span>
            </div>

            {attendanceLoading ? <div className="p-8 text-center text-[var(--color-muted)]">Loading attendance...</div> : (
              <div className="space-y-3">
                {attendance?.records?.map((r: any) => (
                  <div key={r.id} className="bg-[var(--color-surface)] p-5 rounded-2xl border border-[var(--color-border)] flex justify-between items-center">
                    <div>
                      <p className="font-bold dark:text-white">{new Date(r.checkIn).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      <p className="text-xs text-gray-500">Checked in at {new Date(r.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      {r.status}
                    </span>
                  </div>
                ))}
                {(!attendance?.records || attendance.records.length === 0) && (
                  <div className="p-8 text-center bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-muted)]">
                    No attendance records yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold dark:text-white">Notifications</h2>
              </div>
              <button onClick={() => markAllMutation.mutate()} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
                Mark all read
              </button>
            </div>

            {notificationsLoading ? <div className="p-8 text-center text-[var(--color-muted)]">Loading...</div> : (
              <div className="space-y-3">
                {notifications?.notifications?.map((n: any) => (
                  <div key={n.id} onClick={() => markReadMutation.mutate(n.id)} className={`p-5 rounded-2xl border cursor-pointer transition-colors ${n.isRead ? 'bg-[var(--color-surface)] border-[var(--color-border)]' : 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20'}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-bold dark:text-white flex items-center gap-2">
                        {n.title}
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />}
                      </p>
                      <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{n.message}</p>
                  </div>
                ))}
                {(!notifications?.notifications || notifications.notifications.length === 0) && (
                  <div className="p-8 text-center bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-muted)]">
                    No notifications yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PROGRESS TAB */}
        {activeTab === 'progress' && (
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold dark:text-white">My Progress</h2>
            </div>

            {progressLoading ? <div className="p-8 text-center text-[var(--color-muted)]">Loading progress...</div> : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
                  <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Latest Weight</p>
                    <p className="text-2xl font-extrabold dark:text-white">{progress?.latest ? `${progress.latest.weight} kg` : '—'}</p>
                  </div>
                  <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">BMI</p>
                    <p className="text-2xl font-extrabold dark:text-white">{progress?.bmi ?? '—'}</p>
                  </div>
                  <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Weight Change</p>
                    <p className={`text-2xl font-extrabold ${(progress?.weightChange ?? 0) > 0 ? 'text-red-500' : (progress?.weightChange ?? 0) < 0 ? 'text-green-500' : 'dark:text-white'}`}>
                      {progress?.weightChange != null ? `${progress.weightChange > 0 ? '+' : ''}${progress.weightChange} kg` : '—'}
                    </p>
                  </div>
                  <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Log Entries</p>
                    <p className="text-2xl font-extrabold dark:text-white">{progress?.entries ?? 0}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ProgressLogForm onSubmit={(data) => addProgressMutation.mutate(data)} />

                  <div>
                    <h3 className="text-xl font-bold dark:text-white mb-4">History</h3>
                    {progress?.logs && progress.logs.length > 0 ? (
                      <div className="space-y-3">
                        {progress.logs.map((log) => (
                          <div key={log.id} className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border)] flex justify-between items-center">
                            <div>
                              <p className="font-bold dark:text-white">{new Date(log.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {log.bodyFat != null && `Body fat: ${log.bodyFat}% · `}
                                {log.height != null && `Height: ${log.height} cm`}
                              </p>
                            </div>
                            <span className="text-lg font-extrabold text-[var(--color-primary)]">{log.weight} kg</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-muted)]">
                        No progress entries yet. Add your first weight log.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* NUTRITION TAB */}
        {activeTab === 'nutrition' && (
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Salad className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold dark:text-white">Nutrition Plans</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <NutritionPlanForm onCreated={() => queryClient.invalidateQueries({ queryKey: ['myNutritionPlans'] })} />

              <div>
                <h3 className="text-xl font-bold dark:text-white mb-4">My Plans</h3>
                {nutritionLoading ? <div className="text-[var(--color-muted)]">Loading plans...</div> : nutritionPlans && nutritionPlans.length > 0 ? (
                  <div className="space-y-4">
                    {nutritionPlans.map((plan) => {
                      const meals = parseNutritionMeals(plan.meals);
                      return (
                        <div key={plan.id} className="bg-[var(--color-surface)] p-5 rounded-2xl border border-[var(--color-border)]">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <h4 className="font-bold dark:text-white">{plan.title}</h4>
                              {plan.calories && <p className="text-sm text-gray-500 mt-0.5">{plan.calories} kcal / day</p>}
                            </div>
                            <button
                              onClick={() => deleteNutritionMutation.mutate(plan.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              aria-label={`Delete ${plan.title}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {meals.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                              {meals.map((meal, i) => (
                                <div key={i} className="flex gap-2 text-sm">
                                  <span className="font-bold text-[var(--color-primary)] shrink-0">{meal.label}</span>
                                  <span className="text-gray-600 dark:text-gray-300">{meal.items}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-muted)]">
                    No nutrition plans yet. Create one to track your daily meals.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <SettingsTab />
        )}

        {activeTab === 'workouts' && (
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                <Dumbbell className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold dark:text-white">My Workout Slips</h2>
            </div>

            <div className="mb-8 bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold dark:text-white">Workout Plans — Last 6 Months</h3>
                  <p className="text-xs text-gray-500">Plans assigned to you each month</p>
                </div>
              </div>
              <div className="text-gray-800 dark:text-gray-200">
                <ActivityChart data={monthlyWorkouts()} color="var(--color-accent)" />
              </div>
            </div>

            {workoutsLoading ? <div className="p-8 text-center text-[var(--color-muted)]">Loading workouts...</div> : (
              <div className="space-y-4">
                {workouts?.map((slip: any) => (
                  <div key={slip.id} className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] dark:hover:border-[var(--color-primary)] transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg dark:text-white">{slip.title || 'Workout Plan'}</h3>
                        <span className="text-xs font-semibold text-gray-500">Assigned by: {slip.trainer?.user?.username || 'Gym Admin'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2.5 py-1 rounded-md">Active</span>
                        <button onClick={() => downloadFile(`/workouts/${slip.id}/pdf`, `workout-${slip.id.slice(0, 8)}.pdf`)} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                      <ExercisePlanView exercises={slip.exercises} />
                    </div>
                  </div>
                ))}
                {(!workouts || workouts.length === 0) && (
                  <div className="p-8 text-center bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-muted)]">
                    No workouts assigned yet. Ask your trainer!
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'fees' && (
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold dark:text-white">Payment History</h2>
            </div>

            {payConfigLoading ? (
              <div className="p-4 mb-6 bg-gray-50 dark:bg-white/5 border border-[var(--color-border)] rounded-xl text-sm text-gray-400 animate-pulse">Checking payment options…</div>
            ) : !payConfig?.enabled ? (
              <div className="p-4 mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl text-sm text-amber-700 dark:text-amber-400">
                Online payments aren't configured yet — contact your gym front desk to pay. Receipts are available here once paid.
              </div>
            ) : (
              <div className="p-4 mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 rounded-xl text-sm text-green-700 dark:text-green-400">
                Pay any pending fee securely online with Razorpay — UPI, cards, and net banking supported.
              </div>
            )}

            {profile?.preferredPaymentMethod && (
              <div className="p-4 mb-6 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 rounded-xl text-sm text-[var(--color-charcoal)] dark:text-gray-300 flex items-start gap-2.5">
                <CreditCard className="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
                <span>
                  You chose to pay{' '}
                  <b>
                    {profile.preferredPaymentMethod === 'CASH'
                      ? 'at the gym (COD)'
                      : profile.preferredPaymentMethod === 'UPI'
                        ? 'via UPI'
                        : profile.preferredPaymentMethod === 'CARD'
                          ? 'via card'
                          : profile.preferredPaymentMethod}
                  </b>
                  {profile.preferredPaymentMethod === 'CASH'
                    ? ' — settle your fee at the front desk once your membership is approved.'
                    : ' — a secure online payment link will be available here once your membership is approved.'}
                </span>
              </div>
            )}

            {feesLoading ? <div className="p-8 text-center text-[var(--color-muted)]">Loading history...</div> : (
              <div className="space-y-4">
                {fees?.map((fee: any) => (
                  <div key={fee.id} className="bg-[var(--color-surface)] p-5 rounded-2xl border border-[var(--color-border)] flex justify-between items-center hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                    <div>
                      <h3 className="font-extrabold text-xl dark:text-white">₹{fee.amount.toLocaleString('en-IN')}</h3>
                      <p className="text-sm font-medium text-gray-500 mt-1">Due: {new Date(fee.dueDate).toLocaleDateString('en-IN')}</p>
                      {fee.paymentMethod && <p className="text-xs text-gray-400 mt-0.5">Paid via {fee.paymentMethod === 'ONLINE' ? 'Razorpay' : fee.paymentMethod}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase ${
                        fee.status === 'PAID' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        fee.status === 'OVERDUE' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        fee.status === 'PARTIAL' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      }`}>
                        {fee.status}
                      </span>
                      {fee.status !== 'PAID' && payConfig?.enabled && (
                        <button
                          onClick={() => payNow(fee)}
                          disabled={payingFeeId !== null}
                          className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 px-3 py-1.5 rounded-lg"
                        >
                          {payingFeeId === fee.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                          {payingFeeId === fee.id ? 'Starting…' : 'Pay Online'}
                        </button>
                      )}
                      <button onClick={() => downloadFile(`/fees/${fee.id}/receipt`, `receipt-${fee.id.slice(0, 8)}.pdf`)} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline">
                        <Download className="w-3.5 h-3.5" /> Receipt
                      </button>
                    </div>
                  </div>
                ))}
                {(!fees || fees.length === 0) && (
                  <div className="p-8 text-center bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-muted)]">
                    No payment history found.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pt' && (
          <div className="max-w-6xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold dark:text-white">Personal Training</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <PTBookingForm trainers={trainers || []} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['myBookings'] })} />
              </div>

              <div>
                <h3 className="text-xl font-bold dark:text-white mb-4">My Bookings</h3>
                {bookingsLoading ? <div className="text-[var(--color-muted)]">Loading bookings...</div> : (
                  <div className="space-y-4">
                    {bookings?.map((b: any) => (
                      <div key={b.id} className="bg-[var(--color-surface)] p-5 rounded-2xl border border-[var(--color-border)]">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold dark:text-white">Trainer: {b.trainer?.username}</h4>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <Calendar className="w-4 h-4" /> {b.date} <Clock className="w-4 h-4 ml-2" /> {b.time}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            b.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            b.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                            b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>{b.status}</span>
                        </div>
                        {b.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-white/5 p-2 rounded">Notes: {b.notes}</p>}

                        {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                          <div className="mt-4 flex justify-end">
                            <button
                              onClick={() => cancelMutation.mutate(b.id)}
                              disabled={cancelMutation.isPending}
                              className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                            >
                              <XCircle className="w-4 h-4" /> Cancel Session
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {(!bookings || bookings.length === 0) && (
                      <div className="p-8 text-center bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-muted)]">
                        No PT sessions booked yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="max-w-6xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                <DumbbellIcon className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold dark:text-white">Group Classes</h2>
            </div>

            {classesLoading ? (
              <div className="text-[var(--color-muted)]">Loading classes...</div>
            ) : gymClasses.length === 0 ? (
              <div className="p-8 text-center bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-muted)]">
                No group classes available at your gym yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gymClasses.map((cls: any) => (
                  <div key={cls.id} className="bg-[var(--color-surface)] p-5 rounded-2xl border border-[var(--color-border)]">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg dark:text-white">{cls.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${cls.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {cls.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {cls.description && <p className="text-sm text-gray-500 mb-3">{cls.description}</p>}
                    <div className="space-y-2 text-sm mb-4">
                      {cls.dayOfWeek && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><CalendarDays className="w-4 h-4" /> {cls.dayOfWeek}</p>}
                      {cls.startTime && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Clock className="w-4 h-4" /> {cls.startTime} - {cls.endTime}</p>}
                      <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><DumbbellIcon className="w-4 h-4" /> {cls.duration} minutes</p>
                      {cls.trainer && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Users className="w-4 h-4" /> Trainer: {cls.trainer.user.username}</p>}
                      <p className="text-xs font-bold text-[var(--color-primary)]">{cls._count?.bookings || 0} / {cls.capacity} booked</p>
                    </div>
                    {cls.isActive && (
                      <button
                        onClick={() => bookClassMutation.mutate(cls.id)}
                        disabled={bookClassMutation.isPending || (cls._count?.bookings || 0) >= cls.capacity}
                        className="btn-primary w-full py-2 text-sm"
                      >
                        {bookClassMutation.isPending ? 'Booking...' : (cls._count?.bookings || 0) >= cls.capacity ? 'Class Full' : 'Book Class'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const PTBookingForm = ({ trainers, onSuccess }: { trainers: any[], onSuccess: () => void }) => {
  const [formData, setFormData] = useState({ trainerId: '', date: '', time: '', notes: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await createBooking(formData);
      setSuccess('Booking created successfully!');
      setFormData({ trainerId: '', date: '', time: '', notes: '' });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-lg">
      <h3 className="text-xl font-bold dark:text-white mb-4">Book a Session</h3>
      {error && <div className="text-red-500 mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded">{error}</div>}
      {success && <div className="text-green-500 mb-4 bg-green-50 dark:bg-green-900/20 p-3 rounded">{success}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Trainer</label>
          <select
            required
            className="input-field"
            value={formData.trainerId}
            onChange={(e) => setFormData({...formData, trainerId: e.target.value})}
          >
            <option value="">-- Choose a Trainer --</option>
            {trainers.map((t: any) => (
              <option key={t.user.id} value={t.user.id}>{t.user.username} {t.specialization ? `(${t.specialization})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input type="date" required className="input-field" min={new Date().toISOString().split('T')[0]} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
            <input type="time" required className="input-field" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
          <textarea className="input-field" rows={2} placeholder="Focus areas, injuries..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}></textarea>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
          {loading ? 'Booking...' : 'Confirm Booking'}
        </button>
      </div>
    </form>
  );
};

const ProgressLogForm = ({ onSubmit }: { onSubmit: (data: { weight: number; height?: number | null; bodyFat?: number | null }) => void }) => {
  const [form, setForm] = useState({ weight: '', height: '', bodyFat: '' });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(form.weight);
    if (!weight || weight <= 0) {
      setError('Enter a valid weight in kg.');
      return;
    }
    setError('');
    onSubmit({
      weight,
      height: form.height ? parseFloat(form.height) : null,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : null,
    });
    setForm({ weight: '', height: '', bodyFat: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-lg self-start">
      <h3 className="text-xl font-bold dark:text-white mb-1">Log Your Progress</h3>
      <p className="text-sm text-gray-500 mb-4">Track weight, height and body fat over time.</p>
      {error && <div className="text-red-500 mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weight (kg)</label>
          <input type="number" step="0.1" min="1" required className="input-field" placeholder="e.g. 72.5" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Height (cm)</label>
            <input type="number" step="0.1" min="1" className="input-field" placeholder="e.g. 175" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body Fat (%)</label>
            <input type="number" step="0.1" min="1" className="input-field" placeholder="e.g. 18" value={form.bodyFat} onChange={(e) => setForm({ ...form, bodyFat: e.target.value })} />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full">
          Save Entry
        </button>
      </div>
    </form>
  );
};

const NutritionPlanForm = ({ onCreated }: { onCreated: () => void }) => {
  const [form, setForm] = useState({ title: '', calories: '', meals: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.title.trim().length < 2) {
      setError('Plan title must be at least 2 characters.');
      return;
    }
    setLoading(true);
    try {
      const meals = form.meals
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [label, ...items] = line.split(':');
          return { label: (label || 'Meal').trim(), items: items.join(':').trim() };
        });
      await createNutritionPlan({
        title: form.title.trim(),
        calories: form.calories ? parseInt(form.calories, 10) : null,
        meals: JSON.stringify(meals),
      });
      setSuccess('Nutrition plan created!');
      setForm({ title: '', calories: '', meals: '' });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create nutrition plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-lg self-start">
      <h3 className="text-xl font-bold dark:text-white mb-1">Create a Nutrition Plan</h3>
      <p className="text-sm text-gray-500 mb-4">Write each meal on its own line, e.g. <code className="text-xs">Breakfast: Oats + eggs</code></p>
      {error && <div className="text-red-500 mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm">{error}</div>}
      {success && <div className="text-green-500 mb-4 bg-green-50 dark:bg-green-900/20 p-3 rounded text-sm">{success}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan Title</label>
          <input type="text" required className="input-field" placeholder="e.g. Lean Muscle Diet" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Calories (optional)</label>
          <input type="number" min="1" className="input-field" placeholder="e.g. 2200" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meals (one per line)</label>
          <textarea className="input-field" rows={4} placeholder={'Breakfast: Oats, eggs, banana\nLunch: Rice, dal, veggies\nDinner: Grilled chicken, salad'} value={form.meals} onChange={(e) => setForm({ ...form, meals: e.target.value })} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Saving...' : 'Create Plan'}
        </button>
      </div>
    </form>
  );
};

const SettingsTab = () => {
  const user = useAuthStore(state => state.user);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      setSuccess('Password changed successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
          <UserCircle className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold dark:text-white">Account Settings</h2>
      </div>

      <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
        <h3 className="font-bold dark:text-white mb-4">Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 uppercase tracking-wider text-xs font-bold mb-1">Username</p>
            <p className="font-semibold dark:text-white">{user?.username}</p>
          </div>
          <div>
            <p className="text-gray-400 uppercase tracking-wider text-xs font-bold mb-1">Email</p>
            <p className="font-semibold dark:text-white">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
        <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2"><KeyRound className="w-4 h-4" /> Change Password</h3>
        {error && <div className="text-red-500 mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm">{error}</div>}
        {success && <div className="text-green-500 mb-4 bg-green-50 dark:bg-green-900/20 p-3 rounded text-sm">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
            <input type="password" required className="input-field" value={form.currentPassword} onChange={(e) => setForm({...form, currentPassword: e.target.value})} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <input type="password" required className="input-field" value={form.newPassword} onChange={(e) => setForm({...form, newPassword: e.target.value})} placeholder="At least 8 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
              <input type="password" required className="input-field" value={form.confirmPassword} onChange={(e) => setForm({...form, confirmPassword: e.target.value})} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MemberDashboard;
