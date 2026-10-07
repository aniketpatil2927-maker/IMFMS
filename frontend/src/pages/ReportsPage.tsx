import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { reportsApi, sitesApi } from '../services/resources';
import { Badge, Button, Input, Label, PageHeader, Select, Spinner, Toolbar } from '../components/ui';
import { downloadBlob, formatDate, formatMoney } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';

type ReportType = 'attendance' | 'employees' | 'quotations' | 'invoices' | 'bills' | 'clients' | 'sites' | 'expenses';

export function ReportsPage() {
  const { hasRole, user } = useAuth();
  const canOffice = hasRole('SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF');
  const [type, setType] = useState<ReportType>(canOffice ? 'quotations' : 'attendance');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [siteId, setSiteId] = useState(user?.siteId ?? '');
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: sites } = useQuery({
    queryKey: ['sites-lite'],
    queryFn: async () => (await sitesApi.lite()).data.data!,
    enabled: hasRole('SUPER_ADMIN', 'ADMIN'),
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
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
    setExporting(format);
    try {
      const params =
        type === 'attendance'
          ? { format, year, month, siteId: siteId || undefined }
          : { format };
      const res = await reportsApi.export(type, params);
      downloadBlob(res.data, `${type}-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
    } finally {
      setExporting(null);
    }
  };

  const reportOptions: Array<{ value: ReportType; label: string; show: boolean }> = [
    { value: 'attendance', label: 'Attendance Register', show: true },
    { value: 'employees', label: 'Employee Roster', show: canOffice },
    { value: 'clients', label: 'Clients Directory', show: canOffice },
    { value: 'sites', label: 'Facility Sites', show: canOffice },
    { value: 'expenses', label: 'Operational Expenses', show: canOffice },
    { value: 'quotations', label: 'Quotation Pipeline', show: canOffice },
    { value: 'invoices', label: 'Tax Invoices', show: canOffice },
    { value: 'bills', label: 'Monthly Bills', show: canOffice },
  ];

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Generate detailed reports and export verified operational data to Excel or formatted PDF"
      />

      <Toolbar>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label required>Report Category</Label>
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
                  <Label>Facility Site</Label>
                  <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                    <option value="">All managed sites</option>
                    {(sites ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}

              <div>
                <Label>Attendance Month</Label>
                <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleString('en', { month: 'long' })}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Attendance Year</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-3.5">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            loading={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh Data
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              loading={exporting === 'excel'}
              disabled={!!exporting}
              onClick={() => void exportReport('excel')}
              className="group border border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:bg-emerald-50/40 hover:border-emerald-300 hover:text-emerald-900 transition-all duration-150"
            >
              <FileSpreadsheet size={14} className="text-emerald-600 shrink-0 transition-transform duration-150 group-hover:scale-105" /> Download Excel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              loading={exporting === 'pdf'}
              disabled={!!exporting}
              onClick={() => void exportReport('pdf')}
              className="group border border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:bg-rose-50/40 hover:border-rose-300 hover:text-rose-900 transition-all duration-150"
            >
              <FileDown size={14} className="text-rose-600 shrink-0 transition-transform duration-150 group-hover:scale-105" /> Download PDF
            </Button>
          </div>
        </div>
      </Toolbar>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            {type === 'attendance' ? (
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4.5 py-3">Date</th>
                    <th className="px-4.5 py-3">Employee Details</th>
                    <th className="px-4.5 py-3">Facility Site</th>
                    <th className="px-4.5 py-3">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((data?.records as Array<{
                    id: string;
                    date: string;
                    status: string;
                    employee: { name: string; employeeCode: string };
                    site: { name: string };
                  }>) ?? []).map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-teal-50/35 transition ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}
                    >
                      <td className="px-4.5 py-3.5 text-xs font-medium text-slate-600">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-4.5 py-3.5">
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded mr-2">
                          {row.employee.employeeCode}
                        </span>
                        <span className="font-semibold text-slate-900">{row.employee.name}</span>
                      </td>
                      <td className="px-4.5 py-3.5 text-slate-700 text-xs">{row.site.name}</td>
                      <td className="px-4.5 py-3.5">
                        <Badge
                          tone={
                            row.status === 'PRESENT'
                              ? 'green'
                              : row.status === 'ABSENT'
                                ? 'red'
                                : row.status === 'WEEKLY_OFF'
                                  ? 'blue'
                                  : 'amber'
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {type === 'employees' ? (
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4.5 py-3">Staff ID</th>
                    <th className="px-4.5 py-3">Employee Name</th>
                    <th className="px-4.5 py-3">Designation</th>
                    <th className="px-4.5 py-3">Facility Site</th>
                    <th className="px-4.5 py-3">Monthly Wage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((data?.items as Array<{
                    id: string;
                    employeeCode: string;
                    name: string;
                    designation: string;
                    salary: number;
                    site: { name: string };
                  }>) ?? []).map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-teal-50/35 transition ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}
                    >
                      <td className="px-4.5 py-3.5 font-mono text-xs font-bold text-teal-800">
                        {row.employeeCode}
                      </td>
                      <td className="px-4.5 py-3.5 font-bold text-slate-900">{row.name}</td>
                      <td className="px-4.5 py-3.5 text-slate-700 text-xs">
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                          {row.designation}
                        </span>
                      </td>
                      <td className="px-4.5 py-3.5 text-slate-700 text-xs">{row.site.name}</td>
                      <td className="px-4.5 py-3.5 font-bold text-slate-900 tabular-nums">
                        {formatMoney(row.salary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {type === 'quotations' || type === 'invoices' ? (
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4.5 py-3">Document Number</th>
                    <th className="px-4.5 py-3">Client Company</th>
                    <th className="px-4.5 py-3">Facility Site</th>
                    <th className="px-4.5 py-3">Status</th>
                    <th className="px-4.5 py-3">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((data?.items as Array<{
                    id: string;
                    quotationNumber?: string;
                    invoiceNumber?: string;
                    status: string;
                    total: number;
                    client: { companyName: string };
                    site: { name: string };
                  }>) ?? []).map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-teal-50/35 transition ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}
                    >
                      <td className="px-4.5 py-3.5 font-mono text-xs font-bold text-teal-800">
                        {row.quotationNumber ?? row.invoiceNumber}
                      </td>
                      <td className="px-4.5 py-3.5 font-bold text-slate-900">{row.client.companyName}</td>
                      <td className="px-4.5 py-3.5 text-slate-700 text-xs">{row.site.name}</td>
                      <td className="px-4.5 py-3.5">
                        <Badge
                          tone={
                            row.status === 'FINALIZED'
                              ? 'green'
                              : row.status === 'PENDING'
                                ? 'amber'
                                : 'slate'
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4.5 py-3.5 font-bold text-slate-900 tabular-nums">
                        {formatMoney(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {type === 'bills' ? (
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4.5 py-3">Bill Number</th>
                    <th className="px-4.5 py-3">Referenced Invoice</th>
                    <th className="px-4.5 py-3">Billing Month</th>
                    <th className="px-4.5 py-3">Client Company</th>
                    <th className="px-4.5 py-3">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((data?.items as Array<{
                    id: string;
                    billNumber: string;
                    billingMonth: string;
                    grandTotal: number;
                    invoice: { invoiceNumber: string; client: { companyName: string } };
                  }>) ?? []).map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-teal-50/35 transition ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}
                    >
                      <td className="px-4.5 py-3.5 font-mono text-xs font-bold text-teal-800">
                        {row.billNumber}
                      </td>
                      <td className="px-4.5 py-3.5 font-mono text-xs text-slate-700">
                        {row.invoice.invoiceNumber}
                      </td>
                      <td className="px-4.5 py-3.5 text-xs font-semibold text-slate-700">
                        {row.billingMonth}
                      </td>
                      <td className="px-4.5 py-3.5 font-bold text-slate-900">
                        {row.invoice.client.companyName}
                      </td>
                      <td className="px-4.5 py-3.5 font-bold text-slate-900 tabular-nums">
                        {formatMoney(row.grandTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {type === 'clients' ? (
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4.5 py-3">Client Company</th>
                    <th className="px-4.5 py-3">Contact Person</th>
                    <th className="px-4.5 py-3">Mobile Number</th>
                    <th className="px-4.5 py-3">Email</th>
                    <th className="px-4.5 py-3">GST Number</th>
                    <th className="px-4.5 py-3">Active Sites</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((data?.items as Array<{
                    id: string;
                    companyName: string;
                    contactPerson?: string;
                    mobile: string;
                    email?: string;
                    gstNumber?: string;
                    _count?: { sites: number };
                  }>) ?? []).map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-teal-50/35 transition ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}
                    >
                      <td className="px-4.5 py-3.5 font-bold text-slate-900">{row.companyName}</td>
                      <td className="px-4.5 py-3.5 text-slate-700 text-xs">{row.contactPerson || '-'}</td>
                      <td className="px-4.5 py-3.5 text-xs font-medium text-slate-700">{row.mobile}</td>
                      <td className="px-4.5 py-3.5 text-xs text-slate-500">{row.email || '-'}</td>
                      <td className="px-4.5 py-3.5 text-xs font-mono text-slate-600">{row.gstNumber || '-'}</td>
                      <td className="px-4.5 py-3.5">
                        <Badge tone="teal">{row._count?.sites ?? 0} Sites</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {type === 'sites' ? (
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4.5 py-3">Site Name</th>
                    <th className="px-4.5 py-3">Client Company</th>
                    <th className="px-4.5 py-3">Supervisor Name</th>
                    <th className="px-4.5 py-3">Contact Number</th>
                    <th className="px-4.5 py-3">Assigned Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((data?.items as Array<{
                    id: string;
                    name: string;
                    client: { companyName: string };
                    supervisorName?: string;
                    contactNumber?: string;
                    _count?: { employees: number };
                  }>) ?? []).map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-teal-50/35 transition ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}
                    >
                      <td className="px-4.5 py-3.5 font-bold text-slate-900">{row.name}</td>
                      <td className="px-4.5 py-3.5 text-slate-700 text-xs">{row.client?.companyName ?? '-'}</td>
                      <td className="px-4.5 py-3.5 text-slate-700 text-xs">{row.supervisorName || '-'}</td>
                      <td className="px-4.5 py-3.5 text-xs text-slate-600">{row.contactNumber || '-'}</td>
                      <td className="px-4.5 py-3.5">
                        <Badge tone="teal">{row._count?.employees ?? 0} Staff</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {type === 'expenses' ? (
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4.5 py-3">Voucher No</th>
                    <th className="px-4.5 py-3">Date</th>
                    <th className="px-4.5 py-3">Category</th>
                    <th className="px-4.5 py-3">Particulars</th>
                    <th className="px-4.5 py-3">Facility Site / Staff</th>
                    <th className="px-4.5 py-3">Payment Mode</th>
                    <th className="px-4.5 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((data?.items as Array<{
                    id: string;
                    expenseNumber: string;
                    date: string;
                    category: string;
                    title: string;
                    amount: number;
                    paymentMode: string;
                    site?: { name: string };
                    employee?: { name: string };
                  }>) ?? []).map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-teal-50/35 transition ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}
                    >
                      <td className="px-4.5 py-3.5 font-mono text-xs font-bold text-teal-800">
                        {row.expenseNumber}
                      </td>
                      <td className="px-4.5 py-3.5 text-xs text-slate-600 font-medium">{formatDate(row.date)}</td>
                      <td className="px-4.5 py-3.5">
                        <Badge
                          tone={
                            row.category === 'MATERIAL'
                              ? 'green'
                              : row.category === 'UNIFORM'
                                ? 'blue'
                                : row.category === 'ADVANCE'
                                  ? 'amber'
                                  : 'slate'
                          }
                        >
                          {row.category}
                        </Badge>
                      </td>
                      <td className="px-4.5 py-3.5 font-bold text-slate-900 text-xs">{row.title}</td>
                      <td className="px-4.5 py-3.5 text-slate-700 text-xs">
                        {row.employee?.name ? `Staff: ${row.employee.name}` : row.site?.name ?? 'Head Office'}
                      </td>
                      <td className="px-4.5 py-3.5 text-xs text-slate-600">{row.paymentMode}</td>
                      <td className="px-4.5 py-3.5 font-bold text-slate-900 tabular-nums">
                        {formatMoney(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
