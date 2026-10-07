import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, CheckCircle2, FileText, Mail, MapPin, Phone, Plus, Search, User, UserCheck } from 'lucide-react';
import { clientsApi } from '../services/resources';
import type { Client } from '../types';
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
  Spinner,
  Textarea,
  Toolbar,
} from '../components/ui';
import { DeleteActionButton, EditActionButton } from '../components/ActionIconButtons';
import { downloadBlob, getErrorMessage } from '../utils/helpers';

const schema = z.object({
  companyName: z.string().trim().min(1, 'Client Name is required'),
  contactPerson: z.string().optional().or(z.literal('')),
  mobile: z
    .string()
    .trim()
    .min(1, 'Mobile Number is required')
    .regex(/^[0-9+\s-]{10,15}$/, 'Please enter a valid mobile number'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  gstNumber: z.string().optional(),
  address: z.string().trim().min(1, 'Address is required'),
});

type FormValues = z.infer<typeof schema>;

export function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, page],
    queryFn: async () => (await clientsApi.list({ search, page, limit: 10 })).data.data!,
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    setError('');
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) return clientsApi.update(editing.id, values);
      return clientsApi.create(values);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['clients'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      closeForm();
      form.reset();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => clientsApi.remove(deleting!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['clients'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeleting(null);
    },
  });

  const columns = useMemo(
    () => [
      {
        key: 'company',
        header: 'Company',
        render: (r: Client) => (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-200/60 font-bold text-xs">
              {r.companyName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-900">{r.companyName}</p>
              {r.address ? (
                <p className="text-xs text-slate-400 line-clamp-1 max-w-xs">{r.address}</p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: 'contact',
        header: 'Contact Person',
        render: (r: Client) => (
          <div>
            <p className="font-semibold text-slate-800">{r.contactPerson}</p>
            {r.email ? (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Mail size={11} /> {r.email}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'mobile',
        header: 'Mobile',
        render: (r: Client) => (
          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
            <Phone size={12} className="text-slate-400" /> {r.mobile}
          </span>
        ),
      },
      {
        key: 'gst',
        header: 'GST Number',
        render: (r: Client) =>
          r.gstNumber ? (
            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              {r.gstNumber}
            </span>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          ),
      },
      {
        key: 'sites',
        header: 'Managed Sites',
        render: (r: Client) => (
          <Badge tone={r._count?.sites ? 'teal' : 'slate'}>
            {r._count?.sites ?? 0} {r._count?.sites === 1 ? 'Site' : 'Sites'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (r: Client) => (
          <div className="flex items-center gap-1.5">
            <EditActionButton
              onClick={() => {
                setEditing(r);
                form.reset({
                  companyName: r.companyName,
                  contactPerson: r.contactPerson,
                  mobile: r.mobile,
                  email: r.email ?? '',
                  gstNumber: r.gstNumber ?? '',
                  address: r.address,
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
        title="Clients"
        subtitle="Manage client companies, official contact details, and registered facility sites"
        badge={
          data?.pagination.total !== undefined ? (
            <Badge tone="teal">{data.pagination.total} Total</Badge>
          ) : null
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons
              onExportExcel={async () => {
                const res = await clientsApi.exportExcel({ search: search || undefined });
                downloadBlob(res.data, 'clients-list.xlsx');
              }}
              onExportPdf={async () => {
                const res = await clientsApi.exportPdf({ search: search || undefined });
                downloadBlob(res.data, 'clients-list.pdf');
              }}
            />
            <Button
              size="sm"
              type="button"
              onClick={() => {
                setEditing(null);
                form.reset({
                  companyName: '',
                  contactPerson: '',
                  mobile: '',
                  email: '',
                  gstNumber: '',
                  address: '',
                });
                setError('');
                setOpen(true);
              }}
            >
              <Plus size={15} strokeWidth={2.5} /> Add Client
            </Button>
          </div>
        }
      />

      <Toolbar>
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search size={16} />
          </div>
          <Input
            placeholder="Search by client name, contact person, mobile, or GST..."
            value={search}
            className="pl-10"
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
      </Toolbar>

      {isLoading ? <Spinner /> : <DataTable columns={columns} rows={data?.items ?? []} />}
      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      <Modal
        open={open}
        title={editing ? 'Edit Client' : 'Add New Client'}
        subtitle={
          editing
            ? `Update organization profile and contact information for ${editing.companyName}`
            : 'Register a new corporate client organization, billing address, and contact person'
        }
        icon={<Building2 size={20} className="text-teal-600" />}
        badge={
          editing ? (
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
              Existing Client
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
              New Account
            </span>
          )
        }
        onClose={closeForm}
        wide
      >
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          {/* Card 1: Company Profile & Tax Info */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-200/70 shadow-2xs">
                <Building2 size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Organization & Tax Profile</h3>
                <p className="text-[11px] text-slate-500">Legal entity name and GST tax registration number</p>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label required>Client / Company Name</Label>
                <Input
                  icon={<Building2 size={15} />}
                  placeholder="e.g. Acme Corp Facility Services"
                  {...form.register('companyName')}
                />
                <FieldError message={form.formState.errors.companyName?.message} />
              </div>

              <div>
                <Label>GST Number</Label>
                <Input
                  icon={<FileText size={15} />}
                  placeholder="e.g. 27ABCDE1234F1Z5 (optional)"
                  {...form.register('gstNumber')}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Contact Information */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/70 shadow-2xs">
                <UserCheck size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Primary Contact Personnel</h3>
                <p className="text-[11px] text-slate-500">Contact person name, official mobile number, and email address</p>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              <div>
                <Label>Contact Person</Label>
                <Input
                  icon={<User size={15} />}
                  placeholder="e.g. Rahul Sharma"
                  {...form.register('contactPerson')}
                />
                <FieldError message={form.formState.errors.contactPerson?.message} />
              </div>

              <div>
                <Label required>Mobile Number</Label>
                <Input
                  icon={<Phone size={15} />}
                  placeholder="e.g. 9876543210"
                  {...form.register('mobile')}
                />
                <FieldError message={form.formState.errors.mobile?.message} />
              </div>

              <div>
                <Label>Email Address</Label>
                <Input
                  icon={<Mail size={15} />}
                  type="email"
                  placeholder="e.g. rahul@acme.com"
                  {...form.register('email')}
                />
                <FieldError message={form.formState.errors.email?.message} />
              </div>
            </div>
          </div>

          {/* Card 3: Billing & Premise Address */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/70 shadow-2xs">
                <MapPin size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Registered Premises Address</h3>
                <p className="text-[11px] text-slate-500">Head office or principal place of business for invoicing</p>
              </div>
            </div>

            <div>
              <Label required>Full Registered Address</Label>
              <Textarea
                rows={2}
                placeholder="Enter complete address, building number, street, city, pin code..."
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
                <span>{editing ? 'Save Changes' : 'Create Client'}</span>
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Client"
        message={`Are you sure you want to delete ${deleting?.companyName}? Associated sites and records may be affected. This action cannot be undone.`}
        confirmLabel="Delete Client"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
