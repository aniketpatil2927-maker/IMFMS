import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeesApi, sitesApi } from '../services/resources';
import type { Employee } from '../types';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Alert, Badge, Button, FieldError, Input, Label, PageHeader, Select, Spinner, Toolbar } from '../components/ui';
import {
  DisableActionButton,
  EditActionButton,
  TransferActionButton,
} from '../components/ActionIconButtons';
import { formatDate, formatMoney, getErrorMessage } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';

const schema = z.object({
  employeeCode: z.string().min(1),
  name: z.string().min(1),
  mobile: z.string().min(8),
  aadhaar: z.string().optional(),
  designation: z.string().min(1),
  salary: z.coerce.number().positive(),
  joiningDate: z.string().min(1),
  siteId: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function EmployeesPage() {
  const { hasRole, user } = useAuth();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState(user?.siteId ?? '');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [transferring, setTransferring] = useState<Employee | null>(null);
  const [transferSiteId, setTransferSiteId] = useState('');
  const [disabling, setDisabling] = useState<Employee | null>(null);
  const [error, setError] = useState('');

  const { data: sites } = useQuery({
    queryKey: ['sites-lite'],
    queryFn: async () => (await sitesApi.lite()).data.data!,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, siteFilter, page],
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
      closeForm();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const transferMutation = useMutation({
    mutationFn: async () => employeesApi.transfer(transferring!.id, transferSiteId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employees'] });
      setTransferring(null);
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => employeesApi.disable(disabling!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employees'] });
      setDisabling(null);
    },
  });

  const columns = useMemo(
    () => [
      { key: 'code', header: 'Employee ID', render: (r: Employee) => r.employeeCode },
      { key: 'name', header: 'Name', render: (r: Employee) => r.name },
      { key: 'mobile', header: 'Mobile', render: (r: Employee) => r.mobile },
      { key: 'designation', header: 'Designation', render: (r: Employee) => r.designation },
      { key: 'salary', header: 'Salary', render: (r: Employee) => formatMoney(r.salary) },
      { key: 'site', header: 'Site', render: (r: Employee) => r.site?.name ?? '-' },
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
      <PageHeader
        title="Employees"
        subtitle="Manage housekeeping staff"
        actions={
          canManage ? (
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                form.reset({
                  employeeCode: '',
                  name: '',
                  mobile: '',
                  aadhaar: '',
                  designation: '',
                  salary: 0,
                  joiningDate: new Date().toISOString().slice(0, 10),
                  siteId: '',
                });
                setError('');
                setOpen(true);
              }}
            >
              Add Employee
            </Button>
          ) : undefined
        }
      />

      <Toolbar>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Search by name, ID, mobile, designation..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          {canManage ? (
            <Select
              value={siteFilter}
              onChange={(e) => {
                setPage(1);
                setSiteFilter(e.target.value);
              }}
            >
              <option value="">All sites</option>
              {(sites ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </Toolbar>

      {isLoading ? <Spinner /> : <DataTable columns={columns} rows={data?.items ?? []} />}
      <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={setPage} />

      <Modal open={open} title={editing ? 'Edit Employee' : 'Add Employee'} onClose={closeForm} wide>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
          <div>
            <Label>Employee ID</Label>
            <Input {...form.register('employeeCode')} />
            <FieldError message={form.formState.errors.employeeCode?.message} />
          </div>
          <div>
            <Label>Name</Label>
            <Input {...form.register('name')} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>
          <div>
            <Label>Mobile</Label>
            <Input {...form.register('mobile')} />
            <FieldError message={form.formState.errors.mobile?.message} />
          </div>
          <div>
            <Label>Aadhaar</Label>
            <Input {...form.register('aadhaar')} />
          </div>
          <div>
            <Label>Designation</Label>
            <Input {...form.register('designation')} />
            <FieldError message={form.formState.errors.designation?.message} />
          </div>
          <div>
            <Label>Salary</Label>
            <Input type="number" step="0.01" {...form.register('salary')} />
            <FieldError message={form.formState.errors.salary?.message} />
          </div>
          <div>
            <Label>Joining Date</Label>
            <Input type="date" {...form.register('joiningDate')} />
            <FieldError message={form.formState.errors.joiningDate?.message} />
          </div>
          <div>
            <Label>Assigned Site</Label>
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

      <Modal open={!!transferring} title="Transfer Site" onClose={() => setTransferring(null)}>
        <p className="mb-3 text-sm text-slate-600">
          Transfer {transferring?.name} (joined {formatDate(transferring?.joiningDate)})
        </p>
        <Label>New Site</Label>
        <Select value={transferSiteId} onChange={(e) => setTransferSiteId(e.target.value)}>
          {(sites ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => setTransferring(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!transferSiteId || transferMutation.isPending}
            onClick={() => transferMutation.mutate()}
          >
            Transfer
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!disabling}
        title="Disable Employee"
        message={`Disable ${disabling?.name}? They will no longer appear in daily attendance.`}
        confirmLabel="Disable"
        loading={disableMutation.isPending}
        onClose={() => setDisabling(null)}
        onConfirm={() => disableMutation.mutate()}
      />
    </div>
  );
}
