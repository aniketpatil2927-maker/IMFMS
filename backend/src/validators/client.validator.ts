import { z } from 'zod';

export const clientSchema = z.object({
  companyName: z.string().trim().min(1, 'Client Name is required').max(200),
  contactPerson: z.string().max(150).optional().default(''),
  mobile: z
    .string()
    .trim()
    .min(1, 'Mobile Number is required')
    .regex(/^[0-9+\s-]{10,15}$/, 'Please enter a valid mobile number')
    .max(20),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  gstNumber: z.string().max(20).optional().or(z.literal('')),
  address: z.string().trim().min(1, 'Address is required'),
});

export const clientQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ClientInput = z.infer<typeof clientSchema>;
