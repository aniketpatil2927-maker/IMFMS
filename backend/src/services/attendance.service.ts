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
    const records = await attendanceRepository.findMonthly(params);
    return { year: params.year, month: params.month, records };
  },
};
