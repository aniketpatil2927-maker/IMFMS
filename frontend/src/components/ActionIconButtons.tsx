import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightLeft, Ban, Copy, Download, Eye, FileSpreadsheet, Pencil, Trash2 } from 'lucide-react';
import { cn } from './ui';

type Tone = 'default' | 'danger' | 'brand' | 'warning' | 'info';

const toneClass: Record<Tone, string> = {
  default:
    'border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-xs',
  brand:
    'border-teal-200/90 bg-teal-50/80 text-teal-700 hover:border-teal-300 hover:bg-teal-100 hover:text-teal-800 hover:shadow-xs',
  danger:
    'border-rose-200/90 bg-rose-50/80 text-rose-600 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 hover:shadow-xs',
  warning:
    'border-amber-200/90 bg-amber-50/80 text-amber-700 hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800 hover:shadow-xs',
  info:
    'border-sky-200/90 bg-sky-50/80 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800 hover:shadow-xs',
};

function PortalTooltip({
  open,
  label,
  anchor,
}: {
  open: boolean;
  label: string;
  anchor: DOMRect | null;
}) {
  if (!open || !anchor || typeof document === 'undefined') return null;

  const top = anchor.bottom + 8;
  const left = anchor.left + anchor.width / 2;

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[200] -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg animate-in fade-in duration-100"
      style={{ top, left }}
    >
      {label}
      <span className="absolute bottom-full left-1/2 -mb-px -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
    </div>,
    document.body,
  );
}

/** Square icon button with portal tooltip (never clipped by table overflow). */
export function ActionIconButton({
  label,
  tone = 'default',
  className,
  children,
  onBlur,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: Tone;
  children: ReactNode;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const tipId = useId();

  const show = () => {
    if (!btnRef.current) return;
    setAnchor(btnRef.current.getBoundingClientRect());
    setOpen(true);
  };

  const hide = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (btnRef.current) setAnchor(btnRef.current.getBoundingClientRect());
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? tipId : undefined}
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border shadow-2xs transition-all duration-150 cursor-pointer',
          'active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none',
          toneClass[tone],
          className,
        )}
        onMouseEnter={(e) => {
          show();
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          hide();
          onMouseLeave?.(e);
        }}
        onFocus={(e) => {
          show();
          onFocus?.(e);
        }}
        onBlur={(e) => {
          hide();
          onBlur?.(e);
        }}
        {...props}
      >
        {children}
      </button>
      <span id={tipId} className="sr-only">
        {label}
      </span>
      <PortalTooltip open={open} label={label} anchor={anchor} />
    </>
  );
}

export function EditActionButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionIconButton label="Edit" tone="default" onClick={onClick} disabled={disabled}>
      <Pencil size={14} strokeWidth={2} />
    </ActionIconButton>
  );
}

export function DuplicateActionButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionIconButton label="Duplicate" tone="default" onClick={onClick} disabled={disabled}>
      <Copy size={14} strokeWidth={2} />
    </ActionIconButton>
  );
}

export function ViewPdfButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionIconButton label="View PDF" tone="brand" onClick={onClick} disabled={disabled}>
      <Eye size={14} strokeWidth={2} />
    </ActionIconButton>
  );
}

export function DownloadPdfButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionIconButton label="Download PDF" tone="default" onClick={onClick} disabled={disabled}>
      <Download size={14} strokeWidth={2} />
    </ActionIconButton>
  );
}

export function DownloadExcelButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionIconButton label="Download Excel" tone="default" onClick={onClick} disabled={disabled}>
      <FileSpreadsheet size={14} strokeWidth={2} />
    </ActionIconButton>
  );
}

export function DeleteActionButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionIconButton label="Delete" tone="danger" onClick={onClick} disabled={disabled}>
      <Trash2 size={14} strokeWidth={2} />
    </ActionIconButton>
  );
}

export function TransferActionButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionIconButton label="Transfer" tone="warning" onClick={onClick} disabled={disabled}>
      <ArrowRightLeft size={14} strokeWidth={2} />
    </ActionIconButton>
  );
}

export function DisableActionButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionIconButton label="Disable" tone="danger" onClick={onClick} disabled={disabled}>
      <Ban size={14} strokeWidth={2} />
    </ActionIconButton>
  );
}
