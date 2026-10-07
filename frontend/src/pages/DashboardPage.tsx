import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  FileText,
  MapPin,
  Receipt,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { dashboardApi, expensesApi, invoicesApi } from '../services/resources';
import { Spinner, StatsCard, cn } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { formatMoney } from '../utils/helpers';

export function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await dashboardApi.stats()).data.data!,
  });

  const { data: invoiceSummary } = useQuery({
    queryKey: ['invoices-summary'],
    queryFn: async () => (await invoicesApi.summary()).data.data!,
  });

  const { data: expenseSummary } = useQuery({
    queryKey: ['expenses-summary'],
    queryFn: async () => (await expensesApi.summary()).data.data!,
  });

  const todayLabel = useMemo(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${weekday}, ${day} ${month} ${year}`;
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'Krishna';
  const initial = (user?.name || 'Krishna').slice(0, 1).toUpperCase();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-4.5">
      {/* 1. Top Header Welcome Banner */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100/90 text-teal-800 font-bold text-lg shadow-2xs">
            {initial}
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Here's what's happening with your facility management today.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 sm:border-0 sm:pt-0">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar size={13} className="text-slate-500" />
            <span>{todayLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200/70 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </div>
        </div>
      </div>

      {/* 2. Top Row Metrics: Total Clients, Total Sites, Total Employees, Today's Attendance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <StatsCard
          to="/clients"
          label="Total Clients"
          value={data?.totalClients ?? 5}
          tone="teal"
          iconTone="amber"
          icon={<Building2 size={16} />}
          hint="+ 12% from last month"
        />

        <StatsCard
          to="/sites"
          label="Total Sites"
          value={data?.totalSites ?? 5}
          tone="sky"
          iconTone="sky"
          icon={<MapPin size={16} />}
          hint="+ 8% from last month"
        />

        <StatsCard
          to="/employees"
          label="Total Employees"
          value={data?.totalEmployees ?? 11}
          tone="indigo"
          iconTone="indigo"
          icon={<Users size={16} />}
          hint="+ 3 new this month"
        />

        <StatsCard
          to="/attendance"
          label="Today's Attendance"
          value={data?.todaysAttendance ?? 9}
          tone="emerald"
          iconTone="amber"
          icon={<ClipboardCheck size={16} />}
          hint="+ 82% present"
        />
      </div>

      {/* 3. Second Row: Pending Quotations, Pending Invoices & Monthly Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {/* Pending Quotations */}
        <StatsCard
          to="/quotations"
          label="Pending Quotations"
          value={data?.pendingQuotations ?? 3}
          tone="amber"
          iconTone="rose"
          icon={<FileText size={16} />}
          hint="2 awaiting approval"
        />

        {/* Pending Invoices */}
        <StatsCard
          to="/invoices"
          label="Pending Invoices"
          value={data?.pendingInvoices ?? 3}
          tone="rose"
          iconTone="indigo"
          icon={<Receipt size={16} />}
          hint={
            invoiceSummary?.pendingAmount
              ? `₹ ${Number(invoiceSummary.pendingAmount).toLocaleString('en-IN')} pending`
              : '₹ 15,500 pending'
          }
        />

        {/* Monthly Expenses (spans 2 columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs sm:text-sm font-bold text-slate-800">Monthly Expenses</span>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-2xs">
              <span>This Month</span>
              <ChevronDown size={12} className="text-slate-400" />
            </div>
          </div>

          {/* Body: Value, Chart Bars, View Report */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
            {/* Value */}
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                  {expenseSummary?.totalAmount ? formatMoney(expenseSummary.totalAmount) : '₹ 46,950'}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">Total Outflow</p>
            </div>

            {/* Mini 6-bar Chart Graphic matching the reference design */}
            <div className="flex items-end gap-2.5 sm:gap-3 py-1">
              {[
                { label: 'Jan', h: '38%', color: 'from-teal-300 to-teal-400' },
                { label: 'Feb', h: '50%', color: 'from-teal-400 to-cyan-400' },
                { label: 'Mar', h: '62%', color: 'from-cyan-400 to-sky-400' },
                { label: 'Apr', h: '76%', color: 'from-sky-400 to-blue-400' },
                { label: 'May', h: '88%', color: 'from-blue-400 to-blue-500' },
                { label: 'Jun', h: '100%', color: 'from-blue-500 to-blue-600' },
              ].map((bar) => (
                <div key={bar.label} className="flex flex-col items-center gap-1">
                  <div className="w-3.5 sm:w-4 h-11 sm:h-12 bg-slate-100/90 rounded-md overflow-hidden flex items-end">
                    <div
                      className={cn(
                        'w-full rounded-md transition-all duration-300 bg-gradient-to-t',
                        bar.color,
                      )}
                      style={{ height: bar.h }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{bar.label}</span>
                </div>
              ))}
            </div>

            {/* View Report Button */}
            <Link to="/reports" className="shrink-0">
              <button
                type="button"
                className="rounded-xl border border-blue-200/80 bg-blue-50/70 px-3.5 py-1.5 text-xs font-semibold text-blue-600 shadow-2xs hover:bg-blue-100 hover:text-blue-700 transition cursor-pointer"
              >
                View Report
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Quick Actions Row */}
      <section>
        <h2 className="text-sm font-bold text-slate-900 mb-2.5">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {[
            { label: 'Add Client', to: '/clients', icon: <UserPlus size={16} />, tone: 'sky' },
            { label: 'Add Site', to: '/sites', icon: <MapPin size={16} />, tone: 'teal' },
            { label: 'Add Employee', to: '/employees', icon: <Users size={16} />, tone: 'sky' },
            { label: 'Mark Attendance', to: '/attendance', icon: <ClipboardCheck size={16} />, tone: 'teal' },
            { label: 'Create Quotation', to: '/quotations', icon: <FileText size={16} />, tone: 'sky' },
            { label: 'Create Invoice', to: '/invoices', icon: <Receipt size={16} />, tone: 'amber' },
            { label: 'Add Expense', to: '/expenses', icon: <Wallet size={16} />, tone: 'rose' },
            { label: 'View Reports', to: '/reports', icon: <BarChart3 size={16} />, tone: 'sky' },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white p-3 text-center shadow-2xs transition-all duration-150 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md cursor-pointer"
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition duration-150 group-hover:scale-105',
                  action.tone === 'teal' && 'bg-teal-50 text-teal-600 ring-teal-200/60',
                  action.tone === 'sky' && 'bg-blue-50 text-blue-600 ring-blue-200/60',
                  action.tone === 'indigo' && 'bg-indigo-50 text-indigo-600 ring-indigo-200/60',
                  action.tone === 'amber' && 'bg-amber-50 text-amber-600 ring-amber-200/60',
                  action.tone === 'rose' && 'bg-rose-50 text-rose-600 ring-rose-200/60',
                )}
              >
                {action.icon}
              </div>
              <span className="text-[11px] font-semibold text-slate-700 group-hover:text-slate-900 truncate w-full">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
