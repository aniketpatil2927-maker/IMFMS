import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { billsApi, invoicesApi } from '../services/resources';
import type { Bill } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Button, FieldError, Input, Label, PageHeader, Select, Spinner, Toolbar } from '../components/ui';
import { DownloadPdfButton, ViewPdfButton } from '../components/ActionIconButtons';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { downloadBlob, formatMoney, getErrorMessage } from '../utils/helpers';

const schema = z.object({
  invoiceId: z.string().min(1),
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
      { key: 'number', header: 'Bill No', render: (r: Bill) => r.billNumber },
      { key: 'invoice', header: 'Invoice', render: (r: Bill) => r.invoice?.invoiceNumber ?? '-' },
      { key: 'month', header: 'Billing Month', render: (r: Bill) => r.billingMonth },
      { key: 'client', header: 'Client', render: (r: Bill) => r.invoice?.client?.companyName ?? '-' },
      { key: 'employees', header: 'Employees', render: (r: Bill) => r.totalEmployees },
      { key: 'total', header: 'Grand Total', render: (r: Bill) => formatMoney(r.grandTotal) },
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
        subtitle="Generate monthly bills from invoices and attendance"
        actions={
          <Button
            type="button"
            onClick={() => {
              setError('');
              setOpen(true);
            }}
          >
            Generate Bill
          </Button>
        }
      />
      <Toolbar>
        <Input
          placeholder="Search bills..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </Toolbar>
      {error && !open ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {isLoading ? <Spinner /> : <DataTable columns={columns} rows={data?.items ?? []} />}
      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      <Modal open={open} title="Generate Monthly Bill" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={form.handleSubmit((v) => generateMutation.mutate(v))}>
          <div>
            <Label>Invoice</Label>
            <Select {...form.register('invoiceId')}>
              <option value="">Select invoice</option>
              {(invoices ?? []).map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.client?.companyName}
                </option>
              ))}
            </Select>
            <FieldError message={form.formState.errors.invoiceId?.message} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Attendance Year</Label>
              <Input type="number" {...form.register('attendanceYear')} />
            </div>
            <div>
              <Label>Attendance Month</Label>
              <Input type="number" min={1} max={12} {...form.register('attendanceMonth')} />
            </div>
          </div>
          <div>
            <Label>GST % (optional)</Label>
            <Input type="number" step="0.01" {...form.register('gstPercent')} />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={generateMutation.isPending}>
              Generate
            </Button>
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
