import { useQuery } from '@tanstack/react-query';
import { TrendingDown, TrendingUp, Users, PieChart, Activity, CreditCard, ArrowUpRight, ArrowDownRight, Award } from 'lucide-react';
import { getGymAnalytics, getTrainerPerformance, type TrainerPerformance } from '../../api/reports.api';
import { LineChart, BarChart, AreaChart, DonutChart, HeatmapChart } from '../../components/charts';
import { useGym } from './GymContext';

export default function AnalyticsPanel() {
  const { gym: branch } = useGym();
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['gymAnalytics', branch?.id],
    queryFn: () => getGymAnalytics(branch?.id),
    enabled: !!branch?.id,
    refetchInterval: 60000,
  });

  const { data: trainerPerformance = [], isLoading: trainerPerformanceLoading } = useQuery<TrainerPerformance[]>({
    queryKey: ['trainerPerformance', branch?.id],
    queryFn: () => getTrainerPerformance(branch?.id),
    enabled: !!branch?.id,
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-8">
      {analyticsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-surface-sunken rounded-card animate-pulse" />)}
        </div>
      ) : analytics ? (
        <>
          {/* Churn / Retention KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: 'Monthly Churn Rate',
                value: `${((analytics.churnTrend[analytics.churnTrend.length - 1]?.churnRate ?? 0) * 100).toFixed(1)}%`,
                color: 'text-danger-ink',
              },
              {
                label: 'Retention Rate (6mo)',
                value: `${(analytics.retentionRate * 100).toFixed(1)}%`,
                color: 'text-success-ink',
              },
              {
                label: 'Revenue Per Member',
                value: `₹${analytics.revenuePerMember.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                color: 'text-accent-ink',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-surface rounded-card p-6 border border-line">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">{label}</p>
                <p className={`text-3xl font-extrabold tabular-nums ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Churn Trend */}
          <div className="bg-surface rounded-card border border-line p-6">
            <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-danger-ink" />
              Churn trend (last 6 months)
            </h3>
            <div className="h-72">
              <LineChart
                series={[
                  { name: 'Churn Rate %', data: analytics.churnTrend.map(d => ({ label: d.month, value: Math.round(d.churnRate * 1000) / 10 })) },
                ]}
                config={{ height: 280 }}
              />
            </div>
          </div>

          {/* Cohort Retention */}
          <div className="bg-surface rounded-card border border-line p-6">
            <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-ink" />
              Cohort retention
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">Cohort</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">Size</th>
                    {[0, 1, 2, 3, 4, 5].map((m) => (
                      <th key={m} className="text-left px-4 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">M{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {analytics.cohortRetention.map((c) => (
                    <tr key={c.cohortMonth}>
                      <td className="px-4 py-3 font-semibold text-ink">{c.cohortMonth}</td>
                      <td className="px-4 py-3 text-ink-muted">{c.cohortSize}</td>
                      {c.retention.map((r, i) => (
                        <td key={i} className="px-4 py-3 text-ink-muted">{r === null ? '-' : `${(r * 100).toFixed(0)}%`}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue Trend */}
          <div className="bg-surface rounded-card border border-line p-6">
            <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent-ink" />
              Revenue trend (last 6 months)
            </h3>
            <div className="h-72">
              <LineChart
                series={[
                  { name: 'Revenue', data: analytics.monthlyRevenueTrend.map(d => ({ label: d.month, value: d.total })) },
                ]}
                config={{ height: 280, showArea: true }}
              />
            </div>
          </div>

          {/* Member Growth */}
          <div className="bg-surface rounded-card border border-line p-6">
            <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-success-ink" />
              Member growth (last 6 months)
            </h3>
            <div className="h-72">
              <AreaChart
                series={[
                  { name: 'Total Members', data: analytics.memberGrowth.map(d => ({ label: d.month, value: d.totalMembers })) },
                ]}
                config={{ height: 280, showArea: true }}
              />
            </div>
          </div>

          {/* Membership plan distribution */}
          <div className="bg-surface rounded-card border border-line p-6">
            <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-ink" />
              Membership plan distribution
            </h3>
            <div className="h-72 flex items-center justify-center">
              <DonutChart
                data={analytics.planDistribution.map(p => ({ label: p.name, value: p.members }))}
                config={{ width: 300, height: 300 }}
              />
            </div>
          </div>

          {/* Attendance Trend */}
          <div className="bg-surface rounded-card border border-line p-6">
            <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-info-ink" />
              Daily attendance (last 30 days)
            </h3>
            <div className="h-72">
              <BarChart
                series={[
                  { name: 'Check-ins', data: analytics.attendanceTrend.map(d => ({ label: d.date, value: d.checkIns })) },
                ]}
                config={{ height: 280 }}
              />
            </div>
          </div>

          {/* Peak Hours Heatmap */}
          <div className="bg-surface rounded-card border border-line p-6">
            <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-warning-ink" />
              Peak hours (last 30 days)
            </h3>
            <div className="h-96">
              <HeatmapChart
                data={analytics.heatmapData}
                config={{ width: 700, height: 350 }}
              />
            </div>
          </div>

          {/* Payment Status & Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface rounded-card border border-line p-6">
              <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-success-ink" />
                Payment status (last 30 days)
              </h3>
              <div className="h-72">
                <DonutChart
                  data={analytics.paymentStatus.map(p => ({ label: p.status, value: p.amount }))}
                  config={{ width: 300, height: 300 }}
                />
              </div>
            </div>

            <div className="bg-surface rounded-card border border-line p-6">
              <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-warning-ink" />
                Payment methods (last 30 days)
              </h3>
              <div className="h-72">
                <DonutChart
                  data={analytics.paymentMethods.map(p => ({ label: p.method, value: p.amount }))}
                  config={{ width: 300, height: 300 }}
                />
              </div>
            </div>
          </div>

          {/* Member Status */}
          <div className="bg-surface rounded-card border border-line p-6">
            <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-info-ink" />
              Member status breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {analytics.memberStatus.map(m => (
                <div key={m.status} className="bg-surface-sunken rounded-control p-4 text-center">
                  <p className="text-2xl font-extrabold text-accent-ink">{m.count}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mt-1">{m.status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Members & Expiring/Overdue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface rounded-card border border-line p-6">
              <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-success-ink" />
                Top members by attendance
              </h3>
              {analytics.topMembers.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topMembers.map((m, i) => (
                    <div key={m.name} className="flex items-center justify-between p-3 bg-surface-sunken rounded-control">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center font-bold text-sm">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-semibold">{m.name}</p>
                          <p className="text-xs text-ink-muted">{m.email}</p>
                        </div>
                      </div>
                      <span className="text-lg font-extrabold tabular-nums text-accent-ink">{m.checkIns}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink-muted text-center py-8">No attendance data yet</p>
              )}
            </div>

            <div className="bg-surface rounded-card border border-line p-6">
              <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-warning-ink" />
                Expiring memberships and overdue fees
              </h3>
              <div className="space-y-4">
                {analytics.expiringSoon.length > 0 ? (
                  <>
                    <h4 className="text-sm font-bold text-warning-ink mb-2">Expiring soon</h4>
                    {analytics.expiringSoon.slice(0, 5).map(e => (
                      <div key={e.member} className="p-3 bg-warning-soft rounded-control">
                        <p className="font-semibold">{e.member}</p>
                        <p className="text-xs text-ink-muted">{e.plan} · {e.daysLeft} days left</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-success-ink text-sm mb-4">No expiring memberships</p>
                )}
                {analytics.overdueFees.length > 0 ? (
                  <>
                    <h4 className="text-sm font-bold text-danger-ink mb-2 mt-4">Overdue fees</h4>
                    {analytics.overdueFees.slice(0, 5).map(f => (
                      <div key={f.member} className="p-3 bg-danger-soft rounded-control">
                        <p className="font-semibold">{f.member}</p>
                        <p className="text-xs text-ink-muted tabular-nums">₹{f.amount.toLocaleString('en-IN')} · Due {f.dueDate}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-success-ink text-sm">No overdue fees</p>
                )}
              </div>
            </div>
          </div>

          {/* Trainer performance */}
          <div className="bg-surface rounded-card border border-line overflow-hidden">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <h3 className="font-bold text-ink flex items-center gap-2">
                <Award className="w-5 h-5 text-warning-ink" />
                Trainer performance
              </h3>
            </div>
            {trainerPerformanceLoading ? (
              <div className="p-8 text-center text-ink-muted">Loading…</div>
            ) : trainerPerformance.length === 0 ? (
              <div className="p-8 text-center text-ink-muted">No trainers yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-sunken">
                    <tr>
                      {['Trainer', 'Bookings', 'Completion', 'Cancellation', 'Members Served', 'Slips Assigned', 'Classes Taught'].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {trainerPerformance.map((t) => (
                      <tr key={t.trainerId} className="hover:bg-surface-sunken transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-ink">{t.name}</p>
                          <p className="text-xs text-ink-muted">{t.email} · {t.specialization || 'Trainer'}</p>
                        </td>
                        <td className="px-6 py-4 text-ink-muted">
                          {t.bookings.total} total
                          <p className="text-xs text-ink-muted mt-0.5">
                            {t.bookings.byStatus.PENDING ?? 0} pending · {t.bookings.byStatus.CONFIRMED ?? 0} confirmed · {t.bookings.byStatus.COMPLETED ?? 0} done · {t.bookings.byStatus.CANCELLED ?? 0} cancelled
                          </p>
                        </td>
                        <td className="px-6 py-4 font-semibold text-success-ink">{(t.bookings.completionRate * 100).toFixed(0)}%</td>
                        <td className="px-6 py-4 font-semibold text-danger-ink">{(t.bookings.cancellationRate * 100).toFixed(0)}%</td>
                        <td className="px-6 py-4 text-ink-muted">{t.bookings.distinctMembers}</td>
                        <td className="px-6 py-4 text-ink-muted">{t.workoutSlips.assigned} <span className="text-xs text-ink-muted">({t.workoutSlips.distinctMembers} members)</span></td>
                        <td className="px-6 py-4 text-ink-muted">{t.classesTaught}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-ink-muted">No analytics data available</div>
      )}
    </div>
  );
}
