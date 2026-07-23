import type { AttendanceStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

export const attendanceRepository = {
  upsertMany(
    entries: Array<{
      employeeId: string;
      siteId: string;
      date: Date;
      status: AttendanceStatus;
    }>,
  ) {
    return prisma.$transaction(
      entries.map((entry) =>
        prisma.attendance.upsert({
          where: {
            employeeId_date: { employeeId: entry.employeeId, date: entry.date },
          },
          create: entry,
          update: { status: entry.status, siteId: entry.siteId },
        }),
      ),
    );
  },

  findBySiteAndDate(siteId: string, date: Date) {
    return prisma.attendance.findMany({
      where: { siteId, date },
      include: {
        employee: {
          select: { id: true, employeeCode: true, name: true, designation: true, isActive: true },
        },
      },
    });
  },

  findMonthly(params: {
    siteId?: string;
    year: number;
    month: number;
    employeeId?: string;
  }) {
    const start = new Date(Date.UTC(params.year, params.month - 1, 1));
    const end = new Date(Date.UTC(params.year, params.month, 0));

    const where: Prisma.AttendanceWhereInput = {
      date: { gte: start, lte: end },
      ...(params.siteId ? { siteId: params.siteId } : {}),
      ...(params.employeeId ? { employeeId: params.employeeId } : {}),
    };

    return prisma.attendance.findMany({
      where,
      include: {
        employee: { select: { id: true, employeeCode: true, name: true, designation: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { employee: { name: 'asc' } }],
    });
  },

  countToday(siteId?: string) {
    const today = new Date();
    const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    return prisma.attendance.count({
      where: {
        date,
        status: 'PRESENT',
        ...(siteId ? { siteId } : {}),
      },
    });
  },

  countDistinctEmployeesInMonth(siteId: string, year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));

    return prisma.attendance.findMany({
      where: {
        siteId,
        date: { gte: start, lte: end },
      },
      distinct: ['employeeId'],
      select: { employeeId: true },
    });
  },
};
