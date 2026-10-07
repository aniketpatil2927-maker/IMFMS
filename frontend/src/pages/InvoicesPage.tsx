import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { Building2, Calendar, CheckCircle2, Clock, FileText, MapPin, Percent, Plus, Receipt, RotateCcw, Search, Trash2 } from 'lucide-react';
import { clientsApi, invoicesApi, sitesApi } from '../services/resources';
import type { Invoice } from '../types';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
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
  StatsCard,
  Toolbar,
} from '../components/ui';
import { ExportButtons } from '../components/ExportButtons';
import { DownloadPdfButton, PdfPreviewModal, ViewPdfButton } from '../components/PdfPreviewModal';
import { DeleteActionButton, DownloadExcelButton, EditActionButton } from '../components/ActionIconButtons';
import { downloadBlob, formatDate, formatMoney, getErrorMessage } from '../utils/helpers';

const schema = z.object({
  date: z.string().min(1, 'Bill date is required'),
  clientId: z.string().min(1, 'Client is required'),
  siteId: z.string().min(1, 'Site is required'),
  periodFrom: z.string().min(1, 'Period start is required'),
  periodTo: z.string().min(1, 'Period end is required'),
  status: z.enum(['DRAFT', 'PENDING', 'FINALIZED']),
  gstPercent: z.coerce.number().min(0).max(100),
  items: z
    .array(
      z.object({
        serviceDetails: z.string().min(1, 'Particulars required'),
        quantity: z.coerce.number().min(0),
        rate: z.coerce.number().min(0),
        mandays: z.coerce.number().min(0).optional(),
        actualMandays: z.coerce.number().min(0).optional(),
        amount: z.coerce.number().min(0).optional(),
      }),
    )
    .min(1, 'At least one line item is required'),
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'FINALIZED'>('ALL');
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

  const { data: summaryData } = useQuery({
    queryKey: ['invoices-summary'],
    queryFn: async () => (await invoicesApi.summary()).data.data!,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, page, statusFilter],
    queryFn: async () =>
      (
        await invoicesApi.list({
          search,
          page,
          limit: 10,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        })
      ).data.data!,
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
  const watchedItems = form.watch('items');
  const watchedGstPercent = form.watch('gstPercent');

  const formSubtotal = useMemo(() => {
    return (watchedItems || []).reduce((acc, it) => acc + (Number(it?.amount) || 0), 0);
  }, [watchedItems]);
  const formGstAmount = (formSubtotal * (Number(watchedGstPercent) || 0)) / 100;
  const formGrandTotal = formSubtotal + formGstAmount;

  const calculateRowAmount = (index: number) => {
    setTimeout(() => {
      const row = form.getValues(`items.${index}`);
      const rate = Number(row?.rate || 0);
      const mandays = Number(row?.mandays || 0);
      const actualMandays = Number(row?.actualMandays || 0);
      const quantity = Number(row?.quantity || 1);

      if (rate > 0) {
        if (actualMandays === 0) {
          form.setValue(`items.${index}.amount`, 0, { shouldValidate: true });
        } else if (mandays > 0) {
          const computed = Math.round(((rate / mandays) * actualMandays * (quantity || 1)) * 100) / 100;
          form.setValue(`items.${index}.amount`, computed, { shouldValidate: true });
        }
      }
    }, 0);
  };

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
      await qc.invalidateQueries({ queryKey: ['invoices-summary'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      closeForm();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => invoicesApi.remove(deleting!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['invoices'] });
      await qc.invalidateQueries({ queryKey: ['invoices-summary'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeleting(null);
    },
  });

  const columns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Invoice No',
        render: (r: Invoice) => (
          <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md ring-1 ring-teal-200/60">
            {r.invoiceNumber}
          </span>
        ),
      },
      {
        key: 'date',
        header: 'Bill Date',
        render: (r: Invoice) => (
          <span className="text-xs text-slate-600 font-medium">{formatDate(r.date)}</span>
        ),
      },
      {
        key: 'client',
        header: 'Client Company',
        render: (r: Invoice) => (
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Building2 size={13} className="text-slate-400 shrink-0" />
            <span>{r.client?.companyName ?? '-'}</span>
          </div>
        ),
      },
      {
        key: 'site',
        header: 'Facility Site',
        render: (r: Invoice) => (
          <div className="flex items-center gap-1 text-slate-600 text-xs">
            <MapPin size={12} className="text-slate-400 shrink-0" />
            <span>{r.site?.name ?? '-'}</span>
          </div>
        ),
      },
      {
        key: 'period',
        header: 'Billing Period',
        render: (r: Invoice) => (
          <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
            <Calendar size={11} className="text-teal-600" />
            {formatDate(r.periodFrom)} - {formatDate(r.periodTo)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r: Invoice) => (
          <Badge
            tone={
              r.status === 'FINALIZED' ? 'green' : r.status === 'PENDING' ? 'amber' : 'slate'
            }
          >
            {r.status}
          </Badge>
        ),
      },
      {
        key: 'total',
        header: 'Total Amount',
        render: (r: Invoice) => (
          <span className="font-bold text-slate-900 tabular-nums">{formatMoney(r.total)}</span>
        ),
      },
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
            <DownloadExcelButton
              onClick={async () => {
                const res = await invoicesApi.excel(r.id);
                downloadBlob(res.data, `${r.invoiceNumber}.xlsx`);
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
        subtitle="Generate and manage monthly tax invoices with attendance mandays integration"
        badge={
          data?.pagination.total !== undefined ? (
            <Badge tone={statusFilter === 'ALL' ? 'teal' : statusFilter === 'FINALIZED' ? 'green' : 'amber'}>
              {data.pagination.total} {statusFilter === 'ALL' ? 'Total' : statusFilter === 'FINALIZED' ? 'Received' : 'Pending'}
            </Badge>
          ) : null
        }
        actions={
          <div className="flex items-center gap-2">
            <ExportButtons
              onExportExcel={async () => {
                const res = await invoicesApi.exportExcel({
                  search,
                  status: statusFilter !== 'ALL' ? statusFilter : undefined,
                });
                downloadBlob(res.data, 'invoices-list.xlsx');
              }}
              onExportPdf={async () => {
                const res = await invoicesApi.exportPdf({
                  search,
                  status: statusFilter !== 'ALL' ? statusFilter : undefined,
                });
                downloadBlob(res.data, 'invoices-list.pdf');
              }}
            />
            <Button
              size="sm"
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
                      rate: 19000,
                      mandays: 30,
                      actualMandays: 25,
                      amount: 15833.33,
                    },
                    {
                      serviceDetails: 'Housekeeping Attendant',
                      quantity: 1,
                      rate: 25000,
                      mandays: 30,
                      actualMandays: 20,
                      amount: 16666.67,
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
              <Plus size={15} strokeWidth={2.5} /> New Invoice
            </Button>
          </div>
        }
      />

      {/* Summary Cards with Interactive Filter */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:gap-3.5 sm:grid-cols-3">
        {/* Total Invoices Amount */}
        <StatsCard
          label="Total Invoices Amount"
          value={formatMoney(summaryData?.totalAmount ?? 0)}
          tone="teal"
          iconTone="teal"
          icon={<Receipt size={16} />}
          hint={`${summaryData?.totalCount ?? 0} Invoices Recorded`}
          active={statusFilter === 'ALL'}
          onClick={() => {
            setStatusFilter('ALL');
            setPage(1);
          }}
        />

        {/* Pending Invoices Amount */}
        <StatsCard
          label="Pending Invoices Amount"
          value={formatMoney(summaryData?.pendingAmount ?? 0)}
          tone="amber"
          iconTone="amber"
          icon={<Clock size={16} />}
          hint={`${summaryData?.pendingCount ?? 0} Invoices Pending`}
          active={statusFilter === 'PENDING'}
          onClick={() => {
            setStatusFilter((prev) => (prev === 'PENDING' ? 'ALL' : 'PENDING'));
            setPage(1);
          }}
        />

        {/* Received Invoices Amount */}
        <StatsCard
          label="Received Invoices Amount"
          value={formatMoney(summaryData?.receivedAmount ?? 0)}
          tone="emerald"
          iconTone="emerald"
          icon={<CheckCircle2 size={16} />}
          hint={`${summaryData?.receivedCount ?? 0} Invoices Received`}
          active={statusFilter === 'FINALIZED'}
          onClick={() => {
            setStatusFilter((prev) => (prev === 'FINALIZED' ? 'ALL' : 'FINALIZED'));
            setPage(1);
          }}
        />
      </div>

      <Toolbar>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search size={16} />
            </div>
            <Input
              placeholder="Search by invoice number or client company..."
              value={search}
              className="pl-10"
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>

          {statusFilter !== 'ALL' && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-500">Filtered:</span>
              <Badge tone={statusFilter === 'FINALIZED' ? 'green' : 'amber'}>
                {statusFilter === 'FINALIZED' ? 'Received Invoices' : 'Pending Invoices'}
              </Badge>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setPage(1);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/80 px-2 py-1 rounded-md border border-teal-200/70 transition cursor-pointer"
              >
                <RotateCcw size={11} /> Show All
              </button>
            </div>
          )}
        </div>
      </Toolbar>

      {isLoading ? <Spinner /> : <DataTable columns={columns} rows={data?.items ?? []} />}
      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      <Modal
        open={open}
        title={editing ? `Edit Invoice (${editing.invoiceNumber})` : 'Create Tax Invoice'}
        subtitle={
          editing
            ? `Update bill particulars, tax configuration, and service line calculations for invoice ${editing.invoiceNumber}`
            : 'Generate a GST compliant tax invoice with automated monthly manday computations'
        }
        icon={<Receipt size={20} className="text-teal-600" />}
        badge={
          editing ? (
            <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
              {editing.invoiceNumber}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200/70 shadow-2xs">
              New Invoice
            </span>
          )
        }
        onClose={closeForm}
        wide
        extraWide
      >
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
          {editing ? (
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-teal-50 via-teal-50/70 to-emerald-50/60 px-4 py-2.5 border border-teal-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-xs shadow-xs">
                  INV
                </div>
                <div>
                  <p className="text-xs font-bold text-teal-950">Invoice Number</p>
                  <p className="text-[11px] text-teal-700">Official GST reference identifier</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-teal-900 bg-white px-3 py-1 rounded-lg border border-teal-300 shadow-2xs">
                {editing.invoiceNumber}
              </span>
            </div>
          ) : null}

          {/* Card 1: Billing Period & Client Configuration */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-200/70 shadow-2xs">
                <Building2 size={14} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Billing Setup & Client Account</h3>
                <p className="text-[11px] text-slate-500">Assign client, deployment site, dates and applicable GST rate</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label required>Bill Date</Label>
                <Input type="date" icon={<Calendar size={15} />} {...form.register('date')} />
              </div>
              <div>
                <Label required>Invoice Status</Label>
                <Select icon={<CheckCircle2 size={15} />} {...form.register('status')}>
                  <option value="DRAFT">DRAFT</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FINALIZED">FINALIZED</option>
                </Select>
              </div>
              <div>
                <Label>GST Rate (%)</Label>
                <Input type="number" step="0.01" placeholder="e.g. 18" icon={<Percent size={15} />} {...form.register('gstPercent')} />
              </div>
              <div>
                <Label required>Client Company</Label>
                <Select icon={<Building2 size={15} />} {...form.register('clientId')}>
                  <option value="">Select client company</option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </Select>
                <FieldError message={form.formState.errors.clientId?.message} />
              </div>
              <div>
                <Label required>Facility Site / Location</Label>
                <Select icon={<MapPin size={15} />} {...form.register('siteId')}>
                  <option value="">Select facility site</option>
                  {(sites ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <FieldError message={form.formState.errors.siteId?.message} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label required>Period From</Label>
                  <Input type="date" icon={<Calendar size={15} />} {...form.register('periodFrom')} />
                </div>
                <div>
                  <Label required>Period To</Label>
                  <Input type="date" icon={<Calendar size={15} />} {...form.register('periodTo')} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Service Particulars & Manday Calculation */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-200/70 shadow-2xs">
                  <FileText size={14} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Service Particulars & Line Items</h3>
                  <p className="text-[11px] text-slate-500">
                    Formula: <span className="font-semibold text-slate-700">(Rate ÷ Total Mandays) × Actual Mandays × Qty</span>. Enter direct amount for fixed/materials charges.
                  </p>
                </div>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => append(emptyLine())} className="self-start sm:self-auto shadow-2xs">
                <Plus size={14} /> Add Particular Line
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="min-w-[840px]">
                <div className="grid grid-cols-[2.4fr_0.7fr_0.9fr_0.8fr_0.8fr_0.9fr_2.5rem] gap-2 border-b border-slate-200/90 bg-slate-50/80 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Particulars</span>
                  <span>Qty (W.O.)</span>
                  <span>Rate Per Month</span>
                  <span>Total Mandays</span>
                  <span>Actual Mandays</span>
                  <span>Amount (₹)</span>
                  <span className="sr-only">Actions</span>
                </div>

                <div className="divide-y divide-slate-100 bg-white">
                  {fields.map((field, index) => {
                    const rowVal = watchedItems?.[index];
                    const rate = Number(rowVal?.rate || 0);
                    const mandays = Number(rowVal?.mandays || 0);
                    const actual = Number(rowVal?.actualMandays || 0);
                    let rowWarning = '';
                    if (rate > 0) {
                      if (mandays <= 0) {
                        rowWarning = 'Total Mandays must be greater than 0.';
                      } else if (actual > mandays) {
                        rowWarning = 'Actual Mandays cannot exceed Total Mandays.';
                      }
                    }

                    return (
                      <div key={field.id} className="p-3">
                        <div className="grid grid-cols-[2.4fr_0.7fr_0.9fr_0.8fr_0.8fr_0.9fr_2.5rem] items-center gap-2">
                          <Input
                            placeholder="e.g. Housekeeping Attendant"
                            {...form.register(`items.${index}.serviceDetails`)}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="1"
                            title="QTY as per W.O."
                            {...form.register(`items.${index}.quantity`, {
                              onChange: () => calculateRowAmount(index),
                            })}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Rate / Mo"
                            title="Rate Per Month"
                            {...form.register(`items.${index}.rate`, {
                              onChange: () => calculateRowAmount(index),
                            })}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="30"
                            title="Total Mandays"
                            {...form.register(`items.${index}.mandays`, {
                              onChange: () => calculateRowAmount(index),
                            })}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Actual"
                            title="Actual Mandays"
                            {...form.register(`items.${index}.actualMandays`, {
                              onChange: () => calculateRowAmount(index),
                            })}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            title="Amount"
                            className="font-semibold text-slate-900 bg-slate-50/50"
                            {...form.register(`items.${index}.amount`)}
                          />
                          <div className="flex justify-center">
                            {fields.length > 1 ? (
                              <Button
                                type="button"
                                variant="danger"
                                size="icon"
                                title="Remove line"
                                aria-label="Remove line"
                                className="h-8.5 w-8.5"
                                onClick={() => remove(index)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            ) : (
                              <span className="inline-block h-8.5 w-8.5" />
                            )}
                          </div>
                        </div>
                        {rowWarning ? (
                          <p className="mt-1.5 text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                            ⚠️ {rowWarning}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Calculation Summary Banner */}
            <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-6 pt-3 border-t border-slate-100 text-xs">
              <div className="text-right">
                <span className="text-slate-400 font-medium mr-2">Taxable Subtotal:</span>
                <span className="font-mono font-bold text-slate-800">₹{formatMoney(formSubtotal)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-medium mr-2">GST ({watchedGstPercent || 0}%):</span>
                <span className="font-mono font-bold text-slate-800">+ ₹{formatMoney(formGstAmount)}</span>
              </div>
              <div className="text-right bg-teal-50/80 px-3 py-1.5 rounded-xl border border-teal-200/70">
                <span className="text-teal-700 font-semibold mr-2">Grand Total:</span>
                <span className="font-mono font-extrabold text-teal-900 text-sm">₹{formatMoney(formGrandTotal)}</span>
              </div>
            </div>
          </div>

          {error ? <Alert tone="error">{error}</Alert> : null}

          {/* Docked Action Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-200/80 bg-white -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-4 py-3.5 sm:px-6 sm:py-4 rounded-b-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              <span>
                Total Amount: <strong className="text-slate-900 font-mono">₹{formatMoney(formGrandTotal)}</strong>
              </span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={closeForm}>
                Cancel
              </Button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 shadow-xs hover:shadow-md transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {saveMutation.isPending
                  ? 'Saving...'
                  : editing
                    ? 'Save Changes'
                    : 'Generate Tax Invoice'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Tax Invoice"
        message={`Are you sure you want to delete invoice ${deleting?.invoiceNumber}? Linked monthly billing data may be affected.`}
        confirmLabel="Delete Invoice"
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
