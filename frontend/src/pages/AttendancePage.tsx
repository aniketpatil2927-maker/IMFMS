import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  Plus,
  Printer,
  Save,
  Search,
  ShieldCheck,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { attendanceApi, employeesApi, sitesApi } from '../services/resources';
import {
  Alert,
  Badge,
  Button,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatsCard,
  Toolbar,
} from '../components/ui';
import { downloadBlob, getErrorMessage } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface RegisterEmployee {
  id: string;
  serial: number;
  employeeCode: string;
  name: string;
  designation: string;
  days: Record<number, string>;
  wDays: number;
  wo: number;
  otLeave: number;
  total: number;
}

interface SiteRegisterResponse {
  year: number;
  month: number;
  daysInMonth: number;
  site: {
    id: string;
    name: string;
    supervisorName: string;
    contactNumber: string;
    client?: { companyName: string };
  } | null;
  sites?: Array<{
    id: string;
    name: string;
    clientName: string;
    supervisorName: string;
    contactNumber: string;
    staffCount: number;
  }>;
  employees: RegisterEmployee[];
  summary: {
    totalEmployees: number;
    hkSupDays: number;
    hkDays: number;
    totalDays: number;
  };
}

const SITE_CARD_TONES: Array<'teal' | 'sky' | 'amber' | 'rose' | 'emerald' | 'indigo'> = [
  'teal',
  'sky',
  'emerald',
  'indigo',
  'amber',
  'rose',
];

export function AttendancePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isSupervisor = user?.role === 'SITE_SUPERVISOR';
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSiteId = searchParams.get('site');
  const [siteSearch, setSiteSearch] = useState('');

  // Stable date reference
  const todayRef = useMemo(() => new Date(), []);
  const todayYear = todayRef.getFullYear();
  const todayMonth = todayRef.getMonth() + 1;
  const todayDate = todayRef.getDate();
  const todayDayOfWeek = todayRef.getDay();

  const [year, setYear] = useState<number>(todayYear);
  const [month, setMonth] = useState<number>(todayMonth);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(
    urlSiteId || (isSupervisor ? user?.siteId ?? null : null),
  );

  // Sync state if URL searchParam changes (e.g. back / forward browser navigation)
  useEffect(() => {
    if (urlSiteId) {
      setSelectedSiteId(urlSiteId);
    } else if (!isSupervisor && !urlSiteId) {
      setSelectedSiteId(null);
    }
  }, [urlSiteId, isSupervisor]);

  const handleSelectSite = useCallback(
    (siteId: string | null) => {
      if (siteId) {
        setSearchParams({ site: siteId });
      } else {
        setSearchParams({});
      }
      setSelectedSiteId(siteId);
      setSearch('');
      setMessage('');
      setError('');
    },
    [setSearchParams],
  );

  // Local state for interactive editing of attendance register
  const [localEmployees, setLocalEmployees] = useState<RegisterEmployee[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);

  // Add Employee to site modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffDesig, setNewStaffDesig] = useState('Housekeeping');
  const [newStaffMobile, setNewStaffMobile] = useState('');
  const [newStaffSalary, setNewStaffSalary] = useState('15000');
  const [staffModalError, setStaffModalError] = useState('');

  // 1. Fetch lite sites list for site picker dropdown and tabs
  const { data: sitesList } = useQuery({
    queryKey: ['sites-lite-all'],
    queryFn: async () => (await sitesApi.lite()).data.data!,
  });

  // 2. Fetch monthly register data (Site -> Assigned Staff -> Attendance)
  const {
    data: registerData,
    isLoading: isRegisterLoading,
  } = useQuery({
    queryKey: ['attendance-site-register', selectedSiteId, year, month],
    queryFn: async () => {
      const res = await attendanceApi.getMonthly({
        siteId: selectedSiteId || undefined,
        year,
        month,
      });
      return res.data.data as SiteRegisterResponse;
    },
  });

  // Keep localEmployees in sync with queried data when fetched
  useEffect(() => {
    if (registerData?.employees) {
      setLocalEmployees(registerData.employees);
      setIsDirty(false);
    } else {
      setLocalEmployees([]);
      setIsDirty(false);
    }
  }, [registerData?.employees]);

  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // Recalculate summary stats based on localEmployees
  const currentSummary = useMemo(() => {
    let hkSupDays = 0;
    let hkDays = 0;
    let presentTodayCount = 0;
    const isCurrentMonth = todayYear === year && todayMonth === month;

    localEmployees.forEach((emp) => {
      const desigLower = (emp.designation || '').toLowerCase();
      const isSup = desigLower.includes('sup') || desigLower.includes('supervisor');
      const tot = emp.total || 0;
      if (isSup) hkSupDays += tot;
      else hkDays += tot;

      if (isCurrentMonth && (emp.days?.[todayDate] === 'P' || emp.days?.[todayDate] === '1/2')) {
        presentTodayCount += 1;
      }
    });

    return {
      totalEmployees: localEmployees.length,
      presentToday: presentTodayCount,
      hkSupDays: Number(hkSupDays.toFixed(2)),
      hkDays: Number(hkDays.toFixed(2)),
      totalDays: Number((hkSupDays + hkDays).toFixed(2)),
    };
  }, [localEmployees, year, month, todayYear, todayMonth, todayDate]);

  // Filtered staff list by search query
  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return localEmployees;
    const q = search.toLowerCase().trim();
    return localEmployees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        (e.designation || '').toLowerCase().includes(q),
    );
  }, [localEmployees, search]);

  // All available sites (from monthly overview or lite sites query)
  const availableSites = useMemo(() => {
    return registerData?.sites || sitesList || [];
  }, [registerData?.sites, sitesList]);

  // Filtered sites for overview cards search
  const filteredSites = useMemo(() => {
    if (!siteSearch.trim()) return availableSites;
    const q = siteSearch.toLowerCase().trim();
    return availableSites.filter((s) => {
      const name = s.name.toLowerCase();
      const client = 'clientName' in s ? (s.clientName as string).toLowerCase() : '';
      const sup = 'supervisorName' in s ? (s.supervisorName as string).toLowerCase() : '';
      return name.includes(q) || client.includes(q) || sup.includes(q);
    });
  }, [availableSites, siteSearch]);

  // Handle cell click toggle: Cycles P -> WO -> 1/2 -> A -> L -> P
  const handleCellClick = useCallback(
    (empId: string, day: number) => {
      setLocalEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id !== empId) return emp;

          const isSunday = new Date(year, month - 1, day).getDay() === 0;
          const currentVal = (emp.days?.[day] || '').trim().toUpperCase();

          let nextVal = 'P';
          if (!currentVal) {
            nextVal = isSunday ? 'WO' : 'P';
          } else if (currentVal === 'P' || currentVal === 'PRESENT') {
            nextVal = 'WO';
          } else if (currentVal === 'WO' || currentVal === 'W/O') {
            nextVal = '1/2';
          } else if (currentVal === '1/2' || currentVal === 'HD' || currentVal === '0.5') {
            nextVal = 'A';
          } else if (currentVal === 'A' || currentVal === 'ABSENT') {
            nextVal = 'L';
          } else if (currentVal === 'L' || currentVal === 'P/L' || currentVal === 'PL') {
            nextVal = isSunday ? 'WO' : 'P';
          }

          const updatedDays = { ...emp.days, [day]: nextVal };

          // Recalculate totals for this employee
          let pCount = 0;
          let woCount = 0;
          let halfDayCount = 0;
          let otLeaveCount = 0;

          for (let d = 1; d <= daysInMonth; d++) {
            const v = (updatedDays[d] || '').trim().toUpperCase();
            if (v === 'P' || v === 'PRESENT') pCount++;
            else if (v === 'WO' || v === 'W/O') woCount++;
            else if (v === '1/2' || v === 'HD' || v === '0.5') halfDayCount++;
            else if (v === 'L' || v === 'P/L' || v === 'PL' || v === 'OT' || v === 'LEAVE') otLeaveCount++;
          }

          const wDays = pCount + halfDayCount;
          const wo = woCount;
          const otLeave = otLeaveCount;
          const total = pCount + halfDayCount * 0.5 + wo + otLeave;

          return {
            ...emp,
            days: updatedDays,
            wDays,
            wo,
            otLeave,
            total,
          };
        }),
      );
      setIsDirty(true);
    },
    [year, month, daysInMonth],
  );

  // Quick Action: Fill Standard Month (Mon-Sat = P, Sun = WO)
  const handleFillStandardMonth = () => {
    setLocalEmployees((prev) =>
      prev.map((emp) => {
        const days: Record<number, string> = {};
        let pCount = 0;
        let woCount = 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const isSunday = new Date(year, month - 1, d).getDay() === 0;
          if (isSunday) {
            days[d] = 'WO';
            woCount++;
          } else {
            days[d] = 'P';
            pCount++;
          }
        }

        return {
          ...emp,
          days,
          wDays: pCount,
          wo: woCount,
          otLeave: 0,
          total: pCount + woCount,
        };
      }),
    );
    setIsDirty(true);
    setMessage('Standard monthly schedule (Mon-Sat: P, Sun: WO) applied. Click Save to persist.');
  };

  // Quick Action: Mark Today Present for all staff
  const handleMarkTodayPresent = () => {
    if (todayYear !== year || todayMonth !== month) {
      setError(`Cannot mark today: Current selection is ${MONTH_NAMES[month - 1]} ${year}.`);
      return;
    }
    const isSunday = todayDayOfWeek === 0;
    const statusToSet = isSunday ? 'WO' : 'P';

    setLocalEmployees((prev) =>
      prev.map((emp) => {
        const updatedDays = { ...emp.days, [todayDate]: statusToSet };
        let pCount = 0;
        let woCount = 0;
        let halfDayCount = 0;
        let otLeaveCount = 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const v = (updatedDays[d] || '').trim().toUpperCase();
          if (v === 'P' || v === 'PRESENT') pCount++;
          else if (v === 'WO' || v === 'W/O') woCount++;
          else if (v === '1/2' || v === 'HD' || v === '0.5') halfDayCount++;
          else if (v === 'L' || v === 'P/L' || v === 'PL' || v === 'OT' || v === 'LEAVE') otLeaveCount++;
        }

        return {
          ...emp,
          days: updatedDays,
          wDays: pCount + halfDayCount,
          wo: woCount,
          otLeave: otLeaveCount,
          total: pCount + halfDayCount * 0.5 + woCount + otLeaveCount,
        };
      }),
    );
    setIsDirty(true);
    setMessage(`Today (Day ${todayDate}) set to '${statusToSet}' for all staff. Click Save to persist.`);
  };

  // Save Mutation: Persists all attendance changes for this site
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSiteId) throw new Error('Please select a site to save attendance');
      const siteObj = sitesList?.find((s) => s.id === selectedSiteId);
      const siteName = registerData?.site?.name || siteObj?.name || 'Facility Site';

      return attendanceApi.saveBulkRegister({
        siteId: selectedSiteId,
        siteName,
        month,
        year,
        employees: localEmployees,
      });
    },
    onSuccess: async (res) => {
      setIsDirty(false);
      setMessage(res.data.message || 'Attendance records saved successfully to database');
      setError('');
      await qc.invalidateQueries({ queryKey: ['attendance-site-register'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setMessage('');
    },
  });

  // Export Excel: Exact format of ATTN FORMAT-3.xlsx
  const handleExportExcel = async () => {
    try {
      setExportLoading('excel');
      const siteName = registerData?.site?.name || 'Facility Attendance Register';
      const res = await attendanceApi.generateRegisterExcel({
        siteName,
        month,
        year,
        employees: localEmployees,
        hkSupDays: currentSummary.hkSupDays,
        hkDays: currentSummary.hkDays,
        totalDays: currentSummary.totalDays,
      });
      const cleanName = siteName.replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadBlob(res.data, `attendance-${cleanName}-${year}-${String(month).padStart(2, '0')}.xlsx`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExportLoading(null);
    }
  };

  // Export PDF: Landscape A4 exact replica of ATTN FORMAT-3.xlsx
  const handleExportPdf = async () => {
    try {
      setExportLoading('pdf');
      const siteName = registerData?.site?.name || 'Facility Attendance Register';
      const res = await attendanceApi.generateRegisterPdf({
        siteName,
        month,
        year,
        employees: localEmployees,
        hkSupDays: currentSummary.hkSupDays,
        hkDays: currentSummary.hkDays,
        totalDays: currentSummary.totalDays,
      });
      const cleanName = siteName.replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadBlob(res.data, `attendance-${cleanName}-${year}-${String(month).padStart(2, '0')}.pdf`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExportLoading(null);
    }
  };

  // Add Staff directly to this site mutation
  const addStaffMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSiteId) throw new Error('Site ID is missing');
      const code = `EMP-${Date.now().toString(36).toUpperCase().slice(-5)}`;
      return employeesApi.create({
        name: newStaffName.trim(),
        employeeCode: code,
        designation: newStaffDesig.trim() || 'Housekeeping',
        mobile: newStaffMobile.trim() || '9800000000',
        salary: Number(newStaffSalary) || 15000,
        joiningDate: new Date().toISOString().slice(0, 10),
        siteId: selectedSiteId,
        aadhaar: '',
        pan: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
      });
    },
    onSuccess: async () => {
      setShowAddStaffModal(false);
      setNewStaffName('');
      setNewStaffDesig('Housekeeping');
      setNewStaffMobile('');
      setNewStaffSalary('15000');
      setStaffModalError('');
      setMessage('Staff member successfully added to this site roster.');
      await qc.invalidateQueries({ queryKey: ['attendance-site-register', selectedSiteId, year, month] });
      await qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err) => {
      setStaffModalError(getErrorMessage(err));
    },
  });

  const selectedSiteInfo = useMemo(() => {
    if (!selectedSiteId) return null;
    const foundSite = sitesList?.find((s) => s.id === selectedSiteId);
    return {
      id: selectedSiteId,
      name: registerData?.site?.name || foundSite?.name || 'Selected Site',
      supervisorName: registerData?.site?.supervisorName || 'Site Supervisor',
      contactNumber: registerData?.site?.contactNumber || '-',
    };
  }, [selectedSiteId, registerData?.site, sitesList]);

  return (
    <div className="space-y-5 print:space-y-0">
      {/* Page Header (Hidden on Print) */}
      <div className="print:hidden">
        <PageHeader
          title="Staff Attendance Management"
          subtitle="Site-wise monthly attendance register, staff rosters, and statutory Excel/PDF export compliance"
          action={
            selectedSiteId ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => handleSelectSite(null)}
                  className="gap-1.5"
                >
                  <ArrowLeft size={14} /> Back to Sites
                </Button>
                <button
                  type="button"
                  disabled={saveMutation.isPending || !isDirty}
                  onClick={() => saveMutation.mutate()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 shadow-xs hover:shadow-md transition active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={15} />
                  {saveMutation.isPending ? 'Saving...' : isDirty ? 'Save Attendance *' : 'Attendance Saved'}
                </button>
              </div>
            ) : null
          }
        />
      </div>

      {/* Global Alerts */}
      {message ? (
        <Alert tone="success" onClose={() => setMessage('')} className="print:hidden">
          {message}
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="error" onClose={() => setError('')} className="print:hidden">
          {error}
        </Alert>
      ) : null}

      {/* Filter & Control Toolbar (Hidden on Print) */}
      <Toolbar className="print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Site Selector Dropdown */}
            <div className="min-w-56 sm:min-w-64">
              <Select
                icon={<Building2 size={15} />}
                value={selectedSiteId ?? ''}
                onChange={(e) => {
                  handleSelectSite(e.target.value || null);
                }}
              >
                <option value="">🏢 All Sites (Overview Cards)</option>
                {(sitesList ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Month Selector */}
            <div className="w-36">
              <Select
                icon={<Calendar size={15} />}
                value={month}
                onChange={(e) => {
                  setMonth(Number(e.target.value));
                  setMessage('');
                }}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Year Selector */}
            <div className="w-28">
              <Select
                value={year}
                onChange={(e) => {
                  setYear(Number(e.target.value));
                  setMessage('');
                }}
              >
                {[year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>

            {/* Staff Search Filter (Visible when site selected) */}
            {selectedSiteId ? (
              <div className="relative min-w-44 sm:min-w-56">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search size={14} />
                </div>
                <Input
                  placeholder="Search staff name / code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            ) : null}
          </div>

          {/* Export & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedSiteId ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => setShowAddStaffModal(true)}
                  className="gap-1.5"
                >
                  <Plus size={14} /> Add Staff
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  loading={exportLoading === 'excel'}
                  disabled={exportLoading !== null}
                  onClick={handleExportExcel}
                  className="gap-1.5 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                >
                  <FileSpreadsheet size={14} className="text-emerald-700" />
                  Excel (.xlsx)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  loading={exportLoading === 'pdf'}
                  disabled={exportLoading !== null}
                  onClick={handleExportPdf}
                  className="gap-1.5 text-rose-800 bg-rose-50 hover:bg-rose-100 border-rose-200"
                >
                  <Download size={14} className="text-rose-700" />
                  PDF (.pdf)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => window.print()}
                  className="gap-1.5"
                  title="Print Landscape Register Sheet"
                >
                  <Printer size={14} /> Print
                </Button>
              </>
            ) : (
              <span className="text-xs font-semibold text-slate-500">
                Select a facility site to manage staff attendance
              </span>
            )}
          </div>
        </div>
      </Toolbar>

      {/* VIEW 1: All Sites Overview Cards (When no site is selected) */}
      {!selectedSiteId ? (
        <div className="space-y-4 print:hidden">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pb-1 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Facility Sites Directory</h2>
                <Badge tone="teal">
                  {availableSites.length} {availableSites.length === 1 ? 'Site' : 'Sites'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any facility site card below to open and manage its assigned staff attendance register
              </p>
            </div>
            {availableSites.length > 2 && (
              <div className="relative w-full sm:w-64">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search size={14} />
                </div>
                <Input
                  placeholder="Search sites by name / client..."
                  value={siteSearch}
                  className="h-8.5 pl-8.5 text-xs"
                  onChange={(e) => setSiteSearch(e.target.value)}
                />
              </div>
            )}
          </div>

          {isRegisterLoading ? (
            <Spinner />
          ) : filteredSites.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50">
              <p className="text-sm font-semibold text-slate-700">No sites found matching &ldquo;{siteSearch}&rdquo;</p>
              <Button size="sm" variant="secondary" onClick={() => setSiteSearch('')} className="mt-2">
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSites.map((s, idx) => {
                const tone = SITE_CARD_TONES[idx % SITE_CARD_TONES.length];
                const staffCount =
                  'staffCount' in s
                    ? (s.staffCount as number)
                    : ((s as Record<string, unknown>)._count as { employees?: number })?.employees ?? 0;
                const clientName =
                  'clientName' in s
                    ? (s.clientName as string)
                    : ((s as Record<string, unknown>).client as { companyName?: string })?.companyName ?? '';
                const supervisor =
                  'supervisorName' in s && s.supervisorName !== '-'
                    ? (s.supervisorName as string)
                    : '';

                return (
                  <StatsCard
                    key={s.id}
                    label={s.name}
                    value={staffCount}
                    unit={staffCount === 1 ? 'Staff Member' : 'Staff Members'}
                    tone={tone}
                    iconTone={tone}
                    icon={<Building2 size={18} />}
                    hint={
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate text-slate-500">
                          {clientName ? `Client: ${clientName}` : supervisor ? `Sup: ${supervisor}` : 'Site Register'}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-teal-700 shrink-0 group-hover:translate-x-0.5 transition-transform ml-2">
                          Open Register <ArrowRight size={12} />
                        </span>
                      </div>
                    }
                    onClick={() => handleSelectSite(s.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* VIEW 2: Dedicated Site Attendance Register Sheet (Matching ATTN FORMAT-3.xlsx) */}
      {selectedSiteId ? (
        <div className="space-y-4">
          {/* Back Navigation Bar & Site Indicator (Hidden on print) */}
          <div className="print:hidden flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => handleSelectSite(null)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-teal-300 hover:bg-teal-50/40 hover:text-teal-800 transition cursor-pointer"
            >
              <ArrowLeft size={14} className="text-teal-600" />
              <span>Back to All Sites Directory</span>
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Current Site:</span>
              <span className="font-bold text-teal-900 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs">
                {selectedSiteInfo?.name}
              </span>
            </div>
          </div>

          {/* Site Context & Metric Cards (Hidden on print) */}
          <div className="print:hidden space-y-3.5">
            {/* Top Site Identity Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-2xl bg-gradient-to-r from-teal-50 via-teal-50/60 to-emerald-50/40 p-4 border border-teal-200/80 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold shadow-xs">
                  <Building2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      {selectedSiteInfo?.name}
                    </h2>
                    <span className="font-mono text-xs font-bold text-teal-800 bg-white px-2.5 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
                      {MONTH_NAMES[month - 1]} {year}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Supervisor: <strong>{selectedSiteInfo?.supervisorName || 'Site Supervisor'}</strong> • Contact:{' '}
                    <strong>{selectedSiteInfo?.contactNumber || '-'}</strong>
                  </p>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={handleMarkTodayPresent}
                  className="text-xs bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                  title="Marks 'P' for all staff on today's date"
                >
                  <UserCheck size={13} /> Mark Today ({todayDate} {MONTH_NAMES[todayMonth - 1].slice(0, 3)})
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={handleFillStandardMonth}
                  className="text-xs bg-white text-slate-700 hover:bg-slate-50"
                  title="Fills Mon-Sat = P and Sun = WO for the full month"
                >
                  <Calendar size={13} /> Fill Standard Month
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <StatsCard
                label="Assigned Site Staff"
                value={currentSummary.totalEmployees}
                unit="Staff"
                icon={<Users size={18} />}
                tone="teal"
                hint="Assigned directly to this site"
              />
              <StatsCard
                label="Present Today"
                value={currentSummary.presentToday}
                unit={`/ ${currentSummary.totalEmployees}`}
                icon={<UserCheck size={18} />}
                tone="emerald"
                hint={`Day ${todayDate} ${MONTH_NAMES[todayMonth - 1].slice(0, 3)}`}
              />
              <StatsCard
                label="Supervisor Days"
                value={currentSummary.hkSupDays}
                unit="Mandays"
                icon={<ShieldCheck size={18} />}
                tone="indigo"
                hint="H.K. Sup total days"
              />
              <StatsCard
                label="Total Site Mandays"
                value={currentSummary.totalDays}
                unit="Days"
                icon={<Clock size={18} />}
                tone="sky"
                hint="Total payable attendance"
              />
            </div>
          </div>

          {/* THE ATTENDANCE REGISTER (EXACT REPLICA of ATTN FORMAT-3.xlsx) */}
          <div className="rounded-2xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden print:border-black print:rounded-none">
            {/* Template Header Banner */}
            <div className="p-4 sm:p-5 text-center border-b border-slate-200 bg-gradient-to-b from-slate-50/80 to-white print:border-black">
              <h1 className="text-lg sm:text-2xl font-black tracking-wide text-[#702FA0] uppercase font-serif print:text-black">
                IMMACULATE MASTERS FACILITY MANAGEMENT SERVICES
              </h1>
              <div className="mt-3 flex items-center justify-between border-b-2 border-slate-800 pb-2 text-xs sm:text-sm font-bold text-slate-900 print:border-black">
                <div>
                  Site Name :-{' '}
                  <span className="font-extrabold underline text-teal-900 print:text-black">
                    {selectedSiteInfo?.name || 'Facility Site'}
                  </span>
                </div>
                <div>
                  Month :{' '}
                  <span className="font-extrabold underline text-teal-900 print:text-black">
                    {MONTH_NAMES[month - 1]} {year}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            {isRegisterLoading ? (
              <div className="p-12 text-center">
                <Spinner />
                <p className="text-xs text-slate-400 mt-2">Loading site staff roster and attendance records...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                  <Users size={24} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {search ? 'No matching staff found' : 'No staff currently assigned to this site'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {search
                    ? `No employees match "${search}". Clear the search query to see all staff.`
                    : 'Add employees assigned to this site using the button below or transfer employees from the Staff page.'}
                </p>
                {!search ? (
                  <Button
                    size="sm"
                    variant="primary"
                    type="button"
                    onClick={() => setShowAddStaffModal(true)}
                    className="gap-1.5"
                  >
                    <Plus size={14} /> Add Staff to this Site
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-800 text-[11px] select-none print:text-[9px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900 border-b-2 border-slate-800 print:bg-slate-200">
                      <th className="border border-slate-800 px-2 py-2 text-center w-10">Sr No</th>
                      <th className="border border-slate-800 px-3 py-2 text-left min-w-44">Employee Name</th>
                      <th className="border border-slate-800 px-2.5 py-2 text-left min-w-28">Designation</th>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const dayNum = i + 1;
                        const dateObj = new Date(year, month - 1, dayNum);
                        const isSunday = dateObj.getDay() === 0;
                        const weekday = WEEKDAY_SHORT[dateObj.getDay()];

                        return (
                          <th
                            key={dayNum}
                            className={`border border-slate-800 px-1 py-1.5 text-center min-w-8.5 ${
                              isSunday ? 'bg-rose-100 text-rose-800 font-extrabold' : ''
                            }`}
                          >
                            <div className="leading-tight">
                              <div>{dayNum}</div>
                              <div className="text-[9px] font-semibold opacity-75 print:text-[7px]">{weekday}</div>
                            </div>
                          </th>
                        );
                      })}
                      <th className="border border-slate-800 px-2 py-2 text-center bg-slate-200 text-slate-900 font-bold w-14">
                        W Days
                      </th>
                      <th className="border border-slate-800 px-1.5 py-2 text-center bg-slate-200 text-slate-900 font-bold w-12">
                        W/O
                      </th>
                      <th className="border border-slate-800 px-1.5 py-2 text-center bg-slate-200 text-slate-900 font-bold w-13">
                        OT Hrs
                      </th>
                      <th className="border border-slate-800 px-2 py-2 text-center bg-teal-100 text-teal-950 font-extrabold w-16">
                        TOTAL
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEmployees.map((emp, empIdx) => {
                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-teal-50/30 transition border-b border-slate-300"
                        >
                          <td className="border border-slate-800 px-2 py-1.5 text-center font-bold text-slate-700">
                            {emp.serial ?? empIdx + 1}
                          </td>
                          <td className="border border-slate-800 px-3 py-1.5 text-left font-bold text-slate-900">
                            <div>{emp.name}</div>
                            <div className="font-mono text-[9px] font-normal text-slate-400 print:hidden">
                              {emp.employeeCode}
                            </div>
                          </td>
                          <td className="border border-slate-800 px-2.5 py-1.5 text-left text-slate-700">
                            {emp.designation || 'Housekeeping'}
                          </td>

                          {/* Day-by-day attendance marks */}
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const dayNum = i + 1;
                            const isSunday = new Date(year, month - 1, dayNum).getDay() === 0;
                            const val = (emp.days?.[dayNum] || '').trim().toUpperCase();

                            let cellTone = 'text-slate-300';
                            let bgClass = '';
                            if (val === 'P' || val === 'PRESENT') {
                              cellTone = 'text-emerald-800 font-bold bg-emerald-50';
                            } else if (val === 'WO' || val === 'W/O') {
                              cellTone = 'text-indigo-800 font-bold bg-indigo-50';
                            } else if (val === '1/2' || val === 'HD' || val === '0.5') {
                              cellTone = 'text-amber-800 font-bold bg-amber-50';
                            } else if (val === 'A' || val === 'ABSENT') {
                              cellTone = 'text-rose-800 font-bold bg-rose-50';
                            } else if (val === 'L' || val === 'P/L' || val === 'PL' || val === 'OT') {
                              cellTone = 'text-purple-800 font-bold bg-purple-50';
                            }

                            if (isSunday && !val) {
                              bgClass = 'bg-rose-50/50';
                            }

                            return (
                              <td
                                key={dayNum}
                                onClick={() => handleCellClick(emp.id, dayNum)}
                                className={`border border-slate-800 p-0 text-center cursor-pointer transition select-none ${bgClass} hover:ring-2 hover:ring-teal-500 hover:z-10`}
                                title={`${emp.name} - Day ${dayNum} (${val || 'Unset'})\nClick to change`}
                              >
                                <div
                                  className={`h-7 sm:h-8 flex items-center justify-center text-xs print:h-6 print:text-[8px] ${cellTone}`}
                                >
                                  {val || '·'}
                                </div>
                              </td>
                            );
                          })}

                          {/* Computed Totals */}
                          <td className="border border-slate-800 px-2 py-1.5 text-center font-bold text-slate-800 bg-slate-50">
                            {String(emp.wDays).padStart(2, '0')}
                          </td>
                          <td className="border border-slate-800 px-1.5 py-1.5 text-center font-bold text-slate-800 bg-slate-50">
                            {String(emp.wo).padStart(2, '0')}
                          </td>
                          <td className="border border-slate-800 px-1.5 py-1.5 text-center text-slate-700 bg-slate-50">
                            {emp.otLeave > 0
                              ? emp.otLeave === 1
                                ? 'P/L'
                                : String(emp.otLeave).padStart(2, '0')
                              : '00'}
                          </td>
                          <td className="border border-slate-800 px-2 py-1.5 text-center font-black text-slate-900 bg-teal-50/70">
                            {Number.isInteger(emp.total) ? emp.total : emp.total.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Summary Section (Matches ATTN FORMAT-3.xlsx) */}
            <div className="p-4 sm:p-5 border-t-2 border-slate-800 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:border-black">
              {/* Legend Help */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 print:text-[8px]">
                <span className="font-bold text-slate-800">Legend:</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  P = Present
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                  WO = Weekly Off
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  1/2 = Half Day
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-200">
                  A = Absent
                </span>
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold border border-purple-200">
                  L / PL = Leave
                </span>
              </div>

              {/* Exact Totals Box */}
              <div className="border border-slate-300 rounded-xl bg-white p-3 space-y-1 text-xs font-bold text-right shadow-2xs print:border-black">
                <div className="text-slate-700">
                  H.K. Sup = <span className="font-mono text-slate-900 text-sm">{currentSummary.hkSupDays}</span> Days
                </div>
                <div className="text-slate-700">
                  H.K. = <span className="font-mono text-slate-900 text-sm">{currentSummary.hkDays}</span> Days
                </div>
                <div className="pt-1 border-t border-slate-200 text-sm font-black text-teal-900">
                  Total = <span className="font-mono">{currentSummary.totalDays}</span> Mandays
                </div>
              </div>
            </div>

            {/* Official Signatures Row (Matches ATTN FORMAT-3.xlsx) */}
            <div className="p-6 sm:p-8 pt-10 sm:pt-14 border-t border-slate-300 bg-white grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-900 print:border-black print:text-[9px]">
              <div>
                <div className="w-4/5 mx-auto border-t-2 border-slate-800 pt-1.5 print:border-black">
                  Area Manager signature
                </div>
              </div>
              <div>
                <div className="w-4/5 mx-auto border-t-2 border-slate-800 pt-1.5 print:border-black">
                  Operation Manager Signature
                </div>
              </div>
              <div>
                <div className="w-4/5 mx-auto border-t-2 border-slate-800 pt-1.5 print:border-black">
                  Client Signature
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Add Staff Directly to Site Modal */}
      <Modal
        isOpen={showAddStaffModal}
        onClose={() => {
          setShowAddStaffModal(false);
          setStaffModalError('');
        }}
        title={`Add Staff to ${selectedSiteInfo?.name || 'Site'}`}
        subtitle="Create an employee assigned directly to this facility site roster"
        icon={<Users size={20} className="text-teal-600" />}
        badge={
          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200/70 shadow-2xs">
            Site Staff
          </span>
        }
        maxWidth="max-w-lg"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newStaffName.trim()) {
              setStaffModalError('Staff full name is required');
              return;
            }
            addStaffMutation.mutate();
          }}
        >
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div>
              <Label required>Full Name</Label>
              <Input
                placeholder="e.g. Pooja Shinde"
                icon={<User size={15} />}
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
              />
            </div>
            <div>
              <Label required>Designation / Role</Label>
              <Input
                placeholder="e.g. Housekeeping / H.K. Sup"
                icon={<Briefcase size={15} />}
                value={newStaffDesig}
                onChange={(e) => setNewStaffDesig(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Mobile Number</Label>
                <Input
                  placeholder="e.g. 9876543210"
                  value={newStaffMobile}
                  onChange={(e) => setNewStaffMobile(e.target.value)}
                />
              </div>
              <div>
                <Label required>Monthly Salary (₹)</Label>
                <Input
                  type="number"
                  placeholder="15000"
                  value={newStaffSalary}
                  onChange={(e) => setNewStaffSalary(e.target.value)}
                />
              </div>
            </div>
          </div>

          {staffModalError ? <Alert tone="error">{staffModalError}</Alert> : null}

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/80 bg-white -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-4 py-3 sm:px-6 sm:py-3.5 rounded-b-2xl">
            <span className="text-xs text-slate-500">Assigns directly to this facility site</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => setShowAddStaffModal(false)}
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={addStaffMutation.isPending || !newStaffName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 shadow-xs hover:shadow-md transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <Plus size={15} />
                {addStaffMutation.isPending ? 'Adding...' : 'Add to Site'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
