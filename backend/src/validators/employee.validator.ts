import { z } from 'zod';

export const employeeSchema = z.object({
  employeeCode: z.string().max(50).optional().or(z.literal('')),
  name: z.string().trim().min(1, 'Employee name is required').max(150),
  mobile: z
    .string()
    .trim()
    .min(1, 'Registered Mobile Number is required.')
    .max(20),
  aadhaar: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal('')),
  pan: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal('')),
  bankName: z.string().trim().max(100).optional().or(z.literal('')),
  accountNumber: z.string().trim().max(50).optional().or(z.literal('')),
  ifscCode: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal('')),
  branch: z.string().trim().max(100).optional().or(z.literal('')),
  designation: z.string().trim().min(1, 'Designation is required').max(100),
  salary: z.coerce.number().positive('Salary must be a positive number'),
  joiningDate: z.string().trim().min(1, 'Joining date is required'),
  siteId: z.string().trim().min(1, 'Site selection is required'),
});

export const transferSchema = z.object({
  siteId: z.string().min(1),
});

export const employeeQuerySchema = z.object({
  search: z.string().optional(),
  siteId: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(5000).default(10),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
