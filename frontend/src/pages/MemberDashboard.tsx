import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyProfile, getMyWorkouts, getMyFees } from '../api/member.api';
import { getMyMemberships, getMyAttendance } from '../api/membership.api';
import { listTrainers, createBooking, getMyBookings, updateBookingStatus } from '../api/booking.api';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notification.api';
import { changePassword } from '../api/auth.api';
import { CreditCard, Dumbbell, Calendar, Activity, ChevronRight, MapPin, Building2, BadgeCheck, Download, Users, XCircle, Clock, Bell, CalendarDays, KeyRound, UserCircle } from 'lucide-react';
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

const MemberDashboard = () => {
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile
  });

  const { data: memberships } = useQuery({
    queryKey: ['myMemberships'],
    queryFn: getMyMemberships,
    enabled: activeTab === 'overview' || activeTab === 'membership'
  });

  const { data: workouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ['myWorkouts', profile?.id],
    queryFn: () => getMyWorkouts(profile?.id),
    enabled: !!profile?.id
  });

  const { data: fees, isLoading: feesLoading } = useQuery({
    queryKey: ['myFees', profile?.id],
    queryFn: () => getMyFees(profile?.id),
    enabled: !!profile?.id
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['myAttendance'],
    queryFn: getMyAttendance,
    enabled: activeTab === 'attendance'
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['myNotifications', 'page'],
    queryFn: () => getMyNotifications({ limit: 50 }),
    enabled: activeTab === 'notifications'
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['myBookings'],
    queryFn: getMyBookings,
    enabled: activeTab === 'pt'
  });

  const { data: trainers } = useQuery({
    queryKey: ['trainers', profile?.gymId],
    queryFn: () => listTrainers(profile?.gymId),
    enabled: activeTab === 'pt' && !!profile?.gymId
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

  if (profileLoading) return (
    <div className="min-h-screen pt-32 pb-12 flex items-center justify-center bg-[var(--color-base)] dark:bg-[#0a0a0a]">
      <div className="animate-pulse text-gray-500">Loading your profile...</div>
    </div>
  );

  const currentMembership = memberships?.[0];
  const thisMonthAttendance = attendance?.records?.filter((r: any) => {
    const d = new Date(r.checkIn);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  }).length ?? 0;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'membership', label: 'My Membership', icon: Building2 },
    { key: 'attendance', label: 'Attendance', icon: CalendarDays },
    { key: 'workouts', label: 'My Workouts', icon: Dumbbell },
    { key: 'fees', label: 'Payments', icon: CreditCard },
    { key: 'pt', label: 'Book a PT', icon: Users },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'settings', label: 'Settings', icon: UserCircle },
  ];

  return (
    <div className="min-h-screen pt-20 bg-[var(--color-base)] dark:bg-[#0a0a0a] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white/50 dark:bg-[#1a1a1a]/50 backdrop-blur-xl border-r border-gray-200 dark:border-white/10 md:h-[calc(100vh-5rem)] sticky top-20 flex-shrink-0">
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
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="max-w-5xl">
            <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 border-b border-gray-200 dark:border-white/10 pb-6 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[var(--color-primary)]/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <Activity className="w-8 h-8 text-[var(--color-primary)] mb-4" />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Current Plan</h3>
                <p className="text-2xl font-extrabold dark:text-white truncate">
                  {currentMembership?.plan?.name || 'No Active Plan'}
                </p>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <CreditCard className="w-8 h-8 text-amber-500 mb-4" />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Next Payment</h3>
                <p className="text-2xl font-extrabold dark:text-white">
                  {fees?.length > 0 ? new Date(fees[0].dueDate).toLocaleDateString('en-IN') : 'N/A'}
                </p>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm relative overflow-hidden group">
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
                <div key={m.id} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-white/10">
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
                <div className="p-8 text-center bg-white dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 text-gray-500">
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

            {attendanceLoading ? <div className="p-8 text-center text-gray-400">Loading attendance...</div> : (
              <div className="space-y-3">
                {attendance?.records?.map((r: any) => (
                  <div key={r.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl border border-gray-100 dark:border-white/10 flex justify-between items-center">
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
                  <div className="p-8 text-center bg-white dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 text-gray-500">
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

            {notificationsLoading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
              <div className="space-y-3">
                {notifications?.notifications?.map((n: any) => (
                  <div key={n.id} onClick={() => markReadMutation.mutate(n.id)} className={`p-5 rounded-2xl border cursor-pointer transition-colors ${n.isRead ? 'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-white/10' : 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20'}`}>
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
                  <div className="p-8 text-center bg-white dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 text-gray-500">
                    No notifications yet.
                  </div>
                )}
              </div>
            )}
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

            {workoutsLoading ? <div className="p-8 text-center text-gray-400">Loading workouts...</div> : (
              <div className="space-y-4">
                {workouts?.map((slip: any) => (
                  <div key={slip.id} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-white/10 hover:border-[var(--color-primary)] dark:hover:border-[var(--color-primary)] transition-colors group">
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
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">{slip.exercises}</p>
                    </div>
                  </div>
                ))}
                {(!workouts || workouts.length === 0) && (
                  <div className="p-8 text-center bg-white dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 text-gray-500">
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

            {feesLoading ? <div className="p-8 text-center text-gray-400">Loading history...</div> : (
              <div className="space-y-4">
                {fees?.map((fee: any) => (
                  <div key={fee.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl border border-gray-100 dark:border-white/10 flex justify-between items-center hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                    <div>
                      <h3 className="font-extrabold text-xl dark:text-white">₹{fee.amount.toLocaleString('en-IN')}</h3>
                      <p className="text-sm font-medium text-gray-500 mt-1">Due: {new Date(fee.dueDate).toLocaleDateString('en-IN')}</p>
                      {fee.paymentMethod && <p className="text-xs text-gray-400 mt-0.5">Paid via {fee.paymentMethod}</p>}
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
                      <button onClick={() => downloadFile(`/fees/${fee.id}/receipt`, `receipt-${fee.id.slice(0, 8)}.pdf`)} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline">
                        <Download className="w-3.5 h-3.5" /> Receipt
                      </button>
                    </div>
                  </div>
                ))}
                {(!fees || fees.length === 0) && (
                  <div className="p-8 text-center bg-white dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 text-gray-500">
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
                {bookingsLoading ? <div className="text-gray-400">Loading bookings...</div> : (
                  <div className="space-y-4">
                    {bookings?.map((b: any) => (
                      <div key={b.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl border border-gray-100 dark:border-white/10">
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
                      <div className="p-8 text-center bg-white dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 text-gray-500">
                        No PT sessions booked yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
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
    <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-white/10 shadow-lg">
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

      <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-white/10">
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

      <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-white/10">
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
