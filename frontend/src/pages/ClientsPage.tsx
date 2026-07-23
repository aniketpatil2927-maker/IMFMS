import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientsApi } from '../services/resources';
import type { Client } from '../types';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Alert, Button, FieldError, Input, Label, PageHeader, Spinner, Textarea, Toolbar } from '../components/ui';
import { DeleteActionButton, EditActionButton } from '../components/ActionIconButtons';
import { getErrorMessage } from '../utils/helpers';

const schema = z.object({
  companyName: z.string().min(1),
  contactPerson: z.string().min(1),
  mobile: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')),
  gstNumber: z.string().optional(),
  address: z.string().min(1),
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
      closeForm();
      form.reset();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => clientsApi.remove(deleting!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['clients'] });
      setDeleting(null);
    },
  });

  const columns = useMemo(
    () => [
      { key: 'company', header: 'Company', render: (r: Client) => r.companyName },
      { key: 'contact', header: 'Contact', render: (r: Client) => r.contactPerson },
      { key: 'mobile', header: 'Mobile', render: (r: Client) => r.mobile },
      { key: 'gst', header: 'GST', render: (r: Client) => r.gstNumber || '-' },
      { key: 'sites', header: 'Sites', render: (r: Client) => r._count?.sites ?? 0 },
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
        subtitle="Manage client companies"
        actions={
          <Button
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
            Add Client
          </Button>
        }
      />

      <Toolbar>
        <Input
          placeholder="Search by company, contact, mobile, GST..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </Toolbar>

      {isLoading ? <Spinner /> : <DataTable columns={columns} rows={data?.items ?? []} />}
      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      <Modal open={open} title={editing ? 'Edit Client' : 'Add Client'} onClose={closeForm} wide>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <div className="sm:col-span-2">
            <Label>Company Name</Label>
            <Input {...form.register('companyName')} />
            <FieldError message={form.formState.errors.companyName?.message} />
          </div>
          <div>
            <Label>Contact Person</Label>
            <Input {...form.register('contactPerson')} />
            <FieldError message={form.formState.errors.contactPerson?.message} />
          </div>
          <div>
            <Label>Mobile</Label>
            <Input {...form.register('mobile')} />
            <FieldError message={form.formState.errors.mobile?.message} />
          </div>
          <div>
            <Label>Email</Label>
            <Input {...form.register('email')} />
            <FieldError message={form.formState.errors.email?.message} />
          </div>
          <div>
            <Label>GST Number</Label>
            <Input {...form.register('gstNumber')} />
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Textarea rows={3} {...form.register('address')} />
            <FieldError message={form.formState.errors.address?.message} />
          </div>
          {error ? (
            <div className="sm:col-span-2">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" type="button" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Client"
        message={`Delete ${deleting?.companyName}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
