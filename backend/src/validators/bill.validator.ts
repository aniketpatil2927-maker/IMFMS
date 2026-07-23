import { z } from 'zod';

export const billGenerateSchema = z.object({
  invoiceId: z.string().min(1),
  attendanceYear: z.coerce.number().int().min(2000),
  attendanceMonth: z.coerce.number().int().min(1).max(12),
  gstPercent: z.coerce.number().min(0).max(100).optional(),
});

export const billQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type BillGenerateInput = z.infer<typeof billGenerateSchema>;
