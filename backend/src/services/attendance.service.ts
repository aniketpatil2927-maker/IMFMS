import { attendanceRepository } from '../repositories/attendance.repository.js';
import { employeeRepository } from '../repositories/employee.repository.js';
import { siteRepository } from '../repositories/site.repository.js';
import { AppError } from '../utils/AppError.js';
import type { DailyAttendanceInput } from '../validators/attendance.validator.js';

function parseDateOnly(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError('Invalid date', 400);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

import { prisma } from '../config/database.js';

export const attendanceService = {
  async saveDaily(input: DailyAttendanceInput) {
    const site = await siteRepository.findById(input.siteId);
    if (!site) throw new AppError('Site not found', 404);

    const date = parseDateOnly(input.date);
    const employees = await employeeRepository.findActiveBySite(input.siteId);
    const employeeIds = new Set(employees.map((e) => e.id));

    for (const entry of input.entries) {
      if (!employeeIds.has(entry.employeeId)) {
        throw new AppError(`Employee ${entry.employeeId} is not assigned to this site`, 400);
      }
    }

    await attendanceRepository.upsertMany(
      input.entries.map((entry) => ({
        employeeId: entry.employeeId,
        siteId: input.siteId,
        date,
        status: entry.status,
      })),
    );

    return this.getDaily(input.siteId, input.date);
  },

  async getDaily(siteId: string, dateStr: string) {
    const site = await siteRepository.findById(siteId);
    if (!site) throw new AppError('Site not found', 404);

    const date = parseDateOnly(dateStr);
    const employees = await employeeRepository.findActiveBySite(siteId);
    const records = await attendanceRepository.findBySiteAndDate(siteId, date);
    const byEmployee = new Map(records.map((r) => [r.employeeId, r]));

    return {
      site: { id: site.id, name: site.name },
      date: dateStr,
      entries: employees.map((emp) => ({
        employee: {
          id: emp.id,
          employeeCode: emp.employeeCode,
          name: emp.name,
          designation: emp.designation,
        },
        status: byEmployee.get(emp.id)?.status ?? null,
        attendanceId: byEmployee.get(emp.id)?.id ?? null,
      })),
    };
  },

  async getMonthly(params: {
    siteId?: string;
    year: number;
    month: number;
    employeeId?: string;
  }) {
    const year = Math.max(2000, Math.min(2100, Number(params.year) || new Date().getFullYear()));
    const month = Math.max(1, Math.min(12, Number(params.month) || (new Date().getMonth() + 1)));
    const daysInMonth = new Date(year, month, 0).getDate();

    const records = await attendanceRepository.findMonthly({ ...params, year, month });

    let site = null;
    let employeesWithAttendance: Array<{
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
    }> = [];

    let totalHkSupDays = 0;
    let totalHkDays = 0;

    if (params.siteId) {
      site = await prisma.site.findUnique({
        where: { id: params.siteId },
        include: { client: { select: { id: true, companyName: true } } },
      });

      const activeEmployees = await employeeRepository.findActiveBySite(params.siteId);

      const recordsByEmp = new Map<string, Map<number, string>>();
      for (const r of records) {
        const dayNum = new Date(r.date).getUTCDate();
        if (!recordsByEmp.has(r.employeeId)) recordsByEmp.set(r.employeeId, new Map());
        let code = 'P';
        if (r.status === 'PRESENT') code = 'P';
        else if (r.status === 'ABSENT') code = 'A';
        else if (r.status === 'HALF_DAY') code = '1/2';
        else if (r.status === 'LEAVE') code = 'L';
        else if (r.status === 'HOLIDAY') code = 'H';
        recordsByEmp.get(r.employeeId)!.set(dayNum, code);
      }

      employeesWithAttendance = activeEmployees.map((emp, index) => {
        const empDaysMap = recordsByEmp.get(emp.id) || new Map();
        const days: Record<number, string> = {};
        let pCount = 0;
        let woCount = 0;
        let halfDayCount = 0;
        let otLeaveCount = 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const isSunday = new Date(year, month - 1, d).getDay() === 0;
          const savedCode = empDaysMap.get(d);
          const code = savedCode !== undefined ? savedCode : (isSunday ? 'WO' : '');
          days[d] = code;

          const upper = (code || '').toUpperCase();
          if (upper === 'P' || upper === 'PRESENT') pCount++;
          else if (upper === 'WO' || upper === 'W/O') woCount++;
          else if (upper === '1/2' || upper === 'HD' || upper === '0.5') halfDayCount++;
          else if (upper === 'L' || upper === 'P/L' || upper === 'PL' || upper === 'OT' || upper === 'LEAVE') otLeaveCount++;
        }

        const wDays = pCount + halfDayCount;
        const wo = woCount;
        const otLeave = otLeaveCount;
        const total = pCount + (halfDayCount * 0.5) + wo + otLeave;

        const desigLower = (emp.designation || '').toLowerCase();
        if (desigLower.includes('sup') || desigLower.includes('supervisor')) {
          totalHkSupDays += total;
        } else {
          totalHkDays += total;
        }

        return {
          id: emp.id,
          serial: index + 1,
          employeeCode: emp.employeeCode,
          name: emp.name,
          designation: emp.designation,
          days,
          wDays,
          wo,
          otLeave,
          total,
        };
      });
    }

    const allSites = await prisma.site.findMany({
      include: {
        client: { select: { companyName: true } },
        _count: { select: { employees: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    return {
      year,
      month,
      daysInMonth,
      site: site
        ? {
            id: site.id,
            name: site.name,
            supervisorName: site.supervisorName,
            contactNumber: site.contactNumber,
            client: site.client,
          }
        : null,
      sites: allSites.map((s) => ({
        id: s.id,
        name: s.name,
        clientName: s.client?.companyName || '-',
        supervisorName: s.supervisorName || '-',
        contactNumber: s.contactNumber || '-',
        staffCount: s._count.employees,
      })),
      employees: employeesWithAttendance,
      summary: {
        totalEmployees: employeesWithAttendance.length,
        hkSupDays: Number(totalHkSupDays.toFixed(2)),
        hkDays: Number(totalHkDays.toFixed(2)),
        totalDays: Number((totalHkSupDays + totalHkDays).toFixed(2)),
      },
      records,
    };
  },
};
