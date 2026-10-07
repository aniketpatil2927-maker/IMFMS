import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Hash,
  IndianRupee,
  Landmark,
  MapPin,
  Package,
  Plus,
  Receipt,
  Search,
  Shirt,
  User,
  Wallet,
} from 'lucide-react';
import { employeesApi, expensesApi, sitesApi } from '../services/resources';
import type { Expense, ExpenseCategory, ExpensePaymentMode, ExpenseStatus } from '../types';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { ExportButtons } from '../components/ExportButtons';
import {
  Alert,
  Badge,
  Button,
  Card,
  FieldError,
  Input,
  Label,
  PageHeader,
  Select,
  Spinner,
  StatsCard,
  Textarea,
  Toolbar,
} from '../components/ui';
import { DeleteActionButton, EditActionButton } from '../components/ActionIconButtons';
import { downloadBlob, formatDate, formatMoney, getErrorMessage } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  category: z.enum(['MATERIAL', 'UNIFORM', 'ADVANCE', 'OTHER']),
  title: z.string().trim().min(1, 'Expense title is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  siteId: z.string().optional().or(z.literal('')),
  employeeId: z.string().optional().or(z.literal('')),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE']),
  vendorName: z.string().optional().or(z.literal('')),
  referenceNumber: z.string().optional().or(z.literal('')),
  status: z.enum(['PAID', 'PENDING', 'APPROVED']),
  notes: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const categoryMeta: Record<
  ExpenseCategory,
  { label: string; tone: 'emerald' | 'sky' | 'amber' | 'slate'; icon: typeof Package; desc: string }
> = {
  MATERIAL: {
    label: 'Material',
    tone: 'emerald',
    icon: Package,
    desc: 'Cleaning chemicals, mops, tools & consumables',
  },
  UNIFORM: {
    label: 'Uniform',
    tone: 'sky',
    icon: Shirt,
    desc: 'Staff uniforms, shoes, gloves & badges',
  },
  ADVANCE: {
    label: 'Staff Advance',
    tone: 'amber',
    icon: Banknote,
    desc: 'Employee salary & emergency cash advances',
  },
  OTHER: {
    label: 'Other',
    tone: 'slate',
    icon: Wallet,
    desc: 'Facility repair, transport & general expenses',
  },
};

export function ExpensesPage() {
  const { hasRole, user } = useAuth();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF');
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [siteFilter, setSiteFilter] = useState(user?.siteId ?? '');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [error, setError] = useState('');

  const { data: sites } = useQuery({
    queryKey: ['sites-lite'],
    queryFn: async () => (await sitesApi.lite()).data.data!,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-lite', siteFilter],
    queryFn: async () =>
      (
        await employeesApi.list({
          siteId: siteFilter || undefined,
          limit: 200,
        })
      ).data.data!.items,
  });

  const { data: summary } = useQuery({
    queryKey: ['expenses-summary', siteFilter],
    queryFn: async () =>
      (await expensesApi.summary({ siteId: siteFilter || undefined })).data.data!,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', search, categoryFilter, siteFilter, page],
    queryFn: async () =>
      (
        await expensesApi.list({
          search,
          category: categoryFilter !== 'ALL' ? (categoryFilter as ExpenseCategory) : undefined,
          siteId: siteFilter || undefined,
          page,
          limit: 10,
        })
      ).data.data!,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      category: 'MATERIAL',
      title: '',
      amount: 0,
      siteId: '',
      employeeId: '',
      paymentMode: 'CASH',
      vendorName: '',
      referenceNumber: '',
      status: 'PAID',
      notes: '',
    },
  });

  const selectedCategory = form.watch('category');

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    setError('');
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        siteId: values.siteId || null,
        employeeId: values.employeeId || null,
        vendorName: values.vendorName || null,
        referenceNumber: values.referenceNumber || null,
        notes: values.notes || null,
      };
      if (editing) return expensesApi.update(editing.id, payload);
      return expensesApi.create(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['expenses'] });
      await qc.invalidateQueries({ queryKey: ['expenses-summary'] });
      closeForm();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => expensesApi.remove(deleting!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['expenses'] });
      await qc.invalidateQueries({ queryKey: ['expenses-summary'] });
      setDeleting(null);
    },
  });

  const columns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Voucher No',
        render: (r: Expense) => (
          <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md ring-1 ring-teal-200/60">
            {r.expenseNumber}
          </span>
        ),
      },
      {
        key: 'date',
        header: 'Date',
        render: (r: Expense) => (
          <span className="text-xs text-slate-600 font-medium">{formatDate(r.date)}</span>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        render: (r: Expense) => {
          const meta = categoryMeta[r.category] || categoryMeta.OTHER;
          const Icon = meta.icon;
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                r.category === 'MATERIAL'
                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70'
                  : r.category === 'UNIFORM'
                    ? 'bg-sky-50 text-sky-800 ring-1 ring-sky-200/70'
                    : r.category === 'ADVANCE'
                      ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/70'
                      : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/70'
              }`}
            >
              <Icon size={13} className="shrink-0" />
              {meta.label}
            </span>
          );
        },
      },
      {
        key: 'title',
        header: 'Expense Particulars',
        render: (r: Expense) => (
          <div>
            <p className="font-bold text-slate-900 text-xs sm:text-sm">{r.title}</p>
            {r.vendorName || r.referenceNumber ? (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {r.vendorName ? `Vendor: ${r.vendorName}` : ''}
                {r.vendorName && r.referenceNumber ? ' • ' : ''}
                {r.referenceNumber ? `Ref: ${r.referenceNumber}` : ''}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'site',
        header: 'Site / Location',
        render: (r: Expense) =>
          r.site ? (
            <div className="flex items-center gap-1 text-slate-700 text-xs font-medium">
              <MapPin size={12} className="text-teal-600 shrink-0" />
              <span>{r.site.name}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Head Office / General</span>
          ),
      },
      {
        key: 'employee',
        header: 'Staff Member',
        render: (r: Expense) =>
          r.employee ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
                {r.employee.employeeCode}
              </span>
              <span className="text-xs font-semibold text-slate-800">{r.employee.name}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          ),
      },
      {
        key: 'paymentMode',
        header: 'Payment Mode',
        render: (r: Expense) => (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
            <CreditCard size={11} className="text-slate-400" />
            {r.paymentMode.replace('_', ' ')}
          </span>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        render: (r: Expense) => (
          <span className="font-bold text-slate-900 tabular-nums text-sm">
            {formatMoney(r.amount)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (r: Expense) =>
          canManage ? (
            <div className="flex items-center gap-1.5">
              <EditActionButton
                onClick={() => {
                  setEditing(r);
                  form.reset({
                    date: r.date.slice(0, 10),
                    category: r.category,
                    title: r.title,
                    amount: Number(r.amount),
                    siteId: r.siteId ?? '',
                    employeeId: r.employeeId ?? '',
                    paymentMode: r.paymentMode,
                    vendorName: r.vendorName ?? '',
                    referenceNumber: r.referenceNumber ?? '',
                    status: r.status as ExpenseStatus,
                    notes: r.notes ?? '',
                  });
                  setError('');
                  setOpen(true);
                }}
              />
              <DeleteActionButton onClick={() => setDeleting(r)} />
            </div>
          ) : (
            <span className="text-xs text-slate-400">View only</span>
          ),
      },
    ],
    [canManage, form],
  );

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Track and manage facility operations outflow for Material, Uniform, and Staff Advance"
        badge={
          data?.pagination.total !== undefined ? (
            <Badge tone="teal">{data.pagination.total} Total Records</Badge>
          ) : null
        }
        actions={
          <div className="flex items-center gap-2">
            <ExportButtons
              onExportExcel={async () => {
                const res = await expensesApi.exportExcel({
                  search,
                  category: categoryFilter !== 'ALL' ? (categoryFilter as ExpenseCategory) : undefined,
                  siteId: siteFilter || undefined,
                });
                downloadBlob(res.data, 'expenses-register.xlsx');
              }}
              onExportPdf={async () => {
                const res = await expensesApi.exportPdf({
                  search,
                  category: categoryFilter !== 'ALL' ? (categoryFilter as ExpenseCategory) : undefined,
                  siteId: siteFilter || undefined,
                });
                downloadBlob(res.data, 'expenses-register.pdf');
              }}
            />
            {canManage ? (
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  setEditing(null);
                  form.reset({
                    date: new Date().toISOString().slice(0, 10),
                    category: 'MATERIAL',
                    title: '',
                    amount: 0,
                    siteId: siteFilter || '',
                    employeeId: '',
                    paymentMode: 'CASH',
                    vendorName: '',
                    referenceNumber: '',
                    status: 'PAID',
                    notes: '',
                  });
                  setError('');
                  setOpen(true);
                }}
              >
                <Plus size={15} strokeWidth={2.5} /> Add Expense
              </Button>
            ) : null}
          </div>
        }
      />

      {/* KPI Cards: Material, Uniform, Advance, Total */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        {/* Total Expenses */}
        <StatsCard
          label="Total Outflow"
          value={formatMoney(summary?.totalAmount ?? 0)}
          tone="indigo"
          iconTone="indigo"
          icon={<Wallet size={16} />}
          hint={`${summary?.totalCount ?? 0} total recorded transactions`}
          active={categoryFilter === 'ALL'}
          onClick={() => {
            setCategoryFilter('ALL');
            setPage(1);
          }}
        />

        {/* Material */}
        <StatsCard
          label="Material Expenses"
          value={formatMoney(summary?.materialAmount ?? 0)}
          tone="emerald"
          iconTone="emerald"
          icon={<Package size={16} />}
          hint={`${summary?.materialCount ?? 0} purchases (chemicals, mops)`}
          active={categoryFilter === 'MATERIAL'}
          onClick={() => {
            setCategoryFilter((prev) => (prev === 'MATERIAL' ? 'ALL' : 'MATERIAL'));
            setPage(1);
          }}
        />

        {/* Uniform */}
        <StatsCard
          label="Uniform Expenses"
          value={formatMoney(summary?.uniformAmount ?? 0)}
          tone="sky"
          iconTone="sky"
          icon={<Shirt size={16} />}
          hint={`${summary?.uniformCount ?? 0} disbursements (sets & gear)`}
          active={categoryFilter === 'UNIFORM'}
          onClick={() => {
            setCategoryFilter((prev) => (prev === 'UNIFORM' ? 'ALL' : 'UNIFORM'));
            setPage(1);
          }}
        />

        {/* Advance */}
        <StatsCard
          label="Staff Advance"
          value={formatMoney(summary?.advanceAmount ?? 0)}
          tone="amber"
          iconTone="amber"
          icon={<Banknote size={16} />}
          hint={`${summary?.advanceCount ?? 0} advances issued to staff`}
          active={categoryFilter === 'ADVANCE'}
          onClick={() => {
            setCategoryFilter((prev) => (prev === 'ADVANCE' ? 'ALL' : 'ADVANCE'));
            setPage(1);
          }}
        />
      </div>

      {/* Category Tabs */}
      <div className="mb-3.5 flex flex-wrap gap-1.5 border-b border-slate-200/80 pb-2.5">
        {[
          { key: 'ALL', label: 'All Expenses', icon: Wallet },
          { key: 'MATERIAL', label: 'Material', icon: Package },
          { key: 'UNIFORM', label: 'Uniform', icon: Shirt },
          { key: 'ADVANCE', label: 'Staff Advance', icon: Banknote },
          { key: 'OTHER', label: 'Other', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = categoryFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setCategoryFilter(tab.key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Toolbar>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 w-full">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search size={16} />
            </div>
            <Input
              placeholder="Search by title, voucher, vendor, staff, site..."
              value={search}
              className="pl-10"
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>

          <Select
            value={siteFilter}
            onChange={(e) => {
              setPage(1);
              setSiteFilter(e.target.value);
            }}
          >
            <option value="">All facility sites</option>
            {(sites ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <Select
            value={categoryFilter}
            onChange={(e) => {
              setPage(1);
              setCategoryFilter(e.target.value);
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="MATERIAL">Material (Chemicals & Tools)</option>
            <option value="UNIFORM">Uniform (Clothing & Shoes)</option>
            <option value="ADVANCE">Staff Advance (Salary Advance)</option>
            <option value="OTHER">Other Expenses</option>
          </Select>
        </div>
      </Toolbar>

      {isLoading ? <Spinner /> : <DataTable columns={columns} rows={data?.items ?? []} />}
      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      {/* Modal Form */}
      <Modal
        open={open}
        title={editing ? 'Edit Expense Record' : 'Record New Expense'}
        subtitle={
          editing
            ? `Update expense transaction details for voucher ${editing.expenseNumber}`
            : 'Track company expenditures for materials, uniforms, staff advances, or operations'
        }
        icon={<Wallet size={20} className="text-teal-600" />}
        badge={
          editing ? (
            <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
              {editing.expenseNumber}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200/70 shadow-2xs">
              New Expense
            </span>
          )
        }
        onClose={closeForm}
        wide
      >
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
          {editing ? (
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-teal-50 via-teal-50/70 to-emerald-50/60 px-4 py-2.5 border border-teal-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-xs shadow-xs">
                  EXP
                </div>
                <div>
                  <p className="text-xs font-bold text-teal-950">Expense Voucher Number</p>
                  <p className="text-[11px] text-teal-700">Audit trail identifier for financial accounts</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-teal-900 bg-white px-3 py-1 rounded-lg border border-teal-300 shadow-2xs">
                {editing.expenseNumber}
              </span>
            </div>
          ) : null}

          {/* Card 1: Category Selector */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-200/70 shadow-2xs">
                <Receipt size={14} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Select Expense Category</h3>
                <p className="text-[11px] text-slate-500">Classify the transaction purpose for ledger reporting</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['MATERIAL', 'UNIFORM', 'ADVANCE', 'OTHER'] as const).map((cat) => {
                const meta = categoryMeta[cat];
                const Icon = meta.icon;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => form.setValue('category', cat)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer select-none ${
                      isSelected
                        ? 'border-teal-600 bg-gradient-to-b from-teal-50 to-teal-50/40 text-teal-900 font-bold ring-2 ring-teal-600/20 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl mb-1.5 transition ${
                        isSelected ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <span className="text-xs font-semibold">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Particulars & Amount */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/70 shadow-2xs">
                <Banknote size={14} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Particulars & Amount Details</h3>
                <p className="text-[11px] text-slate-500">Disbursement amount, date, and itemized title</p>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label required>
                  Expense Title / Particulars
                  {selectedCategory === 'MATERIAL'
                    ? ' (e.g. Disinfectant Chemicals & Floor Washers)'
                    : selectedCategory === 'UNIFORM'
                      ? ' (e.g. Navy Blue Staff Uniforms & Safety Shoes)'
                      : selectedCategory === 'ADVANCE'
                        ? ' (e.g. Emergency Salary Advance)'
                        : ''}
                </Label>
                <Input
                  icon={<Receipt size={15} />}
                  placeholder="Brief description of the expense..."
                  {...form.register('title')}
                />
                <FieldError message={form.formState.errors.title?.message} />
              </div>

              <div>
                <Label required>Amount (₹)</Label>
                <Input
                  icon={<IndianRupee size={15} />}
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000"
                  {...form.register('amount')}
                />
                <FieldError message={form.formState.errors.amount?.message} />
              </div>

              <div>
                <Label required>Expense Date</Label>
                <Input icon={<Calendar size={15} />} type="date" {...form.register('date')} />
                <FieldError message={form.formState.errors.date?.message} />
              </div>

              <div>
                <Label>Facility Site Location</Label>
                <Select icon={<Building2 size={15} />} {...form.register('siteId')}>
                  <option value="">Head Office / General Operations</option>
                  {(sites ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>
                  Linked Staff Member
                  {selectedCategory === 'ADVANCE' ? ' (Required for advance tracking)' : ' (Optional)'}
                </Label>
                <Select icon={<User size={15} />} {...form.register('employeeId')}>
                  <option value="">Select staff member...</option>
                  {(employees ?? []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employeeCode})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Card 3: Settlement & Payment Details */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70 shadow-2xs">
                <CreditCard size={14} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Settlement & Vendor Details</h3>
                <p className="text-[11px] text-slate-500">Payment mode, approval status, vendor name, and bill reference</p>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label>Payment Mode</Label>
                <Select icon={<CreditCard size={15} />} {...form.register('paymentMode')}>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / Google Pay</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="ONLINE">Online Card / Netbanking</option>
                </Select>
              </div>

              <div>
                <Label>Payment Status</Label>
                <Select icon={<CheckCircle2 size={15} />} {...form.register('status')}>
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                </Select>
              </div>

              <div>
                <Label>Vendor / Supplier / Recipient</Label>
                <Input
                  icon={<Landmark size={15} />}
                  placeholder="e.g. CleanTech Supplies, Shree Garments"
                  {...form.register('vendorName')}
                />
              </div>

              <div>
                <Label>Bill / Voucher / Ref Number</Label>
                <Input
                  icon={<Hash size={15} />}
                  placeholder="e.g. BILL-9821, UPI-89423"
                  {...form.register('referenceNumber')}
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Notes & Remarks</Label>
                <Textarea
                  rows={2}
                  placeholder="Additional context, repayment terms, or invoice references..."
                  {...form.register('notes')}
                />
              </div>
            </div>
          </div>

          {error ? <Alert tone="error">{error}</Alert> : null}

          {/* Sticky Docked Action Footer */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-slate-200/80 bg-white -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-4 py-3.5 sm:px-6 sm:py-4 rounded-b-2xl shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              <span>Fields with (<span className="text-rose-500 font-bold">*</span>) are mandatory</span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="secondary" size="md" type="button" onClick={closeForm}>
                Cancel
              </Button>
              <Button
                size="md"
                type="submit"
                loading={saveMutation.isPending}
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-teal-600 via-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm hover:shadow-teal-600/20"
              >
                <CheckCircle2 size={16} />
                <span>{editing ? 'Save Changes' : 'Record Expense'}</span>
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleting}
        title="Delete Expense Record"
        message={`Are you sure you want to delete expense ${deleting?.expenseNumber} (${deleting?.title} - ${formatMoney(deleting?.amount ?? 0)})? This will remove the transaction from accounting records.`}
        confirmLabel="Delete Expense"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
