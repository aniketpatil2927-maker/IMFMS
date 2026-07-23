import { AttendanceStatus } from '@prisma/client';
import { z } from 'zod';

export const attendanceEntrySchema = z.object({
  employeeId: z.string().min(1),
  status: z.nativeEnum(AttendanceStatus),
});

export const dailyAttendanceSchema = z.object({
  siteId: z.string().min(1),
  date: z.string().min(1),
  entries: z.array(attendanceEntrySchema).min(1),
});

export const attendanceQuerySchema = z.object({
  siteId: z.string().optional(),
  date: z.string().optional(),
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  employeeId: z.string().optional(),
});

export type DailyAttendanceInput = z.infer<typeof dailyAttendanceSchema>;
