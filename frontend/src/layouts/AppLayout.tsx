import { NavLink, useLocation, Outlet } from 'react-router-dom';
import {
  Bell,
  Building2,
  Calendar,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Receipt,
  ScrollText,
  Search,
  Users,
  Wallet,
  X,
  KeyRound,
  BarChart3,
  ShieldCheck,
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
  {
    to: '/',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF', 'SITE_SUPERVISOR'],
  },
  {
    to: '/clients',
    label: 'Clients',
    icon: <Building2 size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    to: '/sites',
    label: 'Sites',
    icon: <MapPin size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    to: '/employees',
    label: 'Employees',
    icon: <Users size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SITE_SUPERVISOR'],
  },
  {
    to: '/attendance',
    label: 'Attendance',
    icon: <CalendarCheck size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SITE_SUPERVISOR'],
  },
  {
    to: '/quotations',
    label: 'Quotations',
    icon: <FileText size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF'],
  },
  {
    to: '/invoices',
    label: 'Invoices',
    icon: <Receipt size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF'],
  },
  {
    to: '/expenses',
    label: 'Expenses',
    icon: <Wallet size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF'],
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: <BarChart3 size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF', 'SITE_SUPERVISOR'],
  },
  {
    to: '/change-password',
    label: 'Change Password',
    icon: <KeyRound size={18} />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF', 'SITE_SUPERVISOR'],
  },
];

function Breadcrumb() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
      <NavLink
        to="/"
        className="flex items-center gap-1 text-slate-400 hover:text-teal-700 transition"
      >
        <Home size={13} className="shrink-0" />
        <span className="hidden sm:inline font-medium">Home</span>
      </NavLink>

      {parts.map((crumb, i) => {
        const isLast = i === parts.length - 1;
        const formatted = crumb.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        return (
          <span key={`${crumb}-${i}`} className="flex items-center gap-1.5">
            <span className="text-slate-300">/</span>
            {isLast ? (
              <span className="font-bold text-slate-800">{formatted}</span>
            ) : (
              <span className="font-medium text-slate-400">{formatted}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function AppLayout() {
  const { user, logout, hasRole } = useAuth();
  const [open, setOpen] = useState(false);

  const filteredItems = useMemo(() => {
    return navItems.filter((item) => hasRole(...item.roles));
  }, [hasRole]);

  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }, []);

  const sidebar = (
    <aside className="relative flex h-full w-60 sm:w-64 flex-col bg-[#060e24] text-slate-100 border-r border-slate-800/60 select-none overflow-hidden shadow-2xl">
      {/* Ambient background cyan glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-[#00d2ff]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/3 -left-12 h-44 w-44 rounded-full bg-[#0072ff]/5 blur-3xl" />

      {/* 1. Brand Header matching reference screenshot */}
      <div className="px-4.5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          {/* Circular Logo Badge */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-md ring-1 ring-white/30">
            <img
              src={companyLogo}
              alt="Immaculate Masters"
              className="h-full w-full object-contain"
            />
          </div>

          {/* Company Title & Tagline */}
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-xs font-extrabold tracking-wider text-white">
              {COMPANY_NAME}
            </h1>
            <p className="mt-0.5 truncate text-[8.5px] font-bold uppercase tracking-wider text-[#00c5ff]">
              {COMPANY_TAGLINE}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Navigation List matching reference screenshot */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3.5 py-2">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-xs sm:text-[13px] font-semibold transition-all duration-200 cursor-pointer',
                isActive
                  ? 'bg-gradient-to-r from-[#00d2ff] via-[#00a2ff] to-[#3a7bd5] text-white shadow-lg shadow-[#00d2ff]/20 font-bold'
                  : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'shrink-0 transition-transform duration-150',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white group-hover:scale-105',
                  )}
                >
                  {item.icon}
                </span>
                <span className="truncate tracking-wide">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 3. Footer Profile Card */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white font-extrabold text-xs shadow-md">
              {(user?.name ?? 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-bold text-white">{user?.name}</p>
              <p className="truncate text-[9px] font-medium text-cyan-400">{user ? ROLE_LABELS[user.role] : 'Admin'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 transition cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50/80">
      {/* Mobile Drawer */}
      <div className="lg:hidden">
        {open ? (
          <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
            <div className="w-64 shadow-2xl animate-in slide-in-from-left duration-200">{sidebar}</div>
            <button
              className="flex-1 bg-slate-950/60 backdrop-blur-2xs cursor-pointer"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            />
          </div>
        ) : null}
      </div>

      <div className="lg:grid lg:grid-cols-[16rem_1fr]">
        <div className="sticky top-0 hidden h-screen lg:block">{sidebar}</div>

        <div className="min-w-0 flex flex-col min-h-screen">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-4 py-2.5 backdrop-blur-md sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 lg:hidden cursor-pointer"
                  onClick={() => setOpen(true)}
                  aria-label="Open menu"
                >
                  {open ? <X size={16} /> : <Menu size={16} />}
                </button>

                {/* Search Bar matching reference image */}
                <div className="relative flex items-center">
                  <Search size={14} className="pointer-events-none absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search anything..."
                    className="h-8.5 w-44 sm:w-64 md:w-80 rounded-xl border border-slate-200/90 bg-slate-50/70 pl-8.5 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Right Side: Notifications Bell & User Profile */}
              <div className="flex items-center gap-2.5 sm:gap-3.5">
                {/* Notification Bell */}
                <button
                  type="button"
                  className="relative flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell size={15} />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-2xs">
                    1
                  </span>
                </button>

                {/* User Profile matching reference image */}
                <div className="flex items-center gap-2.5 pl-1 sm:pl-2 border-l border-slate-200/80">
                  <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-teal-700 text-white font-bold text-xs shadow-2xs">
                    {(user?.name ?? 'K').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left leading-tight">
                    <p className="text-xs font-bold text-slate-900">{user?.name ?? 'Krishna Patil'}</p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {user ? ROLE_LABELS[user.role] : 'Super Admin'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Page Content */}
          <main className="page-enter flex-1 p-4 sm:p-5 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
