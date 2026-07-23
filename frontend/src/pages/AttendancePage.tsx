import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, sitesApi } from '../services/resources';
import type { AttendanceStatus } from '../types';
import { Alert, Button, Card, Input, Label, PageHeader, SegmentedControl, Select, Spinner, Toolbar } from '../components/ui';
import { downloadBlob, formatDate, getErrorMessage } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';

const statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY'];

export function AttendancePage() {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();
  const [siteId, setSiteId] = useState(user?.siteId ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { data: sites } = useQuery({
    queryKey: ['sites-lite'],
    queryFn: async () => (await sitesApi.lite()).data.data!,
    enabled: hasRole('SUPER_ADMIN', 'ADMIN'),
  });

  useEffect(() => {
    if (!siteId && sites?.length) setSiteId(sites[0].id);
  }, [sites, siteId]);

  const dailyQuery = useQuery({
    queryKey: ['attendance-daily', siteId, date],
    enabled: !!siteId && tab === 'daily',
    queryFn: async () => (await attendanceApi.getDaily({ siteId, date })).data.data!,
  });

  useEffect(() => {
    if (!dailyQuery.data) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const entry of dailyQuery.data.entries) {
      next[entry.employee.id] = (entry.status as AttendanceStatus) || 'PRESENT';
    }
    setStatusMap(next);
  }, [dailyQuery.data]);

  const monthlyQuery = useQuery({
    queryKey: ['attendance-monthly', siteId, year, month],
    enabled: tab === 'monthly',
    queryFn: async () =>
      (await attendanceApi.getMonthly({ siteId: siteId || undefined, year, month })).data.data as {
        records: Array<{
          id: string;
          date: string;
          status: string;
          employee: { employeeCode: string; name: string; designation: string };
          site: { name: string };
        }>;
      },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(statusMap).map(([employeeId, status]) => ({ employeeId, status }));
      return attendanceApi.saveDaily({ siteId, date, entries });
    },
    onSuccess: async () => {
      setMessage('Attendance saved');
      setError('');
      await qc.invalidateQueries({ queryKey: ['attendance-daily', siteId, date] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err) => {
      setMessage('');
      setError(getErrorMessage(err));
    },
  });

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }),
      })),
    [],
  );

  const exportFile = async (kind: 'excel' | 'pdf') => {
    const params = { siteId: siteId || undefined, year, month };
    const res = kind === 'excel' ? await attendanceApi.exportExcel(params) : await attendanceApi.exportPdf(params);
    downloadBlob(res.data, `attendance-${year}-${month}.${kind === 'excel' ? 'xlsx' : 'pdf'}`);
  };

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark daily presence and review monthly registers with Excel/PDF export" />

      <div className="mb-4">
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as 'daily' | 'monthly')}
          options={[
            { value: 'daily', label: 'Daily Attendance' },
            { value: 'monthly', label: 'Monthly / Report' },
          ]}
        />
      </div>

      <Toolbar>
        <div className="grid gap-3 sm:grid-cols-3">
          {hasRole('SUPER_ADMIN', 'ADMIN') ? (
            <div>
              <Label>Site</Label>
              <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                <option value="">Select site</option>
                {(sites ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div>
              <Label>Assigned Site</Label>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700">
                {user?.site?.name ?? 'Assigned site'}
              </p>
            </div>
          )}
          {tab === 'daily' ? (
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          ) : (
            <>
              <div>
                <Label>Month</Label>
                <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
              </div>
            </>
          )}
        </div>
      </Toolbar>

      {tab === 'daily' ? (
        !siteId ? (
          <Card>
            <p className="text-sm text-slate-500">Select a site to mark attendance.</p>
          </Card>
        ) : dailyQuery.isLoading ? (
          <Spinner />
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div>
                <p className="font-semibold text-slate-900">{dailyQuery.data?.site.name}</p>
                <p className="text-sm text-slate-500">{formatDate(date)}</p>
              </div>
              <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
            <div className="space-y-2 px-5 pt-4">
              {error ? <Alert tone="error">{error}</Alert> : null}
              {message ? <Alert tone="success">{message}</Alert> : null}
            </div>
            <div className="overflow-x-auto p-2 sm:p-3">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-3">Emp ID</th>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Designation</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(dailyQuery.data?.entries ?? []).map((entry, idx) => (
                    <tr key={entry.employee.id} className={idx % 2 ? 'bg-slate-50/70' : ''}>
                      <td className="px-3 py-3 font-medium text-slate-800">{entry.employee.employeeCode}</td>
                      <td className="px-3 py-3 text-slate-700">{entry.employee.name}</td>
                      <td className="px-3 py-3 text-slate-600">{entry.employee.designation}</td>
                      <td className="px-3 py-3">
                        <Select
                          value={statusMap[entry.employee.id] ?? 'PRESENT'}
                          onChange={(e) =>
                            setStatusMap((prev) => ({
                              ...prev,
                              [entry.employee.id]: e.target.value as AttendanceStatus,
                            }))
                          }
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {s.replace('_', ' ')}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <Button variant="secondary" type="button" onClick={() => void exportFile('excel')}>
              Export Excel
            </Button>
            <Button variant="secondary" type="button" onClick={() => void exportFile('pdf')}>
              Export PDF
            </Button>
            <Button variant="soft" type="button" onClick={() => window.print()}>
              Print
            </Button>
          </div>
          {monthlyQuery.isLoading ? (
            <Spinner />
          ) : (
            <div className="overflow-x-auto p-2 sm:p-3">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Emp ID</th>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Site</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlyQuery.data?.records ?? []).map((row, idx) => (
                    <tr key={row.id} className={idx % 2 ? 'bg-slate-50/70' : ''}>
                      <td className="px-3 py-3">{formatDate(row.date)}</td>
                      <td className="px-3 py-3 font-medium">{row.employee.employeeCode}</td>
                      <td className="px-3 py-3">{row.employee.name}</td>
                      <td className="px-3 py-3">{row.site.name}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
                          {row.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!monthlyQuery.data?.records?.length ? (
                <p className="py-10 text-center text-sm text-slate-500">No attendance records for this period.</p>
              ) : null}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
