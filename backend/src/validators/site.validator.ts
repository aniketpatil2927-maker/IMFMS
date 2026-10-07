import { z } from 'zod';

export const siteSchema = z.object({
  name: z.string().trim().min(1, 'Site name is required').max(200),
  clientId: z.string().trim().min(1, 'Client selection is required'),
  address: z.string().trim().min(1, 'Address is required'),
  supervisorName: z.string().max(150).optional().default(''),
  contactNumber: z.string().max(20).optional().default(''),
});

export const siteQuerySchema = z.object({
  search: z.string().optional(),
  clientId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type SiteInput = z.infer<typeof siteSchema>;
