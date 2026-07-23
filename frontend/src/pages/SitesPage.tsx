import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientsApi, sitesApi } from '../services/resources';
import type { Site } from '../types';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Alert, Button, FieldError, Input, Label, PageHeader, Select, Spinner, Textarea, Toolbar } from '../components/ui';
import { DeleteActionButton, EditActionButton } from '../components/ActionIconButtons';
import { getErrorMessage } from '../utils/helpers';

const schema = z.object({
  name: z.string().min(1),
  clientId: z.string().min(1),
  address: z.string().min(1),
  supervisorName: z.string().min(1),
  contactNumber: z.string().min(8),
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
      closeForm();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => sitesApi.remove(deleting!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sites'] });
      setDeleting(null);
    },
  });

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Site', render: (r: Site) => r.name },
      { key: 'client', header: 'Client', render: (r: Site) => r.client?.companyName ?? '-' },
      { key: 'supervisor', header: 'Supervisor', render: (r: Site) => r.supervisorName },
      { key: 'contact', header: 'Contact', render: (r: Site) => r.contactNumber },
      { key: 'employees', header: 'Employees', render: (r: Site) => r._count?.employees ?? 0 },
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
        subtitle="Manage client sites"
        actions={
          <Button
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
            Add Site
          </Button>
        }
      />

      <Toolbar>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Search sites..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <Select
            value={clientFilter}
            onChange={(e) => {
              setPage(1);
              setClientFilter(e.target.value);
            }}
          >
            <option value="">All clients</option>
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

      <Modal open={open} title={editing ? 'Edit Site' : 'Add Site'} onClose={closeForm} wide>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
          <div>
            <Label>Site Name</Label>
            <Input {...form.register('name')} />
            <FieldError message={form.formState.errors.name?.message} />
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
            <Label>Supervisor Name</Label>
            <Input {...form.register('supervisorName')} />
            <FieldError message={form.formState.errors.supervisorName?.message} />
          </div>
          <div>
            <Label>Contact Number</Label>
            <Input {...form.register('contactNumber')} />
            <FieldError message={form.formState.errors.contactNumber?.message} />
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
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Site"
        message={`Delete ${deleting?.name}?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
