import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Calendar, CheckCircle2, FileText, Percent, Plus, Receipt, Search, Users } from 'lucide-react';
import { billsApi, invoicesApi } from '../services/resources';
import type { Bill } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import {
  Alert,
  Badge,
  Button,
  FieldError,
  Input,
  Label,
  PageHeader,
  Select,
  Spinner,
  Toolbar,
} from '../components/ui';
import { DownloadPdfButton, ViewPdfButton } from '../components/ActionIconButtons';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { downloadBlob, formatMoney, getErrorMessage } from '../utils/helpers';

const schema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  attendanceYear: z.coerce.number().int().min(2000),
  attendanceMonth: z.coerce.number().int().min(1).max(12),
  gstPercent: z.coerce.number().min(0).max(100).optional(),
});

type FormValues = z.infer<typeof schema>;

export function BillsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pdfPreview, setPdfPreview] = useState<{ title: string; url: string; filename: string } | null>(
    null,
  );
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['bills', search, page],
    queryFn: async () => (await billsApi.list({ search, page, limit: 10 })).data.data!,
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices-all'],
    queryFn: async () => (await invoicesApi.list({ page: 1, limit: 100 })).data.data!.items,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      attendanceYear: new Date().getFullYear(),
      attendanceMonth: new Date().getMonth() + 1,
    },
  });

  const closePdfPreview = useCallback(() => {
    setPdfPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
    setPdfLoading(false);
  }, []);

  const openPdfPreview = useCallback(async (id: string, number: string) => {
    setPdfLoading(true);
    setPdfPreview({ title: number, url: '', filename: `${number}.pdf` });
    try {
      const res = await billsApi.pdf(id);
      const url = URL.createObjectURL(res.data);
      setPdfPreview({ title: number, url, filename: `${number}.pdf` });
    } catch (err) {
      setPdfPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return null;
      });
      setError(getErrorMessage(err, 'Failed to load PDF preview'));
    } finally {
      setPdfLoading(false);
    }
  }, []);

  const generateMutation = useMutation({
    mutationFn: async (values: FormValues) => billsApi.generate(values),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['bills'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setOpen(false);
      form.reset({
        invoiceId: '',
        attendanceYear: new Date().getFullYear(),
        attendanceMonth: new Date().getMonth() + 1,
      });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const columns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Bill No',
        render: (r: Bill) => (
          <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md ring-1 ring-teal-200/60">
            {r.billNumber}
          </span>
        ),
      },
      {
        key: 'invoice',
        header: 'Referenced Invoice',
        render: (r: Bill) => (
          <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
            {r.invoice?.invoiceNumber ?? '-'}
          </span>
        ),
      },
      {
        key: 'month',
        header: 'Billing Month',
        render: (r: Bill) => (
          <span className="inline-flex items-center gap-1 text-xs text-slate-700 font-semibold">
            <Calendar size={12} className="text-teal-600" />
            {r.billingMonth}
          </span>
        ),
      },
      {
        key: 'client',
        header: 'Client Company',
        render: (r: Bill) => (
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Building2 size={13} className="text-slate-400 shrink-0" />
            <span>{r.invoice?.client?.companyName ?? '-'}</span>
          </div>
        ),
      },
      {
        key: 'employees',
        header: 'Billed Staff',
        render: (r: Bill) => (
          <Badge tone="blue">
            <Users size={11} className="mr-1 inline" /> {r.totalEmployees} Staff
          </Badge>
        ),
      },
      {
        key: 'total',
        header: 'Grand Total',
        render: (r: Bill) => (
          <span className="font-bold text-slate-900 tabular-nums">{formatMoney(r.grandTotal)}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (r: Bill) => (
          <div className="flex items-center gap-1.5">
            <ViewPdfButton onClick={() => void openPdfPreview(r.id, r.billNumber)} />
            <DownloadPdfButton
              onClick={async () => {
                const res = await billsApi.pdf(r.id);
                downloadBlob(res.data, `${r.billNumber}.pdf`);
              }}
            />
          </div>
        ),
      },
    ],
    [openPdfPreview],
  );

  return (
    <div>
      <PageHeader
        title="Bills"
        subtitle="Generate and download monthly facility billing registers synced with verified attendance"
        badge={
          data?.pagination.total !== undefined ? (
            <Badge tone="teal">{data.pagination.total} Total</Badge>
          ) : null
        }
        actions={
          <Button
            size="sm"
            type="button"
            onClick={() => {
              setError('');
              setOpen(true);
            }}
          >
            <Plus size={14} /> Generate Monthly Bill
          </Button>
        }
      />

      <Toolbar>
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search size={16} />
          </div>
          <Input
            placeholder="Search by bill number or client company..."
            value={search}
            className="pl-10"
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
      </Toolbar>

      {error && !open ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      {isLoading ? <Spinner /> : <DataTable columns={columns} rows={data?.items ?? []} />}
      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      <Modal
        open={open}
        title="Generate Monthly Facility Bill"
        subtitle="Compile finalized invoice charges and site attendance records into an official bill voucher"
        icon={<Receipt size={20} className="text-teal-600" />}
        badge={
          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200/70 shadow-2xs">
            Monthly Billing
          </span>
        }
        onClose={() => setOpen(false)}
        wide
      >
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => generateMutation.mutate(v))}>
          {/* Card 1: Invoice Reference */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-200/70 shadow-2xs">
                <FileText size={14} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Referenced Tax Invoice</h3>
                <p className="text-[11px] text-slate-500">Select an approved or finalized invoice to generate this monthly bill</p>
              </div>
            </div>

            <div>
              <Label required>Referenced Approved Invoice</Label>
              <Select icon={<Receipt size={15} />} {...form.register('invoiceId')}>
                <option value="">Select finalized/pending invoice</option>
                {(invoices ?? []).map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.client?.companyName}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.invoiceId?.message} />
            </div>
          </div>

          {/* Card 2: Billing Period & Tax Configuration */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-200/70 shadow-2xs">
                <Calendar size={14} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Attendance Period & Tax Rate</h3>
                <p className="text-[11px] text-slate-500">Define the target attendance calendar month and optional GST override</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label required>Attendance Year</Label>
                <Input type="number" icon={<Calendar size={15} />} {...form.register('attendanceYear')} />
              </div>
              <div>
                <Label required>Attendance Month (1-12)</Label>
                <Input type="number" min={1} max={12} icon={<Calendar size={15} />} {...form.register('attendanceMonth')} />
              </div>
              <div className="sm:col-span-2">
                <Label>GST Rate (%) (Optional Override)</Label>
                <Input type="number" step="0.01" placeholder="Leave blank to use original invoice rate" icon={<Percent size={15} />} {...form.register('gstPercent')} />
              </div>
            </div>
          </div>

          {error ? <Alert tone="error">{error}</Alert> : null}

          {/* Docked Action Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-200/80 bg-white -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-4 py-3.5 sm:px-6 sm:py-4 rounded-b-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              <span>Generates printable bill voucher with audit trail</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <button
                type="submit"
                disabled={generateMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 shadow-xs hover:shadow-md transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {generateMutation.isPending ? 'Generating...' : 'Generate Monthly Bill'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <PdfPreviewModal
        open={!!pdfPreview}
        title={pdfPreview?.title ?? 'Bill PDF'}
        url={pdfPreview?.url || null}
        loading={pdfLoading || (!!pdfPreview && !pdfPreview.url)}
        onClose={closePdfPreview}
        onDownload={() => {
          if (!pdfPreview?.url) return;
          const a = document.createElement('a');
          a.href = pdfPreview.url;
          a.download = pdfPreview.filename;
          a.click();
        }}
      />
    </div>
  );
}
