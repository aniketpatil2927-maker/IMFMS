import type { DocumentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

const quotationInclude = {
  client: { select: { id: true, companyName: true, address: true, gstNumber: true, contactPerson: true, mobile: true } },
  site: { select: { id: true, name: true, address: true } },
  items: true,
} satisfies Prisma.QuotationInclude;

export const quotationRepository = {
  create(data: Prisma.QuotationCreateInput) {
    return prisma.quotation.create({ data, include: quotationInclude });
  },

  update(id: string, data: Prisma.QuotationUpdateInput) {
    return prisma.quotation.update({ where: { id }, data, include: quotationInclude });
  },

  findById(id: string) {
    return prisma.quotation.findUnique({ where: { id }, include: quotationInclude });
  },

  async findMany(params: {
    search?: string;
    clientId?: string;
    status?: DocumentStatus | string;
    page: number;
    limit: number;
  }) {
    let statusFilter: Prisma.QuotationWhereInput['status'] | undefined;
    if (params.status) {
      if (params.status === 'PENDING') {
        statusFilter = { in: ['PENDING', 'DRAFT'] };
      } else if (params.status === 'FINALIZED') {
        statusFilter = 'FINALIZED';
      } else if (params.status === 'DRAFT') {
        statusFilter = 'DRAFT';
      }
    }

    const where: Prisma.QuotationWhereInput = {
      ...(params.clientId ? { clientId: params.clientId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(params.search
        ? {
            OR: [
              { quotationNumber: { contains: params.search } },
              { client: { companyName: { contains: params.search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          client: { select: { id: true, companyName: true } },
          site: { select: { id: true, name: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    return { items, total };
  },

  delete(id: string) {
    return prisma.quotation.delete({ where: { id } });
  },

  countPending() {
    return prisma.quotation.count({
      where: { status: { in: ['DRAFT', 'PENDING'] } },
    });
  },

  async getSummary(clientId?: string) {
    const where: Prisma.QuotationWhereInput = clientId ? { clientId } : {};
    const quotations = await prisma.quotation.findMany({
      where,
      select: {
        id: true,
        total: true,
        status: true,
      },
    });

    let totalAmount = 0;
    let totalCount = 0;
    let raisedAmount = 0;
    let raisedCount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;

    for (const q of quotations) {
      const amt = Number(q.total) || 0;
      totalAmount += amt;
      totalCount += 1;

      if (q.status === 'FINALIZED') {
        raisedAmount += amt;
        raisedCount += 1;
      } else {
        pendingAmount += amt;
        pendingCount += 1;
      }
    }

    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalCount,
      raisedAmount: Math.round(raisedAmount * 100) / 100,
      raisedCount,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      pendingCount,
    };
  },
};
