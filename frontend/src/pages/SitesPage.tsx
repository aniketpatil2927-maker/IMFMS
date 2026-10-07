import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building, Building2, CheckCircle2, MapPin, Phone, Plus, Search, User, UserCheck } from 'lucide-react';
import { clientsApi, sitesApi } from '../services/resources';
import type { Site } from '../types';
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
  Textarea,
  Toolbar,
} from '../components/ui';
import { DeleteActionButton, EditActionButton } from '../components/ActionIconButtons';
import { downloadBlob, getErrorMessage } from '../utils/helpers';

const schema = z.object({
  name: z.string().trim().min(1, 'Site name is required'),
  clientId: z.string().trim().min(1, 'Client selection is required'),
  address: z.string().trim().min(1, 'Address is required'),
  supervisorName: z.string().optional().or(z.literal('')),
  contactNumber: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export function SitesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [deleting, setDeleting] = useState<Site | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sites', search, clientFilter, page],
    queryFn: async () =>
      (
        await sitesApi.list({
          search,
          page,
          limit: 10,
          clientId: clientFilter || undefined,
        })
      ).data.data!,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-all'],
    queryFn: async () => (await clientsApi.list({ page: 1, limit: 100 })).data.data!.items,
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    setError('');
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) return sitesApi.update(editing.id, values);
      return sitesApi.create(values);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sites'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      closeForm();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => sitesApi.remove(deleting!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sites'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeleting(null);
    },
  });

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Site Name & Location',
        render: (r: Site) => (
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-200/60 font-bold text-xs mt-0.5">
              <MapPin size={16} />
            </div>
            <div>
              <p className="font-bold text-slate-900">{r.name}</p>
              {r.address ? (
                <p className="text-xs text-slate-400 line-clamp-1 max-w-xs">{r.address}</p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: 'client',
        header: 'Client Company',
        render: (r: Site) => (
          <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
            <Building2 size={13} className="text-slate-400 shrink-0" />
            <span>{r.client?.companyName ?? '-'}</span>
          </div>
        ),
      },
      {
        key: 'supervisor',
        header: 'Supervisor',
        render: (r: Site) => (
          <div className="flex items-center gap-1.5 text-slate-700">
            <User size={13} className="text-slate-400 shrink-0" />
            <span className="font-medium">{r.supervisorName}</span>
          </div>
        ),
      },
      {
        key: 'contact',
        header: 'Contact',
        render: (r: Site) => (
          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
            <Phone size={12} className="text-slate-400" /> {r.contactNumber}
          </span>
        ),
      },
      {
        key: 'employees',
        header: 'Assigned Staff',
        render: (r: Site) => (
          <Badge tone={r._count?.employees ? 'blue' : 'slate'}>
            {r._count?.employees ?? 0} Staff
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (r: Site) => (
          <div className="flex items-center gap-1.5">
            <EditActionButton
              onClick={() => {
                setEditing(r);
                form.reset({
                  name: r.name,
                  clientId: r.clientId,
                  address: r.address,
                  supervisorName: r.supervisorName,
                  contactNumber: r.contactNumber,
                });
                setError('');
                setOpen(true);
              }}
            />
            <DeleteActionButton onClick={() => setDeleting(r)} />
          </div>
        ),
      },
    ],
    [form],
  );

  return (
    <div>
      <PageHeader
        title="Sites"
        subtitle="Manage facility locations, designated site supervisors, and assigned staff"
        badge={
          data?.pagination.total !== undefined ? (
            <Badge tone="blue">{data.pagination.total} Total</Badge>
          ) : null
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons
              onExportExcel={async () => {
                const res = await sitesApi.exportExcel({
                  search: search || undefined,
                  clientId: clientFilter || undefined,
                });
                downloadBlob(res.data, 'sites-list.xlsx');
              }}
              onExportPdf={async () => {
                const res = await sitesApi.exportPdf({
                  search: search || undefined,
                  clientId: clientFilter || undefined,
                });
                downloadBlob(res.data, 'sites-list.pdf');
              }}
            />
            <Button
              size="sm"
              type="button"
              onClick={() => {
                setEditing(null);
                form.reset({
                  name: '',
                  clientId: '',
                  address: '',
                  supervisorName: '',
                  contactNumber: '',
                });
                setError('');
                setOpen(true);
              }}
            >
              <Plus size={15} strokeWidth={2.5} /> Add Site
            </Button>
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
              placeholder="Search by site name, supervisor, address..."
              value={search}
              className="pl-10"
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <Select
            value={clientFilter}
            onChange={(e) => {
              setPage(1);
              setClientFilter(e.target.value);
            }}
          >
            <option value="">All client companies</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </Select>
        </div>
      </Toolbar>

      {isLoading ? <Spinner /> : <DataTable columns={columns} rows={data?.items ?? []} />}
      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      <Modal
        open={open}
        title={editing ? 'Edit Facility Site' : 'Add New Facility Site'}
        subtitle={
          editing
            ? `Update location details and supervisor assignments for ${editing.name}`
            : 'Configure a new facility property, assign its client organization, and supervisor'
        }
        icon={<Building2 size={20} className="text-teal-600" />}
        badge={
          editing ? (
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
              Configured Site
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
              New Facility
            </span>
          )
        }
        onClose={closeForm}
        wide
      >
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
          {/* Card 1: Facility Identity & Client Mapping */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-200/70 shadow-2xs">
                <Building2 size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Facility Identity & Client Organization</h3>
                <p className="text-[11px] text-slate-500">Site property name and parent corporate client</p>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label required>Site / Property Name</Label>
                <Input
                  icon={<Building2 size={15} />}
                  placeholder="e.g. Pune Tech Park - Block A"
                  {...form.register('name')}
                />
                <FieldError message={form.formState.errors.name?.message} />
              </div>

              <div>
                <Label required>Client Company</Label>
                <Select icon={<Building size={15} />} {...form.register('clientId')}>
                  <option value="">Select corporate client</option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </Select>
                <FieldError message={form.formState.errors.clientId?.message} />
              </div>
            </div>
          </div>

          {/* Card 2: Site In-Charge / Supervisor */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/70 shadow-2xs">
                <UserCheck size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Site Supervisor & Contact Person</h3>
                <p className="text-[11px] text-slate-500">On-ground operations supervisor and direct mobile contact</p>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label>Supervisor Name</Label>
                <Input
                  icon={<User size={15} />}
                  placeholder="e.g. Amit Patil"
                  {...form.register('supervisorName')}
                />
                <FieldError message={form.formState.errors.supervisorName?.message} />
              </div>

              <div>
                <Label>Contact Number</Label>
                <Input
                  icon={<Phone size={15} />}
                  placeholder="e.g. 9822001122"
                  {...form.register('contactNumber')}
                />
                <FieldError message={form.formState.errors.contactNumber?.message} />
              </div>
            </div>
          </div>

          {/* Card 3: Physical Facility Address */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/70 shadow-2xs">
                <MapPin size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Physical Site Address</h3>
                <p className="text-[11px] text-slate-500">Exact physical location of the facility premises</p>
              </div>
            </div>

            <div>
              <Label required>Site Location Address</Label>
              <Textarea
                rows={2}
                placeholder="Enter complete address, plot/survey number, landmark, area, city..."
                {...form.register('address')}
              />
              <FieldError message={form.formState.errors.address?.message} />
            </div>
          </div>

          {error ? (
            <div className="pt-1">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}

          {/* Sticky Docked Action Footer */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-slate-200/80 bg-white -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-4 py-3.5 sm:px-6 sm:py-4 rounded-b-2xl shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              <span>Fields marked with (<span className="text-rose-500 font-bold">*</span>) are mandatory</span>
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
                <span>{editing ? 'Save Changes' : 'Create Site'}</span>
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Facility Site"
        message={`Are you sure you want to delete ${deleting?.name}? Associated staff and records may be affected. This action cannot be undone.`}
        confirmLabel="Delete Site"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
