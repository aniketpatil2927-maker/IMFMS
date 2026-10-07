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
    status?: DocumentStatus | string;
    page: number;
    limit: number;
  }) {
    let statusFilter: Prisma.InvoiceWhereInput['status'] | undefined;
    if (params.status) {
      if (params.status === 'PENDING') {
        statusFilter = { in: ['PENDING', 'DRAFT'] };
      } else if (params.status === 'FINALIZED') {
        statusFilter = 'FINALIZED';
      } else if (params.status === 'DRAFT') {
        statusFilter = 'DRAFT';
      }
    }

    const where: Prisma.InvoiceWhereInput = {
      ...(params.clientId ? { clientId: params.clientId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
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

  async getSummary(clientId?: string) {
    const where: Prisma.InvoiceWhereInput = clientId ? { clientId } : {};
    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        id: true,
        total: true,
        status: true,
      },
    });

    let totalAmount = 0;
    let totalCount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;
    let receivedAmount = 0;
    let receivedCount = 0;

    for (const inv of invoices) {
      const amt = Number(inv.total) || 0;
      totalAmount += amt;
      totalCount += 1;

      if (inv.status === 'FINALIZED') {
        receivedAmount += amt;
        receivedCount += 1;
      } else {
        pendingAmount += amt;
        pendingCount += 1;
      }
    }

    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalCount,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      pendingCount,
      receivedAmount: Math.round(receivedAmount * 100) / 100,
      receivedCount,
    };
  },
};
