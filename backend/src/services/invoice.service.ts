import { DocumentStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { siteRepository } from '../repositories/site.repository.js';
import { clientRepository } from '../repositories/client.repository.js';
import { AppError } from '../utils/AppError.js';
import { calcGst, nextDocumentNumber, roundMoney } from '../utils/documentNumber.js';
import type { InvoiceInput } from '../validators/invoice.validator.js';

async function assertClientSite(clientId: string, siteId: string) {
  const client = await clientRepository.findById(clientId);
  if (!client) throw new AppError('Client not found', 404);
  const site = await siteRepository.findById(siteId);
  if (!site) throw new AppError('Site not found', 404);
  if (site.clientId !== clientId) {
    throw new AppError('Site does not belong to the selected client', 400);
  }
}

function lineAmount(item: InvoiceInput['items'][number], lineIndex: number) {
  const qty = Number(item.quantity ?? 1);
  const rate = Number(item.rate ?? 0);
  const mandays = item.mandays != null ? Number(item.mandays) : 0;
  const actual = item.actualMandays != null ? Number(item.actualMandays) : 0;

  // Fixed amount lines (materials / equipment) where qty and rate are 0
  if ((qty === 0 || rate === 0) && mandays === 0 && item.amount != null && item.amount > 0) {
    return roundMoney(Number(item.amount));
  }

  // Monthly manpower billing based on actual mandays
  if (mandays > 0 || actual > 0 || rate > 0) {
    if (rate <= 0) {
      throw new AppError(`Line ${lineIndex + 1}: Rate Per Month is required.`, 400);
    }
    if (mandays <= 0) {
      throw new AppError(`Line ${lineIndex + 1}: Total Mandays must be greater than 0.`, 400);
    }
    if (actual > mandays) {
      throw new AppError(`Line ${lineIndex + 1}: Actual Mandays cannot exceed Total Mandays.`, 400);
    }
    if (actual === 0) {
      return 0;
    }
    const singleAmount = (rate / mandays) * actual;
    const totalAmount = qty > 1 ? singleAmount * qty : singleAmount;
    return roundMoney(totalAmount);
  }

  return roundMoney(Number(item.amount ?? 0));
}

function buildTotals(items: InvoiceInput['items'], gstPercent: number) {
  const lineItems = items.map((item, idx) => {
    const amount = lineAmount(item, idx);
    return {
      serviceDetails: item.serviceDetails,
      quantity: item.quantity,
      rate: item.rate,
      mandays: item.mandays ?? null,
      actualMandays: item.actualMandays ?? null,
      amount,
    };
  });
  const subtotal = roundMoney(lineItems.reduce((sum, i) => sum + i.amount, 0));
  const { gstAmount, total } = calcGst(subtotal, gstPercent);
  return { lineItems, subtotal, gstAmount, total };
}

export const invoiceService = {
  async create(input: InvoiceInput) {
    await assertClientSite(input.clientId, input.siteId);
    const { lineItems, subtotal, gstAmount, total } = buildTotals(input.items, input.gstPercent);

    return prisma.$transaction(async (tx) => {
      const invoiceNumber = await nextDocumentNumber('INVOICE', tx);
      return tx.invoice.create({
        data: {
          invoiceNumber,
          date: new Date(input.date),
          clientId: input.clientId,
          siteId: input.siteId,
          periodFrom: new Date(input.periodFrom),
          periodTo: new Date(input.periodTo),
          status: input.status ?? DocumentStatus.DRAFT,
          subtotal,
          gstPercent: input.gstPercent,
          gstAmount,
          total,
          items: {
            create: lineItems.map((item) => ({
              serviceDetails: item.serviceDetails,
              quantity: item.quantity,
              rate: item.rate,
              mandays: item.mandays,
              actualMandays: item.actualMandays,
              amount: item.amount,
            })),
          },
        },
        include: { client: true, site: true, items: true, bills: true },
      });
    });
  },

  async update(id: string, input: InvoiceInput) {
    const existing = await invoiceRepository.findById(id);
    if (!existing) throw new AppError('Invoice not found', 404);
    if (existing.bills.length > 0) {
      throw new AppError('Cannot edit invoice that already has bills', 400);
    }
    await assertClientSite(input.clientId, input.siteId);

    const { lineItems, subtotal, gstAmount, total } = buildTotals(input.items, input.gstPercent);
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

    return prisma.invoice.update({
      where: { id },
      data: {
        date: new Date(input.date),
        clientId: input.clientId,
        siteId: input.siteId,
        periodFrom: new Date(input.periodFrom),
        periodTo: new Date(input.periodTo),
        status: input.status ?? existing.status,
        subtotal,
        gstPercent: input.gstPercent,
        gstAmount,
        total,
        items: {
          create: lineItems.map((item) => ({
            serviceDetails: item.serviceDetails,
            quantity: item.quantity,
            rate: item.rate,
            mandays: item.mandays,
            actualMandays: item.actualMandays,
            amount: item.amount,
          })),
        },
      },
      include: { client: true, site: true, items: true, bills: true },
    });
  },

  async getById(id: string) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new AppError('Invoice not found', 404);
    return invoice;
  },

  async list(params: {
    search?: string;
    clientId?: string;
    status?: DocumentStatus | string;
    page: number;
    limit: number;
  }) {
    const { items, total } = await invoiceRepository.findMany(params);
    return {
      items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit) || 1,
      },
    };
  },

  async summary(clientId?: string) {
    return invoiceRepository.getSummary(clientId);
  },

  async remove(id: string) {
    const existing = await invoiceRepository.findById(id);
    if (!existing) throw new AppError('Invoice not found', 404);
    if (existing.bills.length > 0) {
      throw new AppError('Cannot delete invoice that has bills', 400);
    }
    await invoiceRepository.delete(id);
    return { message: 'Invoice deleted' };
  },
};
