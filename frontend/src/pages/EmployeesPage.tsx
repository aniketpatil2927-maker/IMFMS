import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Hash,
  IndianRupee,
  Landmark,
  MapPin,
  Phone,
  Plus,
  Search,
  User,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { employeesApi, sitesApi } from '../services/resources';
import type { Employee } from '../types';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { ExportButtons } from '../components/ExportButtons';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  FieldError,
  Input,
  Label,
  PageHeader,
  Select,
  Spinner,
  StatsCard,
  Toolbar,
} from '../components/ui';
import {
  DisableActionButton,
  EditActionButton,
  TransferActionButton,
} from '../components/ActionIconButtons';
import { downloadBlob, formatDate, formatMoney, getErrorMessage } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';

const schema = z.object({
  employeeCode: z.string().optional(),
  name: z.string().trim().min(1, 'Full name is required'),
  mobile: z
    .string()
    .trim()
    .min(1, 'Registered Mobile Number is required.')
    .regex(/^[0-9+\s-]{10,15}$/, 'Please enter a valid mobile number'),
  aadhaar: z
    .string()
    .trim()
    .min(1, 'Aadhaar Card Number is required.')
    .regex(/^\d{4}\s?\d{4}\s?\d{4}$|^\d{12}$/, 'Please enter a valid 12-digit Aadhaar Card Number'),
  pan: z
    .string()
    .trim()
    .min(1, 'PAN Card Number is required.')
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, 'Please enter a valid PAN Card Number'),
  bankName: z.string().trim().min(1, 'Bank Name is required.'),
  accountNumber: z.string().trim().min(1, 'Account Number is required.'),
  ifscCode: z
    .string()
    .trim()
    .min(1, 'IFSC Code is required.')
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, 'Please enter a valid IFSC Code'),
  branch: z.string().trim().min(1, 'Branch is required.'),
  designation: z.string().trim().min(1, 'Designation is required'),
  salary: z.coerce.number().positive('Monthly salary must be a positive number'),
  joiningDate: z.string().trim().min(1, 'Joining date is required'),
  siteId: z.string().trim().min(1, 'Site selection is required'),
});

type FormValues = z.infer<typeof schema>;

const SITE_CARD_TONES: Array<'teal' | 'sky' | 'amber' | 'rose' | 'emerald' | 'indigo'> = [
  'sky',
  'emerald',
  'indigo',
  'amber',
  'rose',
  'teal',
];

export function EmployeesPage() {
  const { hasRole, user } = useAuth();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN');
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSiteParam = searchParams.get('site'); // null = cards view, 'all' = all sites records, '<siteId>' = site records
  const isCardsView = !activeSiteParam;
  const siteFilter = activeSiteParam && activeSiteParam !== 'all' ? activeSiteParam : '';

  const [search, setSearch] = useState('');
  const [siteSearch, setSiteSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [transferring, setTransferring] = useState<Employee | null>(null);
  const [transferSiteId, setTransferSiteId] = useState('');
  const [disabling, setDisabling] = useState<Employee | null>(null);
  const [error, setError] = useState('');

  const { data: sites, isLoading: isSitesLoading } = useQuery({
    queryKey: ['sites-lite'],
    queryFn: async () => (await sitesApi.lite()).data.data!,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, siteFilter, page],
    enabled: !isCardsView,
    queryFn: async () =>
      (
        await employeesApi.list({
          search,
          page,
          limit: 10,
          siteId: siteFilter || undefined,
        })
      ).data.data!,
  });

  const availableSites = useMemo(() => {
    if (!sites) return [];
    if (!canManage && user?.siteId) {
      return sites.filter((s) => s.id === user.siteId);
    }
    return sites;
  }, [sites, canManage, user?.siteId]);

  const filteredSites = useMemo(() => {
    if (!siteSearch.trim()) return availableSites;
    const q = siteSearch.toLowerCase();
    return availableSites.filter((s) => s.name.toLowerCase().includes(q));
  }, [availableSites, siteSearch]);

  const totalEmployeesCount = useMemo(() => {
    const sumSites = (sites ?? []).reduce((acc, s) => acc + (s._count?.employees ?? 0), 0);
    if (!siteFilter && data?.pagination.total !== undefined) {
      return Math.max(data.pagination.total, sumSites);
    }
    return sumSites;
  }, [sites, siteFilter, data?.pagination.total]);

  const selectedSite = useMemo(() => {
    if (!siteFilter) return null;
    return (sites ?? []).find((s) => s.id === siteFilter);
  }, [sites, siteFilter]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    setError('');
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) return employeesApi.update(editing.id, values);
      return employeesApi.create(values);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employees'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      await qc.invalidateQueries({ queryKey: ['sites-lite'] });
      closeForm();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const transferMutation = useMutation({
    mutationFn: async () => employeesApi.transfer(transferring!.id, transferSiteId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employees'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      await qc.invalidateQueries({ queryKey: ['sites-lite'] });
      setTransferring(null);
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => employeesApi.disable(disabling!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employees'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      await qc.invalidateQueries({ queryKey: ['sites-lite'] });
      setDisabling(null);
    },
  });

  const columns = useMemo(
    () => [
      {
        key: 'code',
        header: 'Staff ID',
        render: (r: Employee) => (
          <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md ring-1 ring-teal-200/60">
            {r.employeeCode}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Employee Name',
        render: (r: Employee) => (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold text-xs ring-1 ring-slate-200/60">
              {r.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-900">{r.name}</p>
              {r.joiningDate ? (
                <p className="text-[11px] text-slate-400">Joined {formatDate(r.joiningDate)}</p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: 'mobile',
        header: 'Mobile',
        render: (r: Employee) => (
          <span className="inline-flex items-center gap-1 text-slate-700 font-medium text-xs">
            <Phone size={12} className="text-slate-400" /> {r.mobile}
          </span>
        ),
      },
      {
        key: 'designation',
        header: 'Designation',
        render: (r: Employee) => (
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {r.designation}
          </span>
        ),
      },
      {
        key: 'salary',
        header: 'Monthly Wage',
        render: (r: Employee) => (
          <span className="font-bold text-slate-900 tabular-nums">{formatMoney(r.salary)}</span>
        ),
      },
      {
        key: 'site',
        header: 'Assigned Site',
        render: (r: Employee) => (
          <div className="flex items-center gap-1 text-slate-700 text-xs font-medium">
            <MapPin size={12} className="text-teal-600 shrink-0" />
            <span>{r.site?.name ?? '-'}</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r: Employee) => (
          <Badge tone={r.isActive ? 'green' : 'red'}>{r.isActive ? 'Active' : 'Disabled'}</Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (r: Employee) =>
          canManage ? (
            <div className="flex items-center gap-1.5">
              <EditActionButton
                onClick={() => {
                  setEditing(r);
                  form.reset({
                    employeeCode: r.employeeCode,
                    name: r.name,
                    mobile: r.mobile,
                    aadhaar: r.aadhaar ?? '',
                    pan: r.pan ?? '',
                    bankName: r.bankName ?? '',
                    accountNumber: r.accountNumber ?? '',
                    ifscCode: r.ifscCode ?? '',
                    branch: r.branch ?? '',
                    designation: r.designation,
                    salary: Number(r.salary),
                    joiningDate: r.joiningDate.slice(0, 10),
                    siteId: r.siteId,
                  });
                  setError('');
                  setOpen(true);
                }}
              />
              {r.isActive ? (
                <>
                  <TransferActionButton
                    onClick={() => {
                      setTransferring(r);
                      setTransferSiteId(r.siteId);
                    }}
                  />
                  <DisableActionButton onClick={() => setDisabling(r)} />
                </>
              ) : null}
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
      {isCardsView ? (
        /* ========================================================
           VIEW 1: CARDS ONLY (Sites Overview)
           ======================================================== */
        <div>
          <PageHeader
            title="Employees"
            subtitle="Select a facility site to view its assigned housekeeping staff roster and records"
            badge={
              totalEmployeesCount !== undefined ? (
                <Badge tone="teal">
                  {totalEmployeesCount} Total Staff &bull; {availableSites.length} Sites
                </Badge>
              ) : null
            }
            actions={
              <div className="flex items-center gap-2">
                <ExportButtons
                  onExportExcel={async () => {
                    const res = await employeesApi.exportExcel({ search });
                    downloadBlob(res.data, 'employees.xlsx');
                  }}
                  onExportPdf={async () => {
                    const res = await employeesApi.exportPdf({ search });
                    downloadBlob(res.data, 'employees.pdf');
                  }}
                />
                {canManage && (
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      form.reset({
                        employeeCode: '',
                        name: '',
                        mobile: '',
                        aadhaar: '',
                        pan: '',
                        bankName: '',
                        accountNumber: '',
                        ifscCode: '',
                        branch: '',
                        designation: '',
                        salary: 0,
                        joiningDate: new Date().toISOString().slice(0, 10),
                        siteId: '',
                      });
                      setError('');
                      setOpen(true);
                    }}
                  >
                    <Plus size={15} strokeWidth={2.5} /> Add Employee
                  </Button>
                )}
              </div>
            }
          />

          {/* Site Overview Section */}
          <div className="mb-4">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Facility Sites Roster
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/60">
                  {availableSites.length} {availableSites.length === 1 ? 'Site' : 'Sites'}
                </span>
              </div>
              {availableSites.length > 4 && (
                <div className="relative w-full sm:w-64">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search size={14} />
                  </div>
                  <Input
                    placeholder="Search sites by name..."
                    value={siteSearch}
                    className="h-8.5 pl-8.5 text-xs"
                    onChange={(e) => setSiteSearch(e.target.value)}
                  />
                </div>
              )}
            </div>

            {isSitesLoading ? (
              <Spinner />
            ) : filteredSites.length === 0 && availableSites.length > 0 ? (
              <EmptyState
                title="No Matching Sites"
                message={`No facility site matched "${siteSearch}".`}
                action={
                  <Button size="sm" variant="secondary" onClick={() => setSiteSearch('')}>
                    Clear Search
                  </Button>
                }
              />
            ) : availableSites.length === 0 ? (
              <EmptyState
                title="No Facility Sites"
                message="No facility sites found in the system. Add a site first to assign employees."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {canManage && !siteSearch && (
                  <StatsCard
                    label="All Sites (Full Roster)"
                    value={totalEmployeesCount}
                    unit="Staff"
                    tone="teal"
                    iconTone="teal"
                    icon={<Users size={18} />}
                    hint={
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-700 group-hover:translate-x-0.5 transition-transform">
                        View Consolidated Roster <ArrowRight size={12} />
                      </span>
                    }
                    onClick={() => {
                      setSearchParams({ site: 'all' });
                      setPage(1);
                    }}
                  />
                )}
                {filteredSites.map((s, idx) => {
                  const tone = SITE_CARD_TONES[idx % SITE_CARD_TONES.length];
                  const staffCount = s._count?.employees ?? 0;
                  return (
                    <StatsCard
                      key={s.id}
                      label={s.name}
                      value={staffCount}
                      unit={staffCount === 1 ? 'Staff' : 'Staff'}
                      tone={tone}
                      iconTone={tone}
                      icon={<Building2 size={18} />}
                      hint={
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 group-hover:translate-x-0.5 transition-transform">
                          View Staff Records <ArrowRight size={12} />
                        </span>
                      }
                      onClick={() => {
                        setSearchParams({ site: s.id });
                        setPage(1);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================
           VIEW 2: RECORDS PAGE (When a card was clicked)
           ======================================================== */
        <div>
          {/* Back Navigation Bar */}
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => {
                setSearchParams({});
                setPage(1);
                setSearch('');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-teal-300 hover:bg-teal-50/40 hover:text-teal-800 transition cursor-pointer"
            >
              <ArrowLeft size={14} className="text-teal-600" />
              <span>Back to All Sites</span>
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Current Site:</span>
              <span className="font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200/90 shadow-2xs">
                {selectedSite ? selectedSite.name : 'All Facility Sites'}
              </span>
            </div>
          </div>

          <PageHeader
            title={selectedSite ? `${selectedSite.name} — Staff Roster` : 'All Sites Staff Roster'}
            subtitle={
              selectedSite
                ? `Housekeeping employees assigned to ${selectedSite.name}`
                : 'Consolidated employee roster across all facility sites'
            }
            badge={
              data?.pagination.total !== undefined ? (
                <Badge tone="teal">{data.pagination.total} Staff</Badge>
              ) : null
            }
            actions={
              <div className="flex items-center gap-2">
                <ExportButtons
                  onExportExcel={async () => {
                    const res = await employeesApi.exportExcel({
                      search,
                      siteId: siteFilter || undefined,
                    });
                    downloadBlob(res.data, `${selectedSite ? selectedSite.name : 'employees'}.xlsx`);
                  }}
                  onExportPdf={async () => {
                    const res = await employeesApi.exportPdf({
                      search,
                      siteId: siteFilter || undefined,
                    });
                    downloadBlob(res.data, `${selectedSite ? selectedSite.name : 'employees'}.pdf`);
                  }}
                />
                {canManage && (
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      form.reset({
                        employeeCode: '',
                        name: '',
                        mobile: '',
                        aadhaar: '',
                        pan: '',
                        bankName: '',
                        accountNumber: '',
                        ifscCode: '',
                        branch: '',
                        designation: '',
                        salary: 0,
                        joiningDate: new Date().toISOString().slice(0, 10),
                        siteId: selectedSite?.id || '',
                      });
                      setError('');
                      setOpen(true);
                    }}
                  >
                    <Plus size={15} strokeWidth={2.5} /> Add Employee
                  </Button>
                )}
              </div>
            }
          />

          <Toolbar>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Search size={16} />
                </div>
                <Input
                  placeholder="Search by staff name, ID, mobile, designation..."
                  value={search}
                  className="pl-10"
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                />
              </div>
              {canManage ? (
                <Select
                  value={activeSiteParam || 'all'}
                  onChange={(e) => {
                    setPage(1);
                    if (e.target.value === 'all') {
                      setSearchParams({ site: 'all' });
                    } else {
                      setSearchParams({ site: e.target.value });
                    }
                  }}
                >
                  <option value="all">All facility sites ({totalEmployeesCount} Staff)</option>
                  {sites?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s._count?.employees ?? 0} staff)
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
          </Toolbar>

          {isLoading ? (
            <Spinner />
          ) : (
            <DataTable
              columns={columns}
              rows={data?.items ?? []}
              emptyMessage={
                selectedSite
                  ? `No employees currently assigned to ${selectedSite.name}.`
                  : 'No employees found matching the current search or filters.'
              }
            />
          )}
          <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />
        </div>
      )}

      <Modal
        open={open}
        title={editing ? 'Edit Employee Profile' : 'Add New Employee'}
        subtitle={
          editing
            ? `Update credentials and deployment details for ${editing.name}`
            : 'Fill in the staff personal information, deployment role, and statutory banking details'
        }
        icon={editing ? <UserCheck size={20} className="text-teal-600" /> : <UserPlus size={20} className="text-teal-600" />}
        badge={
          editing ? (
            <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
              {editing.employeeCode}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200/70 shadow-2xs">
              New Staff
            </span>
          )
        }
        onClose={closeForm}
        wide
      >
        <form className="space-y-4 sm:space-y-4.5" onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
          {editing ? (
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-teal-50 via-teal-50/70 to-emerald-50/60 px-4 py-2.5 border border-teal-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-xs shadow-xs">
                  ID
                </div>
                <div>
                  <p className="text-xs font-bold text-teal-950">System Staff ID</p>
                  <p className="text-[11px] text-teal-700">Permanent identifier across attendance, payroll, and sites</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-teal-900 bg-white px-3 py-1 rounded-lg border border-teal-300 shadow-2xs">
                {editing.employeeCode}
              </span>
            </div>
          ) : null}

          {/* Section 1: Personal & Identification Details */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-200/70 shadow-2xs">
                <User size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Personal & Identity Information</h3>
                <p className="text-[11px] text-slate-500">Legal name, contact phone, Aadhaar and PAN numbers</p>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label required>Full Legal Name</Label>
                <Input
                  icon={<User size={15} />}
                  placeholder="e.g. Ramesh Shinde"
                  {...form.register('name')}
                />
                <FieldError message={form.formState.errors.name?.message} />
              </div>

              <div>
                <Label required>Mobile Number</Label>
                <Input
                  icon={<Phone size={15} />}
                  placeholder="e.g. 9812345678"
                  {...form.register('mobile')}
                />
                <FieldError message={form.formState.errors.mobile?.message} />
              </div>

              <div>
                <Label required>Aadhaar Card Number</Label>
                <Input
                  icon={<CreditCard size={15} />}
                  placeholder="e.g. 1234 5678 9012"
                  {...form.register('aadhaar')}
                />
                <FieldError message={form.formState.errors.aadhaar?.message} />
              </div>

              <div>
                <Label required>PAN Card Number</Label>
                <Input
                  icon={<FileText size={15} />}
                  placeholder="e.g. ABCDE1234F"
                  {...form.register('pan')}
                />
                <FieldError message={form.formState.errors.pan?.message} />
              </div>
            </div>
          </div>

          {/* Section 2: Deployment & Role Details */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/70 shadow-2xs">
                <Briefcase size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Deployment & Role Details</h3>
                <p className="text-[11px] text-slate-500">Designation, monthly wage rate, joining date, and facility site</p>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label required>Designation / Role</Label>
                <Input
                  icon={<Briefcase size={15} />}
                  placeholder="e.g. Housekeeping Staff, Supervisor"
                  {...form.register('designation')}
                />
                <FieldError message={form.formState.errors.designation?.message} />
              </div>

              <div>
                <Label required>Monthly Salary (₹)</Label>
                <Input
                  icon={<IndianRupee size={15} />}
                  type="number"
                  step="0.01"
                  placeholder="e.g. 15000"
                  {...form.register('salary')}
                />
                <FieldError message={form.formState.errors.salary?.message} />
              </div>

              <div>
                <Label required>Joining Date</Label>
                <Input
                  icon={<Calendar size={15} />}
                  type="date"
                  {...form.register('joiningDate')}
                />
                <FieldError message={form.formState.errors.joiningDate?.message} />
              </div>

              <div>
                <Label required>Assigned Facility Site</Label>
                <Select icon={<Building2 size={15} />} {...form.register('siteId')}>
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

          {/* Section 3: Bank Account & Statutory Payout Details */}
          <div className="rounded-2xl border border-emerald-100/90 bg-gradient-to-b from-emerald-50/25 via-white to-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-emerald-100/70">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70 shadow-2xs">
                <Landmark size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Bank Account & Salary Payout</h3>
                <p className="text-[11px] text-slate-500">Direct deposit account information for wage disbursements</p>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label required>Bank Name</Label>
                <Input
                  icon={<Landmark size={15} />}
                  placeholder="e.g. State Bank of India"
                  {...form.register('bankName')}
                />
                <FieldError message={form.formState.errors.bankName?.message} />
              </div>

              <div>
                <Label required>Account Number</Label>
                <Input
                  icon={<Hash size={15} />}
                  placeholder="e.g. 123456789012"
                  {...form.register('accountNumber')}
                />
                <FieldError message={form.formState.errors.accountNumber?.message} />
              </div>

              <div>
                <Label required>IFSC Code</Label>
                <Input
                  icon={<Building size={15} />}
                  placeholder="e.g. SBIN0001234"
                  {...form.register('ifscCode')}
                />
                <FieldError message={form.formState.errors.ifscCode?.message} />
              </div>

              <div>
                <Label required>Branch Name</Label>
                <Input
                  icon={<MapPin size={15} />}
                  placeholder="e.g. Pune Main Branch"
                  {...form.register('branch')}
                />
                <FieldError message={form.formState.errors.branch?.message} />
              </div>
            </div>
          </div>

          {error ? (
            <div className="pt-1">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}

          {/* Sticky Action Footer */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-slate-200/80 bg-white -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-4 py-3.5 sm:px-6 sm:py-4 rounded-b-2xl shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              <span>Mandatory fields (<span className="text-rose-500 font-bold">*</span>) required for roster compliance</span>
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
                <UserCheck size={16} />
                <span>{editing ? 'Save Employee Profile' : 'Register Employee'}</span>
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Transfer site modal */}
      <Modal
        open={!!transferring}
        title="Transfer Staff to Another Site"
        subtitle={`Reassign ${transferring?.name ?? 'employee'} to a different managed facility`}
        icon={<ArrowRightLeft size={18} className="text-teal-600" />}
        onClose={() => setTransferring(null)}
      >
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200/70">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 font-bold text-xs ring-1 ring-teal-200/60">
              {transferring?.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">{transferring?.name}</p>
              <p className="text-[11px] text-slate-500 font-mono">Staff ID: {transferring?.employeeCode}</p>
            </div>
          </div>

          <div>
            <Label required>Target Destination Site</Label>
            <Select
              icon={<Building2 size={15} />}
              value={transferSiteId}
              onChange={(e) => setTransferSiteId(e.target.value)}
            >
              <option value="">Select destination facility site</option>
              {(sites ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="secondary" size="md" type="button" onClick={() => setTransferring(null)}>
            Cancel
          </Button>
          <Button
            size="md"
            type="button"
            loading={transferMutation.isPending}
            disabled={!transferSiteId || transferMutation.isPending}
            onClick={() => transferMutation.mutate()}
            className="bg-teal-600 text-white"
          >
            <ArrowRightLeft size={15} /> Confirm Transfer
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!disabling}
        title="Disable Employee"
        message={`Are you sure you want to disable ${disabling?.name}? They will no longer appear on daily attendance registers or active assignments.`}
        confirmLabel="Disable Employee"
        loading={disableMutation.isPending}
        onClose={() => setDisabling(null)}
        onConfirm={() => disableMutation.mutate()}
      />
    </div>
  );
}
