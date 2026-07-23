import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  MapPin,
  Receipt,
  ScrollText,
  Users,
} from 'lucide-react';
import { dashboardApi } from '../services/resources';
import { Card, Spinner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABELS } from '../utils/helpers';
import companyLogo from '../assets/company-logo.png';
import type { Role } from '../types';

type Tone = 'teal' | 'sky' | 'amber' | 'rose' | 'emerald' | 'indigo';

const toneStyles: Record<Tone, { icon: string; bar: string }> = {
  teal: { icon: 'bg-teal-50 text-teal-700 ring-teal-100', bar: 'bg-teal-500' },
  sky: { icon: 'bg-sky-50 text-sky-700 ring-sky-100', bar: 'bg-sky-500' },
  amber: { icon: 'bg-amber-50 text-amber-700 ring-amber-100', bar: 'bg-amber-500' },
  rose: { icon: 'bg-rose-50 text-rose-700 ring-rose-100', bar: 'bg-rose-500' },
  emerald: { icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100', bar: 'bg-emerald-500' },
  indigo: { icon: 'bg-indigo-50 text-indigo-700 ring-indigo-100', bar: 'bg-indigo-500' },
};

function StatTile({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string;
  value: string | number | null | undefined;
  icon: ReactNode;
  tone: Tone;
  hint?: string;
}) {
  return (
    <Card className="group relative overflow-hidden p-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgb(15_23_42_/_0.08)]">
      <div className={`h-1 w-full ${toneStyles[tone].bar}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {value ?? '—'}
            </p>
            {hint ? <p className="mt-1.5 text-xs text-slate-400">{hint}</p> : null}
          </div>
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${toneStyles[tone].icon}`}
          >
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
}

function QuickLink({
  to,
  label,
  description,
  icon,
}: {
  to: string;
  label: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/40 hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-100 transition group-hover:bg-teal-100 group-hover:text-teal-800 group-hover:ring-teal-200">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <ArrowUpRight
            size={16}
            className="shrink-0 text-slate-300 transition group-hover:text-teal-600"
          />
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const { user, hasRole } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await dashboardApi.stats()).data.data!,
  });

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const isSupervisor = user?.role === 'SITE_SUPERVISOR';
  const canOffice = hasRole('SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF');

  const quickLinks = useMemo(() => {
    const links: Array<{
      to: string;
      label: string;
      description: string;
      icon: ReactNode;
      roles: Role[];
    }> = [
      {
        to: '/clients',
        label: 'Clients',
        description: 'Manage companies & contacts',
        icon: <Building2 size={18} />,
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
      {
        to: '/sites',
        label: 'Sites',
        description: 'Locations & supervisors',
        icon: <MapPin size={18} />,
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
      {
        to: '/employees',
        label: 'Employees',
        description: 'Staff profiles & transfers',
        icon: <Users size={18} />,
        roles: ['SUPER_ADMIN', 'ADMIN', 'SITE_SUPERVISOR'],
      },
      {
        to: '/attendance',
        label: 'Attendance',
        description: 'Daily & monthly registers',
        icon: <ClipboardList size={18} />,
        roles: ['SUPER_ADMIN', 'ADMIN', 'SITE_SUPERVISOR'],
      },
      {
        to: '/quotations',
        label: 'Quotations',
        description: 'Create & download quotes',
        icon: <FileText size={18} />,
        roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF'],
      },
      {
        to: '/invoices',
        label: 'Invoices',
        description: 'Tax invoices & rates',
        icon: <Receipt size={18} />,
        roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF'],
      },
      {
        to: '/bills',
        label: 'Bills',
        description: 'Monthly billing',
        icon: <ScrollText size={18} />,
        roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF'],
      },
    ];
    return links.filter((l) => hasRole(...l.roles));
  }, [hasRole]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white shadow-[0_12px_40px_rgb(15_23_42_/_0.18)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-white/20">
              <img src={companyLogo} alt="Immaculate Masters" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">
                Immaculate Masters
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
                {greeting}, {user?.name?.split(' ')[0] ?? 'there'}
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-300">
                {user ? ROLE_LABELS[user.role] : 'User'} workspace — housekeeping billing, attendance, and
                documents at a glance.
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-200/80">Today</p>
            <p className="mt-1 text-sm font-medium text-white">{todayLabel}</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Overview</h2>
            <p className="mt-0.5 text-sm text-slate-500">Key numbers for your role</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {!isSupervisor ? (
            <StatTile
              label="Total Clients"
              value={data?.totalClients}
              icon={<Building2 size={20} />}
              tone="teal"
              hint="Active client companies"
            />
          ) : null}
          {!isSupervisor ? (
            <StatTile
              label="Total Sites"
              value={data?.totalSites}
              icon={<MapPin size={20} />}
              tone="sky"
              hint="Managed locations"
            />
          ) : null}
          <StatTile
            label="Total Employees"
            value={data?.totalEmployees}
            icon={<Users size={20} />}
            tone="indigo"
            hint={isSupervisor ? 'Staff at your site' : 'Active staff'}
          />
          <StatTile
            label="Today's Attendance"
            value={data?.todaysAttendance}
            icon={<ClipboardCheck size={20} />}
            tone="emerald"
            hint="Records marked today"
          />
          {canOffice ? (
            <>
              <StatTile
                label="Pending Quotations"
                value={data?.pendingQuotations}
                icon={<FileText size={20} />}
                tone="amber"
                hint="Awaiting finalization"
              />
              <StatTile
                label="Pending Invoices"
                value={data?.pendingInvoices}
                icon={<Receipt size={20} />}
                tone="rose"
                hint="Draft / pending invoices"
              />
            </>
          ) : null}
        </div>
      </section>

      {/* Quick actions */}
      {quickLinks.length > 0 ? (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Quick access</h2>
            <p className="mt-0.5 text-sm text-slate-500">Jump to the modules you use most</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((link) => (
              <QuickLink key={link.to} {...link} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
