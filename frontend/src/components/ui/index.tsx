import clsx from 'clsx';
import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'soft' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'h-8.5 px-3.5 text-xs',
        size === 'md' && 'h-9 px-4 text-xs sm:text-sm',
        size === 'lg' && 'h-10.5 px-5 text-sm font-bold',
        size === 'icon' && 'h-8.5 w-8.5 shrink-0 p-0',
        variant === 'primary' &&
          'bg-teal-600 text-white shadow-xs hover:bg-teal-700 hover:shadow-sm active:scale-[0.98] ring-1 ring-teal-500/20',
        variant === 'secondary' &&
          'border border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50/80 hover:text-slate-900 active:scale-[0.98]',
        variant === 'soft' &&
          'bg-teal-50 text-teal-800 border border-teal-200/60 hover:bg-teal-100/80 active:scale-[0.98]',
        variant === 'outline' &&
          'border border-teal-600 text-teal-700 bg-transparent hover:bg-teal-50 active:scale-[0.98]',
        variant === 'danger' &&
          'bg-rose-600 text-white shadow-xs hover:bg-rose-700 hover:shadow-sm active:scale-[0.98] ring-1 ring-rose-500/20',
        variant === 'ghost' &&
          'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 active:scale-[0.98]',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 size={13} className="animate-spin text-current shrink-0" /> : null}
      {children}
    </button>
  );
}

export function Input({
  className,
  icon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  if (icon) {
    return (
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          {icon}
        </div>
        <input
          className={cn(
            'h-9 w-full rounded-xl border border-slate-200/90 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 shadow-2xs outline-none transition duration-150',
            'placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white',
            'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
            className,
          )}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      className={cn(
        'h-9 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs outline-none transition duration-150',
        'placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white',
        'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  icon,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { icon?: ReactNode }) {
  return (
    <div className="relative w-full">
      {icon ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          {icon}
        </div>
      ) : null}
      <select
        className={cn(
          'h-9 w-full appearance-none rounded-xl border border-slate-200/90 bg-white py-1.5 text-xs text-slate-900 shadow-2xs outline-none transition duration-150',
          icon ? 'pl-9 pr-8' : 'px-3 pr-8',
          'focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
          'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs outline-none transition duration-150',
        'placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
        'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed resize-y min-h-[64px]',
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
  required,
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-700 select-none', className)}
    >
      <span>{children}</span>
      {required ? <span className="text-rose-500 text-xs font-bold leading-none">*</span> : null}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-rose-600 animate-in fade-in duration-150">
      <AlertCircle size={12} className="shrink-0 text-rose-500" />
      <span>{message}</span>
    </div>
  );
}

export function Card({
  children,
  className,
  hoverable = false,
  ...props
}: import('react').HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs',
        hoverable && 'transition duration-150 hover:-translate-y-0.5 hover:shadow-sm hover:border-slate-300',
        props.onClick && 'cursor-pointer select-none',
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
        'mb-3.5 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs sm:p-3',
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
  action,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
}) {
  const renderedActions = actions ?? action;
  return (
    <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-4.5 w-1 rounded-full bg-teal-600" />
          <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">{title}</h1>
          {badge ? <div className="ml-1">{badge}</div> : null}
        </div>
        {subtitle ? <p className="mt-0.5 max-w-2xl text-[11px] sm:text-xs text-slate-500 leading-normal">{subtitle}</p> : null}
      </div>
      {renderedActions ? <div className="flex flex-wrap items-center gap-2">{renderedActions}</div> : null}
    </div>
  );
}

export function StatsCard({
  label,
  value,
  unit,
  icon,
  tone = 'teal',
  iconTone,
  hint,
  to,
  onClick,
  active,
  className,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  icon?: ReactNode;
  tone?: 'teal' | 'sky' | 'amber' | 'rose' | 'emerald' | 'indigo';
  iconTone?: 'teal' | 'sky' | 'amber' | 'rose' | 'emerald' | 'indigo';
  hint?: string | ReactNode;
  to?: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '');

  const tones = {
    teal: {
      accent: 'border-l-teal-500',
      activeRing: 'ring-2 ring-teal-500 border-teal-300 bg-teal-50/25 shadow-xs',
      dot: 'bg-teal-500',
      hintColor: 'text-teal-700',
      waveStroke: '#14b8a6',
      waveFill: '#0d9488',
      waveId: 'stat-wave-teal',
    },
    sky: {
      accent: 'border-l-blue-500',
      activeRing: 'ring-2 ring-blue-500 border-blue-300 bg-blue-50/25 shadow-xs',
      dot: 'bg-blue-500',
      hintColor: 'text-blue-600',
      waveStroke: '#3b82f6',
      waveFill: '#2563eb',
      waveId: 'stat-wave-sky',
    },
    indigo: {
      accent: 'border-l-indigo-500',
      activeRing: 'ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50/25 shadow-xs',
      dot: 'bg-indigo-500',
      hintColor: 'text-indigo-600',
      waveStroke: '#6366f1',
      waveFill: '#4f46e5',
      waveId: 'stat-wave-indigo',
    },
    emerald: {
      accent: 'border-l-emerald-500',
      activeRing: 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/25 shadow-xs',
      dot: 'bg-emerald-500',
      hintColor: 'text-emerald-600',
      waveStroke: '#10b981',
      waveFill: '#059669',
      waveId: 'stat-wave-emerald',
    },
    amber: {
      accent: 'border-l-amber-500',
      activeRing: 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/25 shadow-xs',
      dot: 'bg-amber-500',
      hintColor: 'text-amber-600',
      waveStroke: '#f59e0b',
      waveFill: '#d97706',
      waveId: 'stat-wave-amber',
    },
    rose: {
      accent: 'border-l-rose-500',
      activeRing: 'ring-2 ring-rose-500 border-rose-300 bg-rose-50/25 shadow-xs',
      dot: 'bg-rose-500',
      hintColor: 'text-rose-600',
      waveStroke: '#f43f5e',
      waveFill: '#e11d48',
      waveId: 'stat-wave-rose',
    },
  };

  const iconTones = {
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', ring: 'ring-teal-200/60' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-200/60' },
    indigo: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-200/60' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200/60' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200/60' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200/60' },
  };

  const t = tones[tone];
  const it = iconTones[iconTone ?? tone];

  const content = (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ' ? onClick() : undefined) : undefined}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 overflow-hidden',
        'border-l-4',
        t.accent,
        active
          ? t.activeRing
          : 'border-slate-200/70 hover:-translate-y-1 hover:shadow-md hover:border-slate-300',
        (to || onClick) && 'cursor-pointer select-none',
        className,
      )}
    >
      <div>
        {/* Top: Value on left, Squircle Icon on right */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
              {value ?? '0'}
            </span>
            {unit ? <span className="text-xs font-semibold text-slate-500">{unit}</span> : null}
          </div>
          {icon ? (
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 transition duration-150',
                it.bg,
                it.text,
                it.ring,
              )}
            >
              {icon}
            </div>
          ) : null}
        </div>

        {/* Middle: Title label */}
        <p className="mt-1 text-xs font-semibold text-slate-600">{label}</p>
      </div>

      {/* Bottom: Hint on left */}
      <div className="mt-3 flex items-center justify-between relative z-10">
        {hint ? (
          <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', t.dot)} />
            <span className={cn('truncate', t.hintColor)}>{hint}</span>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Bottom-right Corner Decorative Gradient Wave SVG */}
      <div className="pointer-events-none absolute bottom-0 right-0 overflow-hidden rounded-br-2xl opacity-75">
        <svg width="84" height="42" viewBox="0 0 84 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 26C16 26 24 10 42 10C60 10 66 22 84 18V42H0V26Z"
            fill={`url(#${gradientId})`}
          />
          <path
            d="M0 26C16 26 24 10 42 10C60 10 66 22 84 18"
            stroke={t.waveStroke}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeOpacity="0.4"
          />
          <defs>
            <linearGradient id={gradientId} x1="42" y1="10" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop stopColor={t.waveFill} stopOpacity="0.2" />
              <stop offset="1" stopColor={t.waveFill} stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}

export function Badge({
  children,
  tone = 'slate',
  dot = true,
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'amber' | 'red' | 'teal' | 'blue' | 'purple';
  dot?: boolean;
}) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200/60',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    red: 'bg-rose-50 text-rose-700 ring-rose-200/60',
    teal: 'bg-teal-50 text-teal-700 ring-teal-200/60',
    blue: 'bg-sky-50 text-sky-700 ring-sky-200/60',
    purple: 'bg-purple-50 text-purple-700 ring-purple-200/60',
  };

  const dotColor = {
    slate: 'bg-slate-400',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-rose-500',
    teal: 'bg-teal-500',
    blue: 'bg-sky-500',
    purple: 'bg-purple-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
        toneMap[tone],
      )}
    >
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColor[tone])} /> : null}
      {children}
    </span>
  );
}

export function Alert({
  children,
  tone = 'error',
  onClose,
  className,
}: {
  children: ReactNode;
  tone?: 'error' | 'success' | 'info' | 'warning';
  onClose?: () => void;
  className?: string;
}) {
  const icons = {
    error: <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />,
    success: <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />,
    info: <Info size={14} className="text-sky-600 shrink-0 mt-0.5" />,
    warning: <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />,
  };

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg p-2.5 text-xs font-medium ring-1',
        tone === 'error' && 'bg-rose-50 text-rose-800 ring-rose-200',
        tone === 'success' && 'bg-emerald-50 text-emerald-800 ring-emerald-200',
        tone === 'info' && 'bg-sky-50 text-sky-800 ring-sky-200',
        tone === 'warning' && 'bg-amber-50 text-amber-800 ring-amber-200',
        className,
      )}
    >
      {icons[tone]}
      <div className="flex-1 leading-relaxed">{children}</div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="ml-auto -mr-1 -mt-0.5 p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
          aria-label="Dismiss alert"
        >
          &times;
        </button>
      ) : null}
    </div>
  );
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-7 w-7 border-2',
    lg: 'h-9 w-9 border-2',
  };

  return (
    <div className="flex items-center justify-center py-8">
      <div className={cn('relative rounded-full', sizeMap[size])}>
        <div className="absolute inset-0 rounded-full border-teal-100 border-[inherit]" />
        <div className="absolute inset-0 animate-spin rounded-full border-transparent border-t-teal-600 border-[inherit]" />
      </div>
    </div>
  );
}

export function EmptyState({
  message,
  title = 'No records found',
  action,
}: {
  message: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400 ring-1 ring-slate-200/60">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M4 12h10M4 17h7" strokeLinecap="round" />
        </svg>
      </div>
      <p className="font-bold text-slate-800 text-xs sm:text-sm">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500 max-w-sm mx-auto">{message}</p>
      {action ? <div className="mt-2.5 flex justify-center">{action}</div> : null}
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
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-2xs">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition duration-150 cursor-pointer',
            value === opt.value
              ? 'bg-white text-teal-800 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  badge,
  children,
  maxWidth = 'max-w-4xl',
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={cn(
          'relative w-full rounded-2xl bg-white shadow-2xl transition-all border border-slate-200/90 animate-scale-in overflow-hidden my-auto max-h-[92vh] flex flex-col',
          maxWidth,
        )}
      >
        {/* Top vibrant gradient accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 shrink-0" />

        {(title || subtitle || icon || badge) && (
          <div className="flex items-start justify-between border-b border-slate-100/90 px-4.5 py-3 sm:px-6 sm:py-3.5 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40 shrink-0">
            <div className="flex items-start gap-3 min-w-0 pr-2">
              {icon && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-200/60 shadow-2xs mt-0.5">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {title && <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">{title}</h3>}
                  {badge}
                </div>
                {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
