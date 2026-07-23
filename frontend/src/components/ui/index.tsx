import clsx from 'clsx';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'soft';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2.5 text-sm',
        size === 'lg' && 'px-5 py-3 text-sm',
        size === 'icon' && 'h-9 w-9 shrink-0 p-0',
        variant === 'primary' &&
          'bg-brand-700 text-white shadow-sm shadow-brand-700/25 hover:bg-brand-800 hover:shadow-md active:scale-[0.98]',
        variant === 'secondary' &&
          'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50',
        variant === 'soft' && 'bg-brand-50 text-brand-800 hover:bg-brand-100',
        variant === 'danger' && 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900',
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100',
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-sm font-semibold text-slate-700', className)}>
      {children}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-rose-600">{message}</p>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42_/_0.04),0_8px_24px_rgb(15_23_42_/_0.05)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mb-4 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur sm:p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 h-1 w-10 rounded-full bg-brand-600" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatsCard({
  label,
  value,
  icon,
  tone = 'teal',
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: ReactNode;
  tone?: 'teal' | 'sky' | 'amber' | 'rose' | 'emerald' | 'indigo';
}) {
  const tones = {
    teal: 'from-teal-500/15 to-teal-500/5 text-teal-700 ring-teal-100',
    sky: 'from-sky-500/15 to-sky-500/5 text-sky-700 ring-sky-100',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-700 ring-amber-100',
    rose: 'from-rose-500/15 to-rose-500/5 text-rose-700 ring-rose-100',
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-700 ring-emerald-100',
    indigo: 'from-indigo-500/15 to-indigo-500/5 text-indigo-700 ring-indigo-100',
  };

  return (
    <Card className="relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgb(15_23_42_/_0.08)]">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-slate-100 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value ?? '—'}</p>
        </div>
        {icon ? (
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ring-1',
              tones[tone],
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'amber' | 'red' | 'teal';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide',
        tone === 'slate' && 'bg-slate-100 text-slate-700',
        tone === 'green' && 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
        tone === 'amber' && 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
        tone === 'red' && 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
        tone === 'teal' && 'bg-teal-50 text-teal-700 ring-1 ring-teal-100',
      )}
    >
      {children}
    </span>
  );
}

export function Alert({
  children,
  tone = 'error',
}: {
  children: ReactNode;
  tone?: 'error' | 'success' | 'info';
}) {
  return (
    <div
      className={cn(
        'rounded-xl px-3.5 py-2.5 text-sm font-medium',
        tone === 'error' && 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
        tone === 'success' && 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
        tone === 'info' && 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
      )}
    >
      {children}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-brand-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-brand-600" />
      </div>
    </div>
  );
}

export function EmptyState({ message, title = 'Nothing here yet' }: { message: string; title?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M4 12h10M4 17h7" strokeLinecap="round" />
        </svg>
      </div>
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-lg px-3.5 py-2 text-sm font-semibold transition',
            value === opt.value
              ? 'bg-white text-brand-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
