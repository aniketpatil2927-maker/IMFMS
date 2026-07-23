import { DocumentStatus } from '@prisma/client';
import { z } from 'zod';

const itemSchema = z.object({
  serviceDescription: z.string().min(1),
  numberOfEmployees: z.coerce.number().int().min(0),
  duty: z.string().optional().or(z.literal('')),
  rate: z.coerce.number().positive(),
});

export const quotationSchema = z.object({
  date: z.string().min(1),
  clientId: z.string().min(1),
  siteId: z.string().min(1),
  terms: z.string().optional().or(z.literal('')),
  status: z.nativeEnum(DocumentStatus).optional(),
  gstPercent: z.coerce.number().min(0).max(100).default(0),
  items: z.array(itemSchema).min(1),
});

export const quotationQuerySchema = z.object({
  search: z.string().optional(),
  clientId: z.string().optional(),
  status: z.nativeEnum(DocumentStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type QuotationInput = z.infer<typeof quotationSchema>;
