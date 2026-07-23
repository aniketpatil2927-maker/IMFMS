import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { clientsApi, quotationsApi, sitesApi } from '../services/resources';
import type { Quotation } from '../types';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Alert, Badge, Button, FieldError, Input, Label, PageHeader, Select, Spinner, Textarea, Toolbar } from '../components/ui';
import { DownloadPdfButton, PdfPreviewModal, ViewPdfButton } from '../components/PdfPreviewModal';
import {
  DeleteActionButton,
  DuplicateActionButton,
  EditActionButton,
} from '../components/ActionIconButtons';
import { downloadBlob, formatDate, formatMoney, getErrorMessage } from '../utils/helpers';

const schema = z.object({
  date: z.string().min(1),
  clientId: z.string().min(1),
  siteId: z.string().min(1),
  terms: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'FINALIZED']),
  gstPercent: z.coerce.number().min(0).max(100),
  items: z
    .array(
      z.object({
        serviceDescription: z.string().min(1),
        numberOfEmployees: z.coerce.number().int().min(0),
        duty: z.string().optional(),
        rate: z.coerce.number().positive(),
      }),
    )
    .min(1),
});

type FormValues = z.infer<typeof schema>;

export function QuotationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [deleting, setDeleting] = useState<Quotation | null>(null);
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
      const res = await quotationsApi.pdf(id);
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
    queryKey: ['quotations', search, page],
    queryFn: async () => (await quotationsApi.list({ search, page, limit: 10 })).data.data!,
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
      items: [{ serviceDescription: 'Housekeeping Staff', numberOfEmployees: 1, duty: '8 Hrs', rate: 0 }],
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
      if (editing) return quotationsApi.update(editing.id, values);
      return quotationsApi.create(values);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['quotations'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      closeForm();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => quotationsApi.duplicate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => quotationsApi.remove(deleting!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['quotations'] });
      setDeleting(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      date: new Date().toISOString().slice(0, 10),
      clientId: '',
      siteId: '',
      terms: '',
      status: 'DRAFT',
      gstPercent: 0,
      items: [
        { serviceDescription: 'Housekeeping Staff', numberOfEmployees: 3, duty: '8 Hrs', rate: 13500 },
        { serviceDescription: 'Housekeeping Materials', numberOfEmployees: 0, duty: '-', rate: 3000 },
      ],
    });
    setError('');
    setOpen(true);
  };

  const columns = useMemo(
    () => [
      { key: 'number', header: 'Quotation No', render: (r: Quotation) => r.quotationNumber },
      { key: 'date', header: 'Date', render: (r: Quotation) => formatDate(r.date) },
      { key: 'client', header: 'Client', render: (r: Quotation) => r.client?.companyName ?? '-' },
      { key: 'site', header: 'Site', render: (r: Quotation) => r.site?.name ?? '-' },
      {
        key: 'status',
        header: 'Status',
        render: (r: Quotation) => (
          <Badge tone={r.status === 'FINALIZED' ? 'green' : r.status === 'PENDING' ? 'amber' : 'slate'}>
            {r.status}
          </Badge>
        ),
      },
      { key: 'total', header: 'Total', render: (r: Quotation) => formatMoney(r.total) },
      {
        key: 'actions',
        header: 'Actions',
        render: (r: Quotation) => (
          <div className="flex items-center gap-1.5">
            <EditActionButton
              onClick={async () => {
                const detail = (await quotationsApi.get(r.id)).data.data!;
                setEditing(detail);
                form.reset({
                  date: detail.date.slice(0, 10),
                  clientId: detail.clientId,
                  siteId: detail.siteId,
                  terms: detail.terms ?? '',
                  status: detail.status,
                  gstPercent: Number(detail.gstPercent),
                  items: (detail.items ?? []).map((i) => ({
                    serviceDescription: i.serviceDescription,
                    numberOfEmployees: i.numberOfEmployees,
                    duty: i.duty ?? (i.numberOfEmployees > 0 ? '8 Hrs' : '-'),
                    rate: Number(i.rate),
                  })),
                });
                setError('');
                setOpen(true);
              }}
            />
            <DuplicateActionButton onClick={() => duplicateMutation.mutate(r.id)} />
            <ViewPdfButton onClick={() => void openPdfPreview(r.id, r.quotationNumber)} />
            <DownloadPdfButton
              onClick={async () => {
                const res = await quotationsApi.pdf(r.id);
                downloadBlob(res.data, `${r.quotationNumber}.pdf`);
              }}
            />
            <DeleteActionButton onClick={() => setDeleting(r)} />
          </div>
        ),
      },
    ],
    [duplicateMutation, form, openPdfPreview],
  );

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle="Create and download professional quotations"
        actions={<Button type="button" onClick={openCreate}>New Quotation</Button>}
      />
      <Toolbar>
        <Input placeholder="Search by quotation number or client..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
      </Toolbar>
      {isLoading ? <Spinner /> : <DataTable columns={columns} rows={data?.items ?? []} />}
      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      <Modal open={open} title={editing ? `Edit ${editing.quotationNumber}` : 'New Quotation'} onClose={closeForm} wide>
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Date</Label>
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
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.clientId?.message} />
            </div>
            <div>
              <Label>Site</Label>
              <Select {...form.register('siteId')}>
                <option value="">Select site</option>
                {(sites ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.siteId?.message} />
            </div>
            <div>
              <Label>GST %</Label>
              <Input type="number" step="0.01" {...form.register('gstPercent')} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Service Lines (Description / Qty / Duty / Rate)</Label>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  append({ serviceDescription: '', numberOfEmployees: 1, duty: '8 Hrs', rate: 0 })
                }
              >
                Add Line
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <Input placeholder="Description" {...form.register(`items.${index}.serviceDescription`)} />
                </div>
                <Input type="number" placeholder="Qty" {...form.register(`items.${index}.numberOfEmployees`)} />
                <Input placeholder="Duty (8 Hrs)" {...form.register(`items.${index}.duty`)} />
                <Input type="number" step="0.01" placeholder="Rate" {...form.register(`items.${index}.rate`)} />
                <div className="flex gap-2">
                  {fields.length > 1 ? (
                    <Button type="button" variant="danger" onClick={() => remove(index)}>
                      ×
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-500">
              Tip: For materials use Qty = 0 and Duty = &quot;-&quot;. Amount becomes the Rate (like your Word template).
            </p>
          </div>

          <div>
            <Label>Terms & Conditions</Label>
            <Textarea rows={3} {...form.register('terms')} />
          </div>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" type="button" onClick={closeForm}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Quotation"
        message={`Delete ${deleting?.quotationNumber}?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
      />

      <PdfPreviewModal
        open={!!pdfPreview}
        title={pdfPreview?.title ?? 'Quotation PDF'}
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
