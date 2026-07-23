import { z } from 'zod';

export const siteSchema = z.object({
  name: z.string().min(1).max(200),
  clientId: z.string().min(1),
  address: z.string().min(1),
  supervisorName: z.string().min(1).max(150),
  contactNumber: z.string().min(8).max(20),
});

export const siteQuerySchema = z.object({
  search: z.string().optional(),
  clientId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type SiteInput = z.infer<typeof siteSchema>;
