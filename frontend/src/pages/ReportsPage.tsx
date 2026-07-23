import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, sitesApi } from '../services/resources';
import { Button, Card, Input, Label, PageHeader, Select, Spinner, Toolbar } from '../components/ui';
import { downloadBlob, formatDate, formatMoney } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';

type ReportType = 'attendance' | 'employees' | 'quotations' | 'invoices' | 'bills';

export function ReportsPage() {
  const { hasRole, user } = useAuth();
  const canOffice = hasRole('SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF');
  const [type, setType] = useState<ReportType>(canOffice ? 'quotations' : 'attendance');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [siteId, setSiteId] = useState(user?.siteId ?? '');

  const { data: sites } = useQuery({
    queryKey: ['sites-lite'],
    queryFn: async () => (await sitesApi.lite()).data.data!,
    enabled: hasRole('SUPER_ADMIN', 'ADMIN'),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report', type, year, month, siteId],
    queryFn: async () => {
      const params =
        type === 'attendance'
          ? { year, month, siteId: siteId || undefined }
          : undefined;
      return (await reportsApi.get(type, params)).data.data as Record<string, unknown>;
    },
  });

  const exportReport = async (format: 'excel' | 'pdf') => {
    const params =
      type === 'attendance'
        ? { format, year, month, siteId: siteId || undefined }
        : { format };
    const res = await reportsApi.export(type, params);
    downloadBlob(res.data, `${type}-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
  };

  const reportOptions: Array<{ value: ReportType; label: string; show: boolean }> = [
    { value: 'attendance', label: 'Attendance Report', show: true },
    { value: 'employees', label: 'Employee Report', show: canOffice },
    { value: 'quotations', label: 'Quotation Report', show: canOffice },
    { value: 'invoices', label: 'Invoice Report', show: canOffice },
    { value: 'bills', label: 'Bill Report', show: canOffice },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="View and export attendance, employee, quotation, invoice, and bill reports" />
      <Toolbar>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Report</Label>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as ReportType)}
            >
              {reportOptions
                .filter((o) => o.show)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </Select>
          </div>
          {type === 'attendance' ? (
            <>
              {hasRole('SUPER_ADMIN', 'ADMIN') ? (
                <div>
                  <Label>Site</Label>
                  <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                    <option value="">All sites</option>
                    {(sites ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              <div>
                <Label>Month</Label>
                <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleString('en', { month: 'long' })}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </div>
            </>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void refetch()}>
            Refresh
          </Button>
          <Button variant="secondary" type="button" onClick={() => void exportReport('excel')}>
            Export Excel
          </Button>
          <Button variant="soft" type="button" onClick={() => void exportReport('pdf')}>
            Export PDF
          </Button>
        </div>
      </Toolbar>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto p-2 sm:p-3">
            {type === 'attendance' ? (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Employee</th>
                    <th className="py-2 pr-3">Site</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {((data?.records as Array<{
                    id: string;
                    date: string;
                    status: string;
                    employee: { name: string; employeeCode: string };
                    site: { name: string };
                  }>) ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{formatDate(row.date)}</td>
                      <td className="py-2 pr-3">
                        {row.employee.employeeCode} — {row.employee.name}
                      </td>
                      <td className="py-2 pr-3">{row.site.name}</td>
                      <td className="py-2">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {type === 'employees' ? (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Designation</th>
                    <th className="py-2 pr-3">Site</th>
                    <th className="py-2">Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {((data?.items as Array<{
                    id: string;
                    employeeCode: string;
                    name: string;
                    designation: string;
                    salary: number;
                    site: { name: string };
                  }>) ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{row.employeeCode}</td>
                      <td className="py-2 pr-3">{row.name}</td>
                      <td className="py-2 pr-3">{row.designation}</td>
                      <td className="py-2 pr-3">{row.site.name}</td>
                      <td className="py-2">{formatMoney(row.salary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {type === 'quotations' || type === 'invoices' ? (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-3">Number</th>
                    <th className="py-2 pr-3">Client</th>
                    <th className="py-2 pr-3">Site</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {((data?.items as Array<{
                    id: string;
                    quotationNumber?: string;
                    invoiceNumber?: string;
                    status: string;
                    total: number;
                    client: { companyName: string };
                    site: { name: string };
                  }>) ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{row.quotationNumber ?? row.invoiceNumber}</td>
                      <td className="py-2 pr-3">{row.client.companyName}</td>
                      <td className="py-2 pr-3">{row.site.name}</td>
                      <td className="py-2 pr-3">{row.status}</td>
                      <td className="py-2">{formatMoney(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {type === 'bills' ? (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-3">Bill No</th>
                    <th className="py-2 pr-3">Invoice</th>
                    <th className="py-2 pr-3">Month</th>
                    <th className="py-2 pr-3">Client</th>
                    <th className="py-2">Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {((data?.items as Array<{
                    id: string;
                    billNumber: string;
                    billingMonth: string;
                    grandTotal: number;
                    invoice: { invoiceNumber: string; client: { companyName: string } };
                  }>) ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{row.billNumber}</td>
                      <td className="py-2 pr-3">{row.invoice.invoiceNumber}</td>
                      <td className="py-2 pr-3">{row.billingMonth}</td>
                      <td className="py-2 pr-3">{row.invoice.client.companyName}</td>
                      <td className="py-2">{formatMoney(row.grandTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
