import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { clientsApi, invoicesApi, sitesApi } from '../services/resources';
import type { Invoice } from '../types';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Badge, Button, FieldError, Input, Label, PageHeader, Select, Spinner, Toolbar } from '../components/ui';
import { DownloadPdfButton, PdfPreviewModal, ViewPdfButton } from '../components/PdfPreviewModal';
import { DeleteActionButton, EditActionButton } from '../components/ActionIconButtons';
import { downloadBlob, formatDate, formatMoney, getErrorMessage } from '../utils/helpers';

const schema = z.object({
  date: z.string().min(1),
  clientId: z.string().min(1),
  siteId: z.string().min(1),
  periodFrom: z.string().min(1),
  periodTo: z.string().min(1),
  status: z.enum(['DRAFT', 'PENDING', 'FINALIZED']),
  gstPercent: z.coerce.number().min(0).max(100),
  items: z
    .array(
      z.object({
        serviceDetails: z.string().min(1),
        quantity: z.coerce.number().min(0),
        rate: z.coerce.number().min(0),
        mandays: z.coerce.number().min(0).optional(),
        actualMandays: z.coerce.number().min(0).optional(),
        amount: z.coerce.number().min(0).optional(),
      }),
    )
    .min(1),
});

type FormValues = z.infer<typeof schema>;

const emptyLine = () => ({
  serviceDetails: '',
  quantity: 1,
  rate: 0,
  mandays: 0,
  actualMandays: 0,
  amount: 0,
});

export function InvoicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [pdfPreview, setPdfPreview] = useState<{ title: string; url: string; filename: string } | null>(
    null,
  );
  const [pdfLoading, setPdfLoading] = useState(false);

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
      const res = await invoicesApi.pdf(id);
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

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, page],
    queryFn: async () => (await invoicesApi.list({ search, page, limit: 10 })).data.data!,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-all'],
    queryFn: async () => (await clientsApi.list({ page: 1, limit: 100 })).data.data!.items,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      status: 'DRAFT',
      gstPercent: 0,
      items: [emptyLine()],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const clientId = form.watch('clientId');

  const { data: sites } = useQuery({
    queryKey: ['sites-lite', clientId],
    enabled: !!clientId,
    queryFn: async () => (await sitesApi.lite(clientId)).data.data!,
  });

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    setError('');
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) return invoicesApi.update(editing.id, values);
      return invoicesApi.create(values);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['invoices'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      closeForm();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => invoicesApi.remove(deleting!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['invoices'] });
      setDeleting(null);
    },
  });

  const columns = useMemo(
    () => [
      { key: 'number', header: 'Invoice No', render: (r: Invoice) => r.invoiceNumber },
      { key: 'date', header: 'Date', render: (r: Invoice) => formatDate(r.date) },
      { key: 'client', header: 'Client', render: (r: Invoice) => r.client?.companyName ?? '-' },
      { key: 'site', header: 'Site', render: (r: Invoice) => r.site?.name ?? '-' },
      {
        key: 'period',
        header: 'Period',
        render: (r: Invoice) => `${formatDate(r.periodFrom)} - ${formatDate(r.periodTo)}`,
      },
      {
        key: 'status',
        header: 'Status',
        render: (r: Invoice) => (
          <Badge tone={r.status === 'FINALIZED' ? 'green' : r.status === 'PENDING' ? 'amber' : 'slate'}>
            {r.status}
          </Badge>
        ),
      },
      { key: 'total', header: 'Total', render: (r: Invoice) => formatMoney(r.total) },
      {
        key: 'actions',
        header: 'Actions',
        render: (r: Invoice) => (
          <div className="flex items-center gap-1.5">
            <EditActionButton
              onClick={async () => {
                const detail = (await invoicesApi.get(r.id)).data.data!;
                setEditing(detail);
                form.reset({
                  date: detail.date.slice(0, 10),
                  clientId: detail.clientId,
                  siteId: detail.siteId,
                  periodFrom: detail.periodFrom.slice(0, 10),
                  periodTo: detail.periodTo.slice(0, 10),
                  status: detail.status,
                  gstPercent: Number(detail.gstPercent),
                  items: (detail.items ?? []).map((i) => ({
                    serviceDetails: i.serviceDetails,
                    quantity: Number(i.quantity),
                    rate: Number(i.rate),
                    mandays: Number(i.mandays ?? 0),
                    actualMandays: Number(i.actualMandays ?? 0),
                    amount: Number(i.amount),
                  })),
                });
                setError('');
                setOpen(true);
              }}
            />
            <ViewPdfButton onClick={() => void openPdfPreview(r.id, r.invoiceNumber)} />
            <DownloadPdfButton
              onClick={async () => {
                const res = await invoicesApi.pdf(r.id);
                downloadBlob(res.data, `${r.invoiceNumber}.pdf`);
              }}
            />
            <DeleteActionButton onClick={() => setDeleting(r)} />
          </div>
        ),
      },
    ],
    [form, openPdfPreview],
  );

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Tax invoices in Immaculate Masters format"
        actions={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              form.reset({
                date: new Date().toISOString().slice(0, 10),
                clientId: '',
                siteId: '',
                periodFrom: new Date().toISOString().slice(0, 10),
                periodTo: new Date().toISOString().slice(0, 10),
                status: 'DRAFT',
                gstPercent: 0,
                items: [
                  {
                    serviceDetails: 'Housekeeping Team leader',
                    quantity: 1,
                    rate: 12000,
                    mandays: 30,
                    actualMandays: 30,
                    amount: 0,
                  },
                  {
                    serviceDetails: 'Housekeeping Attendant',
                    quantity: 6,
                    rate: 11000,
                    mandays: 180,
                    actualMandays: 131,
                    amount: 0,
                  },
                  {
                    serviceDetails: 'Housekeeping Material cost',
                    quantity: 0,
                    rate: 0,
                    mandays: 0,
                    actualMandays: 0,
                    amount: 6000,
                  },
                ],
              });
              setError('');
              setOpen(true);
            }}
          >
            New Invoice
          </Button>
        }
      />
      <Toolbar>
        <Input
          placeholder="Search by invoice number or client..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </Toolbar>
      {isLoading ? <Spinner /> : <DataTable columns={columns} rows={data?.items ?? []} />}
      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      <Modal
        open={open}
        title={editing ? `Edit ${editing.invoiceNumber}` : 'New Invoice'}
        onClose={closeForm}
        wide
        extraWide
      >
        <form className="space-y-3" onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Bill Date</Label>
              <Input type="date" {...form.register('date')} />
            </div>
            <div>
              <Label>Status</Label>
              <Select {...form.register('status')}>
                <option value="DRAFT">DRAFT</option>
                <option value="PENDING">PENDING</option>
                <option value="FINALIZED">FINALIZED</option>
              </Select>
            </div>
            <div>
              <Label>Client</Label>
              <Select {...form.register('clientId')}>
                <option value="">Select client</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.clientId?.message} />
            </div>
            <div>
              <Label>Site / Billing Address</Label>
              <Select {...form.register('siteId')}>
                <option value="">Select site</option>
                {(sites ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.siteId?.message} />
            </div>
            <div>
              <Label>Period From (Bill For)</Label>
              <Input type="date" {...form.register('periodFrom')} />
            </div>
            <div>
              <Label>Period To</Label>
              <Input type="date" {...form.register('periodTo')} />
            </div>
            <div>
              <Label>GST % (split CGST/SGST on PDF)</Label>
              <Input type="number" step="0.01" {...form.register('gstPercent')} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="secondary" onClick={() => append(emptyLine())}>
                Add Line
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Amount auto-calcs as Qty × Rate × (Actual Mandays ÷ Mandays). For materials, set Qty/Rate to 0 and enter
              Amount.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-[2.4fr_0.7fr_0.8fr_0.8fr_1fr_0.9fr_2.25rem] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  <span>Particulars</span>
                  <span>Qty as per W.O.</span>
                  <span>Rate Per Day</span>
                  <span>Mandays</span>
                  <span>Actual Mandays / OT</span>
                  <span>Amount</span>
                  <span className="sr-only">Actions</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[2.4fr_0.7fr_0.8fr_0.8fr_1fr_0.9fr_2.25rem] items-start gap-2 px-3 py-2.5"
                    >
                      <Input
                        placeholder="e.g. Housekeeping Attendant"
                        {...form.register(`items.${index}.serviceDetails`)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        title="QTY as per W.O."
                        {...form.register(`items.${index}.quantity`)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        title="Rate Per Day"
                        {...form.register(`items.${index}.rate`)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        title="Mandays"
                        {...form.register(`items.${index}.mandays`)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        title="Actual Mandays / OT hours"
                        {...form.register(`items.${index}.actualMandays`)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        title="Amount"
                        {...form.register(`items.${index}.amount`)}
                      />
                      <div className="flex justify-center pt-1">
                        {fields.length > 1 ? (
                          <Button
                            type="button"
                            variant="danger"
                            size="icon"
                            title="Remove line"
                            aria-label="Remove line"
                            onClick={() => remove(index)}
                          >
                            <X size={16} strokeWidth={2} />
                          </Button>
                        ) : (
                          <span className="inline-block h-9 w-9" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Invoice"
        message={`Delete ${deleting?.invoiceNumber}?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
      />

      <PdfPreviewModal
        open={!!pdfPreview}
        title={pdfPreview?.title ?? 'Invoice PDF'}
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
