import { Button } from './ui';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: Array<number | '...'> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="mt-3 flex flex-col items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-2xs sm:flex-row">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>Page</span>
        <span className="inline-flex h-5.5 min-w-5.5 items-center justify-center rounded bg-teal-50 px-1 font-bold text-teal-800 ring-1 ring-teal-200/60 text-xs">
          {page}
        </span>
        <span>of</span>
        <span className="font-semibold text-slate-700">{totalPages}</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(1)}
          title="First Page"
          className="h-7 w-7 p-0"
        >
          <ChevronsLeft size={13} />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="h-7 px-2 text-xs"
        >
          <ChevronLeft size={13} />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        {/* Page numbers */}
        <div className="hidden items-center gap-0.5 sm:flex">
          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">
                …
              </span>
            ) : (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onChange(p)}
                className={`h-7 min-w-7 cursor-pointer rounded-md px-1.5 text-xs font-semibold transition duration-150 ${
                  p === page
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ),
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="h-7 px-2 text-xs"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={13} />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(totalPages)}
          title="Last Page"
          className="h-7 w-7 p-0"
        >
          <ChevronsRight size={13} />
        </Button>
      </div>
    </div>
  );
}
