import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, X } from 'lucide-react';
import { Button, cn } from './ui';

export function PdfPreviewModal({
  open,
  title,
  url,
  loading,
  onClose,
  onDownload,
}: {
  open: boolean;
  title: string;
  url: string | null;
  loading?: boolean;
  onClose: () => void;
  onDownload?: () => void;
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl',
          'h-[min(92vh,920px)] max-w-5xl',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Preview</p>
            <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onDownload ? (
              <Button variant="secondary" type="button" onClick={onDownload} className="gap-1.5">
                <Download size={16} />
                <span className="hidden sm:inline">Download</span>
              </Button>
            ) : null}
            <Button
              variant="secondary"
              type="button"
              size="icon"
              onClick={onClose}
              aria-label="Close preview"
              title="Close"
            >
              <X size={18} strokeWidth={2} />
            </Button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-slate-100">
          {loading || !url ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <p className="text-sm">Loading PDF…</p>
            </div>
          ) : (
            <iframe title={title} src={url} className="h-full w-full border-0 bg-white" />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Re-export action icons so existing imports keep working
export {
  DeleteActionButton,
  DisableActionButton,
  DownloadPdfButton,
  DuplicateActionButton,
  EditActionButton,
  TransferActionButton,
  ViewPdfButton,
} from './ActionIconButtons';
