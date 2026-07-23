import { z } from 'zod';

export const employeeSchema = z.object({
  employeeCode: z.string().min(1).max(50),
  name: z.string().min(1).max(150),
  mobile: z.string().min(8).max(20),
  aadhaar: z.string().max(20).optional().or(z.literal('')),
  designation: z.string().min(1).max(100),
  salary: z.coerce.number().positive(),
  joiningDate: z.string().min(1),
  siteId: z.string().min(1),
});

export const transferSchema = z.object({
  siteId: z.string().min(1),
});

export const employeeQuerySchema = z.object({
  search: z.string().optional(),
  siteId: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
