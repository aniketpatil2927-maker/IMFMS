import { Button } from './ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        Page <span className="text-slate-800">{page}</span> of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} /> Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
