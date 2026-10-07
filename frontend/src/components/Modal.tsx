import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button, cn } from './ui';

/**
 * Overlay dialog: page behind stays visible through a light transparent dim.
 * Form appears as a floating elevated card.
 */
export function Modal({
  open,
  title,
  subtitle,
  icon,
  badge,
  children,
  onClose,
  wide,
  extraWide,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  extraWide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      {/* Transparent backdrop with blur */}
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs cursor-pointer"
        onClick={onClose}
        aria-hidden
      />

      {/* Floating form card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-black/5',
          'max-h-[min(92vh,900px)] animate-scale-in',
          extraWide ? 'max-w-5xl' : wide ? 'max-w-3xl' : 'max-w-lg',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top vibrant gradient accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500 shrink-0" />

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/30 px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-700 ring-1 ring-teal-200/80 shadow-2xs">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm sm:text-base font-bold text-slate-900 tracking-tight">{title}</h2>
                {badge}
              </div>
              {subtitle ? <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{subtitle}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-2xs hover:border-slate-300 hover:bg-slate-100/80 hover:text-slate-800 transition duration-150 cursor-pointer"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/25 p-4 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      icon={<AlertTriangle size={18} className="text-rose-600" />}
      badge={
        <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 shadow-2xs">
          Confirmation
        </span>
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
          <p className="text-xs sm:text-sm leading-relaxed text-slate-700">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80 bg-white -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-4 py-3 sm:px-6 sm:py-3.5 rounded-b-2xl">
          <Button size="sm" variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" variant="danger" type="button" onClick={onConfirm} loading={loading} disabled={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
