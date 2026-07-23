import { DocumentStatus } from '@prisma/client';
import { z } from 'zod';

const itemSchema = z.object({
  serviceDetails: z.string().min(1),
  quantity: z.coerce.number().min(0),
  rate: z.coerce.number().min(0),
  mandays: z.coerce.number().min(0).optional().nullable(),
  actualMandays: z.coerce.number().min(0).optional().nullable(),
  /** Fixed amount (e.g. materials). Used when qty/rate are 0. */
  amount: z.coerce.number().min(0).optional(),
});

export const invoiceSchema = z.object({
  date: z.string().min(1),
  clientId: z.string().min(1),
  siteId: z.string().min(1),
  periodFrom: z.string().min(1),
  periodTo: z.string().min(1),
  status: z.nativeEnum(DocumentStatus).optional(),
  gstPercent: z.coerce.number().min(0).max(100).default(18),
  items: z.array(itemSchema).min(1),
});

export const invoiceQuerySchema = z.object({
  search: z.string().optional(),
  clientId: z.string().optional(),
  status: z.nativeEnum(DocumentStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
