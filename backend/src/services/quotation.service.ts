import { DocumentStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { quotationRepository } from '../repositories/quotation.repository.js';
import { siteRepository } from '../repositories/site.repository.js';
import { clientRepository } from '../repositories/client.repository.js';
import { AppError } from '../utils/AppError.js';
import { calcGst, nextDocumentNumber, roundMoney } from '../utils/documentNumber.js';
import type { QuotationInput } from '../validators/quotation.validator.js';

async function assertClientSite(clientId: string, siteId: string) {
  const client = await clientRepository.findById(clientId);
  if (!client) throw new AppError('Client not found', 404);
  const site = await siteRepository.findById(siteId);
  if (!site) throw new AppError('Site not found', 404);
  if (site.clientId !== clientId) {
    throw new AppError('Site does not belong to the selected client', 400);
  }
}

function buildTotals(items: QuotationInput['items'], gstPercent: number) {
  const lineItems = items.map((item) => {
    const qty = item.numberOfEmployees;
    const amount = roundMoney(qty > 0 ? qty * item.rate : item.rate);
    return {
      ...item,
      duty: item.duty?.trim() || (qty > 0 ? '8 Hrs' : '-'),
      amount,
    };
  });
  const subtotal = roundMoney(lineItems.reduce((sum, i) => sum + i.amount, 0));
  const { gstAmount, total } = calcGst(subtotal, gstPercent);
  return { lineItems, subtotal, gstAmount, total };
}

export const quotationService = {
  async create(input: QuotationInput) {
    await assertClientSite(input.clientId, input.siteId);
    const { lineItems, subtotal, gstAmount, total } = buildTotals(input.items, input.gstPercent);

    return prisma.$transaction(async (tx) => {
      const quotationNumber = await nextDocumentNumber('QUOTATION', tx);
      return tx.quotation.create({
        data: {
          quotationNumber,
          date: new Date(input.date),
          clientId: input.clientId,
          siteId: input.siteId,
          terms: input.terms || null,
          status: input.status ?? DocumentStatus.DRAFT,
          subtotal,
          gstPercent: input.gstPercent,
          gstAmount,
          total,
          items: {
            create: lineItems.map((item) => ({
              serviceDescription: item.serviceDescription,
              numberOfEmployees: item.numberOfEmployees,
              duty: item.duty,
              rate: item.rate,
              amount: item.amount,
            })),
          },
        },
        include: {
          client: true,
          site: true,
          items: true,
        },
      });
    });
  },

  async update(id: string, input: QuotationInput) {
    const existing = await quotationRepository.findById(id);
    if (!existing) throw new AppError('Quotation not found', 404);
    await assertClientSite(input.clientId, input.siteId);

    const { lineItems, subtotal, gstAmount, total } = buildTotals(input.items, input.gstPercent);

    await prisma.quotationItem.deleteMany({ where: { quotationId: id } });

    return prisma.quotation.update({
      where: { id },
      data: {
        date: new Date(input.date),
        clientId: input.clientId,
        siteId: input.siteId,
        terms: input.terms || null,
        status: input.status ?? existing.status,
        subtotal,
        gstPercent: input.gstPercent,
        gstAmount,
        total,
        items: {
          create: lineItems.map((item) => ({
            serviceDescription: item.serviceDescription,
            numberOfEmployees: item.numberOfEmployees,
            duty: item.duty,
            rate: item.rate,
            amount: item.amount,
          })),
        },
      },
      include: { client: true, site: true, items: true },
    });
  },

  async getById(id: string) {
    const quotation = await quotationRepository.findById(id);
    if (!quotation) throw new AppError('Quotation not found', 404);
    return quotation;
  },

  async list(params: {
    search?: string;
    clientId?: string;
    status?: DocumentStatus;
    page: number;
    limit: number;
  }) {
    const { items, total } = await quotationRepository.findMany(params);
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

  async duplicate(id: string) {
    const existing = await this.getById(id);
    return this.create({
      date: new Date().toISOString().slice(0, 10),
      clientId: existing.clientId,
      siteId: existing.siteId,
      terms: existing.terms ?? '',
      status: DocumentStatus.DRAFT,
      gstPercent: Number(existing.gstPercent),
      items: existing.items.map((item) => ({
        serviceDescription: item.serviceDescription,
        numberOfEmployees: item.numberOfEmployees,
        duty: item.duty ?? '',
        rate: Number(item.rate),
      })),
    });
  },

  async remove(id: string) {
    const existing = await quotationRepository.findById(id);
    if (!existing) throw new AppError('Quotation not found', 404);
    await quotationRepository.delete(id);
    return { message: 'Quotation deleted' };
  },
};
