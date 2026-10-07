import { z } from 'zod';

export const expenseCategoryEnum = z.enum(['MATERIAL', 'UNIFORM', 'ADVANCE', 'OTHER']);
export const expensePaymentModeEnum = z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE']);
export const expenseStatusEnum = z.enum(['PAID', 'PENDING', 'APPROVED']);

export const expenseCreateSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  category: expenseCategoryEnum,
  title: z.string().trim().min(1, 'Expense title or description is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  siteId: z.string().optional().nullable().or(z.literal('')),
  employeeId: z.string().optional().nullable().or(z.literal('')),
  paymentMode: expensePaymentModeEnum.default('CASH'),
  vendorName: z.string().optional().nullable().or(z.literal('')),
  referenceNumber: z.string().optional().nullable().or(z.literal('')),
  status: expenseStatusEnum.default('PAID'),
  notes: z.string().optional().nullable().or(z.literal('')),
});

export const expenseUpdateSchema = expenseCreateSchema.partial();

export const expenseQuerySchema = z.object({
  search: z.string().optional(),
  category: expenseCategoryEnum.optional(),
  siteId: z.string().optional(),
  employeeId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>;
