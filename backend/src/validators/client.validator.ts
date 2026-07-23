import { z } from 'zod';

export const clientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  contactPerson: z.string().min(1, 'Contact person is required').max(150),
  mobile: z.string().min(8).max(20),
  email: z.string().email().optional().or(z.literal('')),
  gstNumber: z.string().max(20).optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
});

export const clientQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ClientInput = z.infer<typeof clientSchema>;
