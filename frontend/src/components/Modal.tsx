import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button, cn } from './ui';

/**
 * Overlay dialog: page behind stays visible through a light transparent dim.
 * Form appears as a floating white card (not a full white page).
 */
export function Modal({
  open,
  title,
  children,
  onClose,
  wide,
  extraWide,
}: {
  open: boolean;
  title: string;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Transparent dim — list page remains visible behind */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />

      {/* Floating form card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl',
          'max-h-[min(90vh,880px)]',
          extraWide ? 'max-w-5xl' : wide ? 'max-w-3xl' : 'max-w-lg',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="truncate text-lg font-bold text-slate-900">{title}</h2>
          <Button
            variant="secondary"
            type="button"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X size={18} strokeWidth={2} />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5">{children}</div>
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
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm leading-relaxed text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" type="button" onClick={onConfirm} disabled={loading}>
          {loading ? 'Please wait...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
