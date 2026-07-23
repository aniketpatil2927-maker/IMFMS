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

function lineAmount(item: InvoiceInput['items'][number]) {
  const qty = item.quantity;
  const rate = item.rate;
  const mandays = Number(item.mandays ?? 0);
  const actual = Number(item.actualMandays ?? 0);

  // Fixed amount lines (materials / equipment)
  if ((qty === 0 || rate === 0) && item.amount != null && item.amount > 0) {
    return roundMoney(item.amount);
  }

  // Pro-rata on actual mandays: Qty × Rate × (Actual / Mandays)
  if (qty > 0 && rate > 0 && mandays > 0 && actual > 0) {
    return roundMoney(qty * rate * (actual / mandays));
  }

  if (qty > 0 && rate > 0) {
    return roundMoney(qty * rate);
  }

  return roundMoney(item.amount ?? 0);
}

function buildTotals(items: InvoiceInput['items'], gstPercent: number) {
  const lineItems = items.map((item) => {
    const amount = lineAmount(item);
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
    status?: DocumentStatus;
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
