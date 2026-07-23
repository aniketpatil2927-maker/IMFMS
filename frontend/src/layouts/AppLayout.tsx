import { NavLink, useLocation, Outlet } from 'react-router-dom';
import {
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Receipt,
  ScrollText,
  Users,
  X,
  KeyRound,
  BarChart3,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABELS } from '../utils/helpers';
import type { Role } from '../types';
import { Button, cn } from '../components/ui';
import companyLogo from '../assets/company-logo.png';

const COMPANY_NAME = 'IMMACULATE MASTERS';
const COMPANY_TAGLINE = 'Facility Management Services';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles: Role[];
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF', 'SITE_SUPERVISOR'] },
  { to: '/clients', label: 'Clients', icon: <Building2 size={18} />, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { to: '/sites', label: 'Sites', icon: <MapPin size={18} />, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { to: '/employees', label: 'Employees', icon: <Users size={18} />, roles: ['SUPER_ADMIN', 'ADMIN', 'SITE_SUPERVISOR'] },
  { to: '/attendance', label: 'Attendance', icon: <ClipboardList size={18} />, roles: ['SUPER_ADMIN', 'ADMIN', 'SITE_SUPERVISOR'] },
  { to: '/quotations', label: 'Quotations', icon: <FileText size={18} />, roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF'] },
  { to: '/invoices', label: 'Invoices', icon: <Receipt size={18} />, roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF'] },
  { to: '/bills', label: 'Bills', icon: <ScrollText size={18} />, roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF'] },
  { to: '/reports', label: 'Reports', icon: <BarChart3 size={18} />, roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF', 'SITE_SUPERVISOR'] },
  { to: '/change-password', label: 'Change Password', icon: <KeyRound size={18} />, roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF', 'SITE_SUPERVISOR'] },
];

function Breadcrumb() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  const crumbs = parts.length === 0 ? ['Dashboard'] : ['Home', ...parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1))];
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={`${crumb}-${i}`} className="flex items-center gap-1.5">
          {i > 0 ? <span className="text-slate-300">/</span> : null}
          <span className={i === crumbs.length - 1 ? 'font-semibold text-slate-800' : 'text-slate-400'}>
            {crumb}
          </span>
        </span>
      ))}
    </div>
  );
}

export function AppLayout() {
  const { user, logout, hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const items = useMemo(() => navItems.filter((item) => hasRole(...item.roles)), [hasRole]);

  const sidebar = (
    <aside className="flex h-full w-72 flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="relative overflow-hidden border-b border-white/10 px-4 py-4">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-teal-500/20 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-lg shadow-teal-900/30 ring-1 ring-white/20">
            <img
              src={companyLogo}
              alt="Immaculate Masters logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[13px] font-bold leading-tight tracking-wide text-white">
              {COMPANY_NAME}
            </h1>
            <p className="mt-0.5 truncate text-[11px] font-medium text-teal-300/90">{COMPANY_TAGLINE}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-md shadow-teal-950/40'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <span className="opacity-90">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20 text-sm font-bold text-teal-200">
              {(user?.name ?? 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user ? ROLE_LABELS[user.role] : ''}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="mt-3 w-full justify-start rounded-xl text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={logout}
          >
            <LogOut size={16} /> Logout
          </Button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen">
      <div className="lg:hidden">
        {open ? (
          <div className="fixed inset-0 z-40 flex">
            <div className="w-72 shadow-2xl">{sidebar}</div>
            <button className="flex-1 bg-slate-950/50 backdrop-blur-[1px]" onClick={() => setOpen(false)} aria-label="Close menu" />
          </div>
        ) : null}
      </div>

      <div className="lg:grid lg:grid-cols-[18rem_1fr]">
        <div className="sticky top-0 hidden h-screen lg:block">{sidebar}</div>
        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 px-4 py-3.5 backdrop-blur-md sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm hover:bg-slate-50 lg:hidden"
                  onClick={() => setOpen(true)}
                  aria-label="Open menu"
                >
                  {open ? <X size={18} /> : <Menu size={18} />}
                </button>
                <div>
                  <Breadcrumb />
                  <p className="mt-0.5 text-xs text-slate-400 sm:hidden">{user?.name}</p>
                </div>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Online
              </div>
            </div>
          </header>
          <main className="page-enter p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
