import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { Building2, Calendar, CheckCircle2, Clock, FileSpreadsheet, FileText, MapPin, Percent, Plus, RotateCcw, Search, Trash2, Users } from 'lucide-react';
import { clientsApi, quotationsApi, sitesApi } from '../services/resources';
import type { Quotation } from '../types';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { ExportButtons } from '../components/ExportButtons';
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
  Textarea,
  Toolbar,
  cn,
} from '../components/ui';
import { DownloadPdfButton, PdfPreviewModal, ViewPdfButton } from '../components/PdfPreviewModal';
import {
  DeleteActionButton,
  DuplicateActionButton,
  EditActionButton,
} from '../components/ActionIconButtons';
import { downloadBlob, formatDate, formatMoney, getErrorMessage } from '../utils/helpers';

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  clientId: z.string().min(1, 'Client is required'),
  siteId: z.string().min(1, 'Site is required'),
  terms: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'FINALIZED']),
  gstPercent: z.coerce.number().min(0).max(100),
  items: z
    .array(
      z.object({
        serviceDescription: z.string().min(1, 'Description required'),
        numberOfEmployees: z.coerce.number().int().min(0),
        duty: z.string().optional(),
        rate: z.coerce.number().positive('Rate must be positive'),
      }),
    )
    .min(1, 'At least one line item is required'),
});

type FormValues = z.infer<typeof schema>;

export function QuotationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FINALIZED' | 'PENDING'>('ALL');
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

  const { data: summaryData } = useQuery({
    queryKey: ['quotations-summary'],
    queryFn: async () => (await quotationsApi.summary()).data.data!,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', search, page, statusFilter],
    queryFn: async () =>
      (
        await quotationsApi.list({
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
      items: [{ serviceDescription: 'Housekeeping Staff', numberOfEmployees: 1, duty: '8 Hrs', rate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const clientId = form.watch('clientId');
  const watchedItems = form.watch('items');
  const watchedGstPercent = form.watch('gstPercent');

  const formSubtotal = useMemo(() => {
    return (watchedItems || []).reduce((acc, it) => {
      const qty = Number(it?.numberOfEmployees) || 0;
      const rate = Number(it?.rate) || 0;
      const amt = qty > 0 ? qty * rate : rate;
      return acc + amt;
    }, 0);
  }, [watchedItems]);
  const formGstAmount = (formSubtotal * (Number(watchedGstPercent) || 0)) / 100;
  const formGrandTotal = formSubtotal + formGstAmount;

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
      await qc.invalidateQueries({ queryKey: ['quotations-summary'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      closeForm();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => quotationsApi.duplicate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['quotations'] });
      await qc.invalidateQueries({ queryKey: ['quotations-summary'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => quotationsApi.remove(deleting!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['quotations'] });
      await qc.invalidateQueries({ queryKey: ['quotations-summary'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
      {
        key: 'number',
        header: 'Quotation No',
        render: (r: Quotation) => (
          <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md ring-1 ring-teal-200/60">
            {r.quotationNumber}
          </span>
        ),
      },
      {
        key: 'date',
        header: 'Date',
        render: (r: Quotation) => (
          <span className="text-xs text-slate-600 font-medium">{formatDate(r.date)}</span>
        ),
      },
      {
        key: 'client',
        header: 'Client Company',
        render: (r: Quotation) => (
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Building2 size={13} className="text-slate-400 shrink-0" />
            <span>{r.client?.companyName ?? '-'}</span>
          </div>
        ),
      },
      {
        key: 'site',
        header: 'Site',
        render: (r: Quotation) => (
          <div className="flex items-center gap-1 text-slate-600 text-xs">
            <MapPin size={12} className="text-slate-400 shrink-0" />
            <span>{r.site?.name ?? '-'}</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r: Quotation) => (
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
        render: (r: Quotation) => (
          <span className="font-bold text-slate-900 tabular-nums">{formatMoney(r.total)}</span>
        ),
      },
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
        subtitle="Create, manage, duplicate, and export facility service quotations"
        badge={
          data?.pagination.total !== undefined ? (
            <Badge tone={statusFilter === 'ALL' ? 'teal' : statusFilter === 'FINALIZED' ? 'green' : 'amber'}>
              {data.pagination.total} {statusFilter === 'ALL' ? 'Total' : statusFilter === 'FINALIZED' ? 'Raised' : 'Pending'}
            </Badge>
          ) : null
        }
        actions={
          <div className="flex items-center gap-2">
            <ExportButtons
              onExportExcel={async () => {
                const res = await quotationsApi.exportExcel({
                  search,
                  status: statusFilter !== 'ALL' ? statusFilter : undefined,
                });
                downloadBlob(res.data, 'quotations-list.xlsx');
              }}
              onExportPdf={async () => {
                const res = await quotationsApi.exportPdf({
                  search,
                  status: statusFilter !== 'ALL' ? statusFilter : undefined,
                });
                downloadBlob(res.data, 'quotations-list.pdf');
              }}
            />
            <Button size="sm" type="button" onClick={openCreate}>
              <Plus size={15} strokeWidth={2.5} /> New Quotation
            </Button>
          </div>
        }
      />

      {/* Summary Cards with Interactive Filter */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:gap-3.5 sm:grid-cols-3">
        {/* Total Quotation */}
        <StatsCard
          label="Total Quotation"
          value={summaryData?.totalCount ?? 0}
          unit={(summaryData?.totalCount ?? 0) === 1 ? 'Quotation' : 'Quotations'}
          tone="teal"
          iconTone="amber"
          icon={<FileText size={16} />}
          hint="All Quotations Recorded"
          active={statusFilter === 'ALL'}
          onClick={() => {
            setStatusFilter('ALL');
            setPage(1);
          }}
        />

        {/* Quotation Raised */}
        <StatsCard
          label="Quotation Raised"
          value={summaryData?.raisedCount ?? 0}
          unit={(summaryData?.raisedCount ?? 0) === 1 ? 'Raised' : 'Raised'}
          tone="emerald"
          iconTone="emerald"
          icon={<CheckCircle2 size={16} />}
          hint="Finalized & Raised"
          active={statusFilter === 'FINALIZED'}
          onClick={() => {
            setStatusFilter((prev) => (prev === 'FINALIZED' ? 'ALL' : 'FINALIZED'));
            setPage(1);
          }}
        />

        {/* Quotation Pending */}
        <StatsCard
          label="Quotation Pending"
          value={summaryData?.pendingCount ?? 0}
          unit={(summaryData?.pendingCount ?? 0) === 1 ? 'Pending' : 'Pending'}
          tone="amber"
          iconTone="rose"
          icon={<Clock size={16} />}
          hint="Draft & Pending Approval"
          active={statusFilter === 'PENDING'}
          onClick={() => {
            setStatusFilter((prev) => (prev === 'PENDING' ? 'ALL' : 'PENDING'));
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
              placeholder="Search by quotation number or client company..."
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
                {statusFilter === 'FINALIZED' ? 'Raised Quotations' : 'Pending Quotations'}
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
        title={editing ? `Edit Quotation (${editing.quotationNumber})` : 'Create New Quotation'}
        subtitle={
          editing
            ? `Update service line items, duty schedules, and billing rates for quotation ${editing.quotationNumber}`
            : 'Prepare a commercial proposal with manpower allocations, duty hours, and tax calculations'
        }
        icon={<FileSpreadsheet size={20} className="text-teal-600" />}
        badge={
          editing ? (
            <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
              {editing.quotationNumber}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200/70 shadow-2xs">
              New Quotation
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
                  QTN
                </div>
                <div>
                  <p className="text-xs font-bold text-teal-950">Quotation Identifier</p>
                  <p className="text-[11px] text-teal-700">Official commercial proposal reference</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-teal-900 bg-white px-3 py-1 rounded-lg border border-teal-300 shadow-2xs">
                {editing.quotationNumber}
              </span>
            </div>
          ) : null}

          {/* Card 1: Quotation Details & Client Mapping */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-200/70 shadow-2xs">
                <Building2 size={14} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Quotation Setup & Client Allocation</h3>
                <p className="text-[11px] text-slate-500">Configure proposal date, client organization, target site, and tax rate</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label required>Proposal Date</Label>
                <Input type="date" icon={<Calendar size={15} />} {...form.register('date')} />
              </div>
              <div>
                <Label required>Quotation Status</Label>
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
              <div className="sm:col-span-2 lg:col-span-2">
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
            </div>
          </div>

          {/* Card 2: Service Lines & Staffing Quota */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-200/70 shadow-2xs">
                  <FileText size={14} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Service Line Items & Deployment Rates</h3>
                  <p className="text-[11px] text-slate-500">Specify personnel roles, required headcount, shift hours, and unit monthly cost</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  append({ serviceDescription: '', numberOfEmployees: 1, duty: '8 Hrs', rate: 0 })
                }
                className="self-start sm:self-auto shadow-2xs"
              >
                <Plus size={14} /> Add Line Item
              </Button>
            </div>

            <div className="space-y-2.5">
              {fields.map((field, index) => {
                const item = watchedItems?.[index];
                const qty = Number(item?.numberOfEmployees) || 0;
                const rate = Number(item?.rate) || 0;
                const lineTotal = qty > 0 ? qty * rate : rate;

                return (
                  <div
                    key={field.id}
                    className="group relative rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-slate-50 p-3 sm:p-3.5 transition shadow-2xs"
                  >
                    <div className="grid gap-3 sm:grid-cols-12 items-center">
                      <div className="sm:col-span-4">
                        <Label className="text-[11px] text-slate-500 mb-1">Service / Role</Label>
                        <Input
                          placeholder="e.g. Housekeeping Staff"
                          {...form.register(`items.${index}.serviceDescription`)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] text-slate-500 mb-1">Headcount</Label>
                        <Input
                          type="number"
                          placeholder="Staff Qty"
                          icon={<Users size={14} />}
                          {...form.register(`items.${index}.numberOfEmployees`)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] text-slate-500 mb-1">Duty Shift</Label>
                        <Input
                          placeholder="e.g. 8 Hrs"
                          icon={<Clock size={14} />}
                          {...form.register(`items.${index}.duty`)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] text-slate-500 mb-1">Rate / Person (₹)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Rate (₹)"
                          {...form.register(`items.${index}.rate`)}
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Line Amount</p>
                          <p className="text-xs font-bold text-slate-800 font-mono">₹{formatMoney(lineTotal)}</p>
                        </div>
                        {fields.length > 1 ? (
                          <Button
                            type="button"
                            variant="danger"
                            size="icon"
                            onClick={() => remove(index)}
                            title="Remove item"
                            className="h-8.5 w-8.5 shrink-0"
                          >
                            <Trash2 size={13} />
                          </Button>
                        ) : (
                          <span className="w-8.5 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                <span className="text-teal-700 font-semibold mr-2">Total Proposal:</span>
                <span className="font-mono font-extrabold text-teal-900 text-sm">₹{formatMoney(formGrandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Terms & Scope */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-200/70 shadow-2xs">
                <FileText size={14} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Terms, Conditions & Scope of Work</h3>
                <p className="text-[11px] text-slate-500">Payment terms, statutory compliance commitments, billing cycles</p>
              </div>
            </div>
            <Textarea
              rows={3}
              placeholder="Standard terms, payment schedules, uniforms, and statutory compliance commitments..."
              {...form.register('terms')}
            />
          </div>

          {error ? <Alert tone="error">{error}</Alert> : null}

          {/* Docked Action Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-200/80 bg-white -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-4 py-3.5 sm:px-6 sm:py-4 rounded-b-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              <span>
                Proposal Value: <strong className="text-slate-900 font-mono">₹{formatMoney(formGrandTotal)}</strong>
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
                    : 'Generate Quotation'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Quotation"
        message={`Are you sure you want to delete ${deleting?.quotationNumber}? This action cannot be undone.`}
        confirmLabel="Delete Quotation"
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
