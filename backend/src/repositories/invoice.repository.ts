import type { DocumentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

const invoiceInclude = {
  client: { select: { id: true, companyName: true, address: true, gstNumber: true, contactPerson: true, mobile: true } },
  site: { select: { id: true, name: true, address: true } },
  items: true,
  bills: { select: { id: true, billNumber: true } },
} satisfies Prisma.InvoiceInclude;

export const invoiceRepository = {
  create(data: Prisma.InvoiceCreateInput) {
    return prisma.invoice.create({ data, include: invoiceInclude });
  },

  update(id: string, data: Prisma.InvoiceUpdateInput) {
    return prisma.invoice.update({ where: { id }, data, include: invoiceInclude });
  },

  findById(id: string) {
    return prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
  },

  async findMany(params: {
    search?: string;
    clientId?: string;
    status?: DocumentStatus;
    page: number;
    limit: number;
  }) {
    const where: Prisma.InvoiceWhereInput = {
      ...(params.clientId ? { clientId: params.clientId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { invoiceNumber: { contains: params.search } },
              { client: { companyName: { contains: params.search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          client: { select: { id: true, companyName: true } },
          site: { select: { id: true, name: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return { items, total };
  },

  delete(id: string) {
    return prisma.invoice.delete({ where: { id } });
  },

  countPending() {
    return prisma.invoice.count({
      where: { status: { in: ['DRAFT', 'PENDING'] } },
    });
  },
};
