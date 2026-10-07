import { useState } from 'react';
import { FileSpreadsheet, FileDown } from 'lucide-react';
import { Button } from './ui';

export function ExportButtons({
  onExportExcel,
  onExportPdf,
  disabled,
}: {
  onExportExcel: () => Promise<void> | void;
  onExportPdf: () => Promise<void> | void;
  disabled?: boolean;
}) {
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const handleExcel = async () => {
    setLoadingExcel(true);
    try {
      await onExportExcel();
    } finally {
      setLoadingExcel(false);
    }
  };

  const handlePdf = async () => {
    setLoadingPdf(true);
    try {
      await onExportPdf();
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        type="button"
        disabled={disabled || loadingExcel || loadingPdf}
        loading={loadingExcel}
        onClick={handleExcel}
        className="group border border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:bg-emerald-50/40 hover:border-emerald-300 hover:text-emerald-900 transition-all duration-150"
        title="Download Excel spreadsheet"
      >
        <FileSpreadsheet size={14} className="text-emerald-600 shrink-0 transition-transform duration-150 group-hover:scale-105" />
        <span>Download Excel</span>
      </Button>
      <Button
        variant="secondary"
        size="sm"
        type="button"
        disabled={disabled || loadingExcel || loadingPdf}
        loading={loadingPdf}
        onClick={handlePdf}
        className="group border border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:bg-rose-50/40 hover:border-rose-300 hover:text-rose-900 transition-all duration-150"
        title="Download PDF report"
      >
        <FileDown size={14} className="text-rose-600 shrink-0 transition-transform duration-150 group-hover:scale-105" />
        <span>Download PDF</span>
      </Button>
    </div>
  );
}
